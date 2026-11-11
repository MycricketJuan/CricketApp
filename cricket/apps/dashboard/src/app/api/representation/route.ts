import { NextRequest, NextResponse } from 'next/server'
import { findRepresentation, loadRepresentationState, loadThread } from '@/lib/representation/db'
import { resolveTenantContext } from '@/lib/representation/tenant'

export const dynamic = 'force-dynamic'

// GET /api/representation
// Hidrata la representación activa del tenant/usuario (sin crearla) y devuelve
// su estado + hilo para pintar al cargar. Si no existe aún, devuelve state:null.
export async function GET(req: NextRequest) {
  try {
    const ctx = await resolveTenantContext(req)
    if (!ctx) return NextResponse.json({ error: 'Tenant no resuelto' }, { status: 400 })

    const repId = await findRepresentation(ctx.tenantId, ctx.createdBy)
    if (!repId) return NextResponse.json({ state: null, thread: [] })

    const [state, thread] = await Promise.all([
      loadRepresentationState(repId),
      loadThread(repId),
    ])
    return NextResponse.json({ state, thread })
  } catch (err) {
    console.error('[representation] GET', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
