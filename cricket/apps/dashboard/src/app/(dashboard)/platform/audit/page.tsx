import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import type { Database } from '@cricket/core/types'

type AuditRow  = Database['public']['Tables']['audit_log']['Row']
type TenantRow = Database['public']['Tables']['tenants']['Row']

const ACTOR_COLORS: Record<string, string> = {
  AI:     'bg-blue-100 text-blue-700',
  HUMAN:  'bg-green-100 text-green-700',
  SYSTEM: 'bg-gray-100 text-gray-600',
}

const EVENT_COLORS: Record<string, string> = {
  'tenant.created':              'text-indigo-600',
  'invitation.sent':             'text-purple-600',
  'session.created':             'text-blue-600',
  'session.status_changed':      'text-blue-500',
  'session.control_transferred': 'text-orange-600',
  'checkpoint.resolved':         'text-green-600',
  'escalation.created':          'text-red-600',
  'escalation.resolved':         'text-green-500',
}

export default async function AuditPage() {
  const db = getSupabaseAdmin()

  const [{ data: logs }, { data: tenants }] = await Promise.all([
    db.from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200) as Promise<{ data: AuditRow[] | null }>,
    db.from('tenants')
      .select('id, name') as Promise<{ data: Pick<TenantRow, 'id' | 'name'>[] | null }>,
  ])

  const tenantMap = (tenants ?? []).reduce<Record<string, string>>(
    (acc, t) => { acc[t.id] = t.name; return acc }, {},
  )

  const rows = logs ?? []

  // Conteos por tipo de evento (top 5)
  const eventCounts = rows.reduce<Record<string, number>>(
    (acc, r) => { acc[r.event_type] = (acc[r.event_type] ?? 0) + 1; return acc }, {},
  )
  const topEvents = Object.entries(eventCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Auditoría</h1>
        <p className="text-sm text-gray-500">
          Registro inmutable de eventos · últimas {rows.length} entradas
        </p>
      </div>

      {/* Top eventos */}
      {topEvents.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-3">Eventos más frecuentes</p>
          <div className="space-y-2">
            {topEvents.map(([event, count]) => {
              const pct = Math.round((count / rows.length) * 100)
              return (
                <div key={event}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-mono ${EVENT_COLORS[event] ?? 'text-gray-600'}`}>{event}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gray-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabla de eventos */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              {['Fecha', 'Tenant', 'Actor', 'Evento', 'Detalle'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                  Sin eventos registrados
                </td>
              </tr>
            ) : rows.map((r) => {
              const payload = (r.payload ?? {}) as Record<string, unknown>
              const detail  = Object.entries(payload)
                .slice(0, 2)
                .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                .join(' · ')

              return (
                <tr key={r.id} className="hover:bg-gray-50 align-top">
                  <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString('es', {
                      day: '2-digit', month: 'short',
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">
                    {r.tenant_id ? (tenantMap[r.tenant_id] ?? r.tenant_id.slice(0, 8)) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ACTOR_COLORS[r.actor_type] ?? 'bg-gray-100 text-gray-500'}`}>
                      {r.actor_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`font-mono text-xs ${EVENT_COLORS[r.event_type] ?? 'text-gray-600'}`}>
                      {r.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-400 max-w-xs truncate">
                    {detail || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
