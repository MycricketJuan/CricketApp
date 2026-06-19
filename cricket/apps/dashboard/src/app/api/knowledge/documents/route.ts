import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get('tenant_id')
    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id requerido' }, { status: 400 })
    }

    const db = getSupabaseAdmin()
    const { data, error } = await db
      .from('knowledge_base_documents')
      .select('id, title, source_type, source_url, file_name, status, chunk_count, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)

  } catch (err) {
    console.error('[knowledge/documents GET]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id, tenant_id } = await req.json() as { id?: string; tenant_id?: string }
    if (!id || !tenant_id) {
      return NextResponse.json({ error: 'id y tenant_id requeridos' }, { status: 400 })
    }

    const db = getSupabaseAdmin()
    const { error } = await db
      .from('knowledge_base_documents')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant_id)   // doble validación de tenant

    if (error) throw error
    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[knowledge/documents DELETE]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
