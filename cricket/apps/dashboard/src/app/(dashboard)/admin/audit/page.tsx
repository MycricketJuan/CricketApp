export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'

export default async function AdminAuditPage() {
  const headersList = await headers()
  const tenantSlug  = headersList.get('x-tenant-slug') ?? ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any     = getSupabaseAdmin()

  const { data: tenant } = await db
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .single() as { data: { id: string; name: string } | null }

  if (!tenant) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">Tenant no encontrado: {tenantSlug}</p>
      </div>
    )
  }

  const { data: logs } = await db
    .from('audit_log')
    .select('id, created_at, actor_type, actor_id, action, entity_type, entity_id, summary')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(100) as {
      data: Array<{
        id: string
        created_at: string
        actor_type: string
        actor_id: string | null
        action: string
        entity_type: string | null
        entity_id: string | null
        summary: string | null
      }> | null
    }

  const ACTOR_COLORS: Record<string, string> = {
    AI:     'bg-purple-100 text-purple-700',
    HUMAN:  'bg-blue-100 text-blue-700',
    SYSTEM: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Log de auditoría</h1>
        <p className="text-sm text-gray-500">{tenant.name} · últimas 100 entradas</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              {['Fecha', 'Actor', 'Acción', 'Entidad', 'Resumen'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  Sin registros de auditoría
                </td>
              </tr>
            )}
            {(logs ?? []).map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ACTOR_COLORS[l.actor_type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {l.actor_type}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{l.action}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {l.entity_type && <span>{l.entity_type}</span>}
                  {l.entity_id && <span className="text-gray-300 ml-1 font-mono">{l.entity_id.slice(0, 8)}…</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{l.summary ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
