import { NextRequest, NextResponse } from 'next/server'
import { load } from 'cheerio'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { chunkText, ingestChunks, markDocumentError } from '@/lib/knowledge/pipeline'

export async function POST(req: NextRequest) {
  try {
    const { url, tenant_id } = await req.json() as { url?: string; tenant_id?: string }

    if (!url || !tenant_id) {
      return NextResponse.json({ error: 'url y tenant_id son requeridos' }, { status: 400 })
    }

    // Validar que sea una URL válida
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'URL no válida' }, { status: 400 })
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Solo se permiten URLs http/https' }, { status: 400 })
    }

    // Crear documento
    const db = getSupabaseAdmin()
    const { data: doc, error: docErr } = await db
      .from('knowledge_base_documents')
      .insert({
        tenant_id:   tenant_id,
        title:       parsedUrl.hostname + parsedUrl.pathname,
        source_type: 'url',
        source_url:  url,
        status:      'processing',
      })
      .select('id')
      .single()

    if (docErr || !doc) {
      return NextResponse.json({ error: 'Error al crear documento' }, { status: 500 })
    }

    // Fetch y extracción en background
    ;(async () => {
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Cricket-Bot/1.0' },
          signal: AbortSignal.timeout(15000),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const html = await response.text()
        const $    = load(html)

        // Eliminar scripts, styles, nav y footer
        $('script, style, nav, footer, header, aside, [role="navigation"]').remove()

        const title = $('title').text().trim() || $('h1').first().text().trim() || parsedUrl.hostname
        const text  = $('body').text().replace(/\s+/g, ' ').trim()

        if (!text) throw new Error('No se pudo extraer texto de la URL')

        // Actualizar título con el real de la página
        await db.from('knowledge_base_documents').update({ title }).eq('id', doc.id)

        const chunks = chunkText(text)
        await ingestChunks(doc.id, tenant_id, chunks)

      } catch (err) {
        await markDocumentError(doc.id, String(err))
      }
    })()

    return NextResponse.json({ id: doc.id }, { status: 202 })

  } catch (err) {
    console.error('[knowledge/url]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
