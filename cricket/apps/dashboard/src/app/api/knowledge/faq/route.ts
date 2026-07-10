import { NextRequest, NextResponse } from 'next/server'
import { getKBAdmin } from '@/lib/knowledge/db'
import { generateEmbedding } from '@/lib/knowledge/pipeline'

const FAQ_CONTENT_RE = /^P: ([\s\S]*?)\nR: ([\s\S]*)$/

export async function GET(req: NextRequest) {
  try {
    const id       = req.nextUrl.searchParams.get('id')
    const tenantId = req.nextUrl.searchParams.get('tenant_id')

    if (!id || !tenantId) {
      return NextResponse.json({ error: 'id y tenant_id requeridos' }, { status: 400 })
    }

    const db = getKBAdmin()

    const { data: doc } = await db
      .from('knowledge_base_documents')
      .select('id, title')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('source_type', 'faq')
      .single()

    if (!doc) {
      return NextResponse.json({ error: 'FAQ no encontrada' }, { status: 404 })
    }

    const { data: chunk } = await db
      .from('knowledge_base_chunks')
      .select('content')
      .eq('document_id', id)
      .eq('tenant_id', tenantId)
      .eq('chunk_index', 0)
      .single()

    const match = chunk?.content ? FAQ_CONTENT_RE.exec(chunk.content) : null

    return NextResponse.json({
      id: doc.id,
      question: match ? match[1] : doc.title,
      answer:   match ? match[2] : '',
    })

  } catch (err) {
    console.error('[knowledge/faq GET]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, tenant_id, question, answer } =
      await req.json() as { id?: string; tenant_id?: string; question?: string; answer?: string }

    if (!id || !tenant_id || !question || !answer) {
      return NextResponse.json(
        { error: 'id, tenant_id, question y answer son requeridos' },
        { status: 400 }
      )
    }

    const db = getKBAdmin()

    const { data: doc } = await db
      .from('knowledge_base_documents')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .eq('source_type', 'faq')
      .single()

    if (!doc) {
      return NextResponse.json({ error: 'FAQ no encontrada' }, { status: 404 })
    }

    const content = `P: ${question.trim()}\nR: ${answer.trim()}`

    await db
      .from('knowledge_base_documents')
      .update({ title: question.slice(0, 100), status: 'processing' })
      .eq('id', id)
      .eq('tenant_id', tenant_id)

    // Regeneramos el embedding en background, mismo estilo que el POST
    ;(async () => {
      try {
        const embedding = await generateEmbedding(content)
        await db
          .from('knowledge_base_chunks')
          .update({ content, embedding: JSON.stringify(embedding) })
          .eq('document_id', id)
          .eq('tenant_id', tenant_id)
          .eq('chunk_index', 0)
        await db
          .from('knowledge_base_documents')
          .update({ status: 'ready' })
          .eq('id', id)
          .eq('tenant_id', tenant_id)
      } catch (err) {
        await db
          .from('knowledge_base_documents')
          .update({ status: 'error', error_msg: String(err) })
          .eq('id', id)
          .eq('tenant_id', tenant_id)
      }
    })()

    return NextResponse.json({ id }, { status: 202 })

  } catch (err) {
    console.error('[knowledge/faq PATCH]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { question, answer, tenant_id } =
      await req.json() as { question?: string; answer?: string; tenant_id?: string }

    if (!question || !answer || !tenant_id) {
      return NextResponse.json(
        { error: 'question, answer y tenant_id son requeridos' },
        { status: 400 }
      )
    }

    const content = `P: ${question.trim()}\nR: ${answer.trim()}`
    const db      = getKBAdmin()

    const { data: doc, error: docErr } = await db
      .from('knowledge_base_documents')
      .insert({
        tenant_id,
        title:       question.slice(0, 100),
        source_type: 'faq',
        status:      'processing',
      })
      .select('id')
      .single()

    if (docErr || !doc) {
      return NextResponse.json({ error: 'Error al crear FAQ' }, { status: 500 })
    }

    // FAQ es un solo chunk — generamos embedding directamente
    ;(async () => {
      try {
        const embedding = await generateEmbedding(content)
        await db.from('knowledge_base_chunks').insert({
          document_id: doc.id,
          tenant_id,
          content,
          embedding:   JSON.stringify(embedding),
          chunk_index: 0,
        })
        await db
          .from('knowledge_base_documents')
          .update({ status: 'ready', chunk_count: 1 })
          .eq('id', doc.id)
      } catch (err) {
        await db
          .from('knowledge_base_documents')
          .update({ status: 'error', error_msg: String(err) })
          .eq('id', doc.id)
      }
    })()

    return NextResponse.json({ id: doc.id }, { status: 202 })

  } catch (err) {
    console.error('[knowledge/faq]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
