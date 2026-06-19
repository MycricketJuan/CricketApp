import { NextRequest, NextResponse } from 'next/server'
import { getKBAdmin } from '@/lib/knowledge/db'
import { generateEmbedding } from '@/lib/knowledge/pipeline'

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
