import { NextRequest, NextResponse } from 'next/server'
import { getKBAdmin } from '@/lib/knowledge/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const documentId = searchParams.get('document_id')
    const tenantId   = searchParams.get('tenant_id')

    if (!documentId || !tenantId) {
      return NextResponse.json({ error: 'document_id y tenant_id requeridos' }, { status: 400 })
    }

    const db = getKBAdmin()

    const [docResult, countResult] = await Promise.all([
      db
        .from('knowledge_base_documents')
        .select('status, chunk_count, created_at')
        .eq('id', documentId)
        .eq('tenant_id', tenantId)
        .single(),
      db
        .from('knowledge_base_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId)
        .eq('tenant_id', tenantId),
    ])

    if (docResult.error || !docResult.data) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    const doc = docResult.data as { status: string; chunk_count: number; created_at: string }

    return NextResponse.json({
      status:     doc.status,
      processed:  countResult.count ?? 0,
      total:      doc.chunk_count ?? 0,
      started_at: doc.created_at,
    })

  } catch (err) {
    console.error('[knowledge/progress GET]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
