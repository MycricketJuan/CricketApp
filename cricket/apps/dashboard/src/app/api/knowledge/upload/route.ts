import { NextRequest, NextResponse } from 'next/server'
import { getKBAdmin } from '@/lib/knowledge/db'
import { chunkText, ingestChunks, markDocumentError } from '@/lib/knowledge/pipeline'

export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData()
    const file      = formData.get('file') as File | null
    const tenantId  = formData.get('tenant_id') as string | null

    if (!file || !tenantId) {
      return NextResponse.json({ error: 'file y tenant_id son requeridos' }, { status: 400 })
    }

    const allowedTypes = ['application/pdf', 'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no soportado. Use PDF, DOCX o TXT.' }, { status: 400 })
    }

    // Crear registro del documento en estado 'processing'
    const db = getKBAdmin()
    const { data: doc, error: docErr } = await db
      .from('knowledge_base_documents')
      .insert({
        tenant_id:   tenantId,
        title:       file.name.replace(/\.[^.]+$/, ''),
        source_type: 'file',
        file_name:   file.name,
        status:      'processing',
      })
      .select('id')
      .single()

    if (docErr || !doc) {
      return NextResponse.json({ error: 'Error al crear documento' }, { status: 500 })
    }

    // Extraer texto según tipo
    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''

    if (file.type === 'text/plain') {
      text = buffer.toString('utf-8')
    } else if (file.type === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default
      const parsed   = await pdfParse(buffer)
      text = parsed.text
    } else {
      // DOCX
      const mammoth = await import('mammoth')
      const result  = await mammoth.extractRawText({ buffer })
      text = result.value
    }

    text = text.trim()
    if (!text) {
      await markDocumentError(doc.id, 'El archivo no contiene texto extraíble')
      return NextResponse.json({ error: 'El archivo no contiene texto extraíble' }, { status: 422 })
    }

    // Procesar en background (fire-and-forget) para responder rápido
    const chunks = chunkText(text)
    ingestChunks(doc.id, tenantId, chunks).catch(err =>
      markDocumentError(doc.id, String(err))
    )

    return NextResponse.json({ id: doc.id, chunk_count: chunks.length }, { status: 202 })

  } catch (err) {
    console.error('[knowledge/upload]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
