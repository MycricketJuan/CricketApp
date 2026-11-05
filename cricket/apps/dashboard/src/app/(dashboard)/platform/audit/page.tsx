import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import type { Database } from '@cricket/core/types'

type AuditRow  = Database['public']['Tables']['audit_log']['Row']
type TenantRow = Database['public']['Tables']['tenants']['Row']

const ACTOR_COLORS: Record<string, string> = {
  AI:     'bg-primary-tint text-primary',
  HUMAN:  'bg-green-100 text-green-700',
  SYSTEM: 'bg-surface-200 text-ink-muted',
}

const EVENT_COLORS: Record<string, string> = {
  'tenant.created':              'text-primary',
  'invitation.sent':             'text-purple-600',
  'session.created':             'text-primary',
  'session.status_changed':      'text-primary',
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
      .limit(200) as unknown as Promise<{ data: AuditRow[] | null }>,
    db.from('tenants')
      .select('id, name') as unknown as Promise<{ data: Pick<TenantRow, 'id' | 'name'>[] | null }>,
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
        <h1 className="text-xl font-semibold text-ink">Auditoría</h1>
        <p className="text-sm text-ink-subtle">
          Registro inmutable de eventos · últimas {rows.length} entradas
        </p>
      </div>

      {/* Top eventos */}
      {topEvents.length > 0 && (
        <div className="rounded-xl border border-border-soft bg-surface-100 p-5 shadow-sm">
          <p className="text-sm font-medium text-ink-muted mb-3">Eventos más frecuentes</p>
          <div className="space-y-2">
            {topEvents.map(([event, count]) => {
              const pct = Math.round((count / rows.length) * 100)
              return (
                <div key={event}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-mono ${EVENT_COLORS[event] ?? 'text-ink-muted'}`}>{event}</span>
                    <span className="text-ink-subtle">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-200 overflow-hidden">
                    <div className="h-full rounded-full bg-wash-strong" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabla de eventos */}
      <div className="overflow-hidden rounded-xl border border-border-soft bg-surface-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border-soft bg-surface-000">
            <tr>
              {['Fecha', 'Tenant', 'Actor', 'Evento', 'Detalle'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-subtle">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-subtle">
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
                <tr key={r.id} className="hover:bg-surface-000 align-top">
                  <td className="px-4 py-2.5 text-xs text-ink-subtle whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString('es', {
                      day: '2-digit', month: 'short',
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-ink-muted text-xs">
                    {r.tenant_id ? (tenantMap[r.tenant_id] ?? r.tenant_id.slice(0, 8)) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ACTOR_COLORS[r.actor_type] ?? 'bg-surface-200 text-ink-subtle'}`}>
                      {r.actor_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`font-mono text-xs ${EVENT_COLORS[r.event_type] ?? 'text-ink-muted'}`}>
                      {r.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink-subtle max-w-xs truncate">
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
