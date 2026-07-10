import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { getKBAdmin } from '@/lib/knowledge/db'
import { generateEmbeddingsBatch } from '@/lib/knowledge/pipeline'

interface ClaudeConfig { model: string; max_tokens: number }

const DEFAULT_MODEL       = 'claude-sonnet-4-20250514'
const GENERATION_MAX_TOKENS = 4096
const MAX_URL_DOCS        = 20
const MAX_CHUNKS_PER_DOC  = 6
const MAX_TOTAL_CHARS     = 60_000
const MAX_FAQS_INSERTED   = 15

interface GeneratedFaq {
  question: string
  answer: string
  source_url?: string
}

interface UrlDoc {
  id: string
  title: string
  source_url: string | null
}

export async function POST(req: NextRequest) {
  try {
    const { tenant_id } = await req.json() as { tenant_id?: string }

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id requerido' }, { status: 400 })
    }

    const adminDb = getSupabaseAdmin()
    const { data: tenant } = await adminDb
      .from('tenants')
      .select('claude_config')
      .eq('id', tenant_id)
      .single()

    const claudeConfig = tenant?.claude_config as unknown as ClaudeConfig | null
    const model = claudeConfig?.model ?? DEFAULT_MODEL

    const db = getKBAdmin()

    const { data: urlDocs } = await db
      .from('knowledge_base_documents')
      .select('id, title, source_url')
      .eq('tenant_id', tenant_id)
      .eq('source_type', 'url')
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(MAX_URL_DOCS)

    const docs = (urlDocs ?? []) as UrlDoc[]

    if (docs.length === 0) {
      return NextResponse.json(
        { error: 'No hay URLs listas para generar FAQs. Importa una URL en la pestaña URLs y espera a que termine de procesarse.' },
        { status: 400 }
      )
    }

    const docIds = docs.map(d => d.id)
    const { data: chunkRows } = await db
      .from('knowledge_base_chunks')
      .select('document_id, content, chunk_index')
      .in('document_id', docIds)
      .eq('tenant_id', tenant_id)
      .order('chunk_index')

    const chunksByDoc = new Map<string, string[]>()
    for (const row of (chunkRows ?? []) as { document_id: string; content: string }[]) {
      const list = chunksByDoc.get(row.document_id) ?? []
      if (list.length < MAX_CHUNKS_PER_DOC) list.push(row.content)
      chunksByDoc.set(row.document_id, list)
    }

    let totalChars = 0
    const sections: string[] = []
    for (const doc of docs) {
      const chunks = chunksByDoc.get(doc.id)
      if (!chunks || chunks.length === 0) continue
      const section = `### Fuente: ${doc.title} (${doc.source_url ?? 'sin URL'})\n${chunks.join('\n\n')}`
      if (totalChars + section.length > MAX_TOTAL_CHARS) break
      sections.push(section)
      totalChars += section.length
    }

    if (sections.length === 0) {
      return NextResponse.json(
        { error: 'Las URLs indexadas no tienen contenido suficiente para generar FAQs.' },
        { status: 400 }
      )
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const systemPrompt = `Eres el agente de IA que atiende directamente a los clientes finales de este negocio.
A partir del contenido de las páginas de su sitio web que se te proporciona, genera una lista de entre 5 y 15 preguntas frecuentes (FAQ) que un cliente final podría hacer.

Reglas estrictas:
- Cada respuesta debe estar redactada exactamente como TÚ (el agente de soporte con IA) le responderías directamente al cliente: en primera persona, tono cordial y profesional, breve y accionable.
- Nunca uses frases como "según el documento", "la página indica" o "el contenido menciona" — respóndele al cliente directamente.
- Básate ÚNICAMENTE en la información provista. Nunca inventes precios, políticas, plazos o datos que no estén explícitos en el contenido.
- Si el contenido no alcanza para responder una pregunta con seguridad, no la incluyas.
- No generes preguntas redundantes entre sí.
- Responde en el mismo idioma del contenido fuente.
- Para cada FAQ, indica en "source_url" la URL de la fuente de la que se derivó (una de las proporcionadas).`

    const response = await anthropic.messages.create({
      model,
      max_tokens: GENERATION_MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: sections.join('\n\n---\n\n') }],
      tools: [{
        name: 'submit_faqs',
        description: 'Envía la lista de FAQs generadas a partir del contenido proporcionado.',
        input_schema: {
          type: 'object',
          properties: {
            faqs: {
              type: 'array',
              minItems: 1,
              maxItems: 15,
              items: {
                type: 'object',
                properties: {
                  question:   { type: 'string', description: 'Pregunta en una sola línea, como la haría un cliente final.' },
                  answer:     { type: 'string', description: 'Respuesta en primera persona, tal como la daría el agente de soporte con IA.' },
                  source_url: { type: 'string', description: 'URL fuente de la que se derivó esta FAQ.' },
                },
                required: ['question', 'answer'],
              },
            },
          },
          required: ['faqs'],
        },
      }],
      tool_choice: { type: 'tool', name: 'submit_faqs' },
    })

    const toolUse = response.content.find(b => b.type === 'tool_use') as
      { input?: unknown } | undefined
    const faqs = (toolUse?.input as { faqs?: GeneratedFaq[] } | undefined)?.faqs ?? []

    if (faqs.length === 0) {
      return NextResponse.json(
        { error: 'No se pudieron generar FAQs a partir del contenido disponible.' },
        { status: 500 }
      )
    }

    const capped = faqs.slice(0, MAX_FAQS_INSERTED)

    const { data: insertedDocs, error: insertErr } = await db
      .from('knowledge_base_documents')
      .insert(capped.map(faq => ({
        tenant_id,
        title:       faq.question.slice(0, 100),
        source_type: 'faq',
        source_url:  faq.source_url || null,
        status:      'processing',
      })))
      .select('id')

    if (insertErr || !insertedDocs) {
      return NextResponse.json({ error: 'Error al guardar las FAQs generadas' }, { status: 500 })
    }

    const contents = capped.map(faq => `P: ${faq.question.trim()}\nR: ${faq.answer.trim()}`)

    try {
      const embeddings = await generateEmbeddingsBatch(contents)

      const chunkRows = insertedDocs.map((doc, i) => ({
        document_id: doc.id,
        tenant_id,
        content:     contents[i],
        embedding:   JSON.stringify(embeddings[i]),
        chunk_index: 0,
      }))

      await db.from('knowledge_base_chunks').insert(chunkRows)
      await db
        .from('knowledge_base_documents')
        .update({ status: 'ready', chunk_count: 1 })
        .in('id', insertedDocs.map(d => d.id))

    } catch (err) {
      await db
        .from('knowledge_base_documents')
        .update({ status: 'error', error_msg: String(err) })
        .in('id', insertedDocs.map(d => d.id))

      return NextResponse.json(
        { error: 'Error al generar los embeddings de las FAQs generadas.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      inserted: insertedDocs.length,
      faqs: insertedDocs.map((doc, i) => ({ id: doc.id, question: capped[i].question })),
    })

  } catch (err) {
    console.error('[knowledge/faq/generate]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
