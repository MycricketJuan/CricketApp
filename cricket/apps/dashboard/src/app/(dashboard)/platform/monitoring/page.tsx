import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import type { Database } from '@cricket/core/types'

type SessionRow    = Database['public']['Tables']['sessions']['Row']
type EscalationRow = Database['public']['Tables']['escalations']['Row']
type CheckpointRow = Database['public']['Tables']['cognitive_checkpoints']['Row']
type TenantRow     = Database['public']['Tables']['tenants']['Row']

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:         'bg-green-100 text-green-700',
    escalated:      'bg-red-100 text-red-700',
    human_takeover: 'bg-orange-100 text-orange-700',
    completed:      'bg-gray-100 text-gray-500',
    abandoned:      'bg-gray-100 text-gray-400',
    pending:        'bg-yellow-100 text-yellow-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function Stat({ label, value, sub, color = 'text-gray-900' }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export default async function MonitoringPage() {
  const db  = getSupabaseAdmin()
  const now = new Date()
  const ago1h = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

  const [
    { data: activeSessions },
    { data: pendingCheckpoints },
    { data: openEscalations },
    { data: tenants },
    { count: sessionsLastHour },
  ] = await Promise.all([
    db.from('sessions')
      .select('*')
      .in('status', ['active', 'escalated', 'human_takeover'])
      .order('started_at', { ascending: false })
      .limit(50) as Promise<{ data: SessionRow[] | null }>,
    db.from('cognitive_checkpoints')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20) as Promise<{ data: CheckpointRow[] | null }>,
    db.from('escalations')
      .select('*')
      .is('outcome', null)
      .order('created_at', { ascending: false })
      .limit(20) as Promise<{ data: EscalationRow[] | null }>,
    db.from('tenants')
      .select('id, name, slug') as Promise<{ data: Pick<TenantRow, 'id' | 'name' | 'slug'>[] | null }>,
    db.from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', ago1h),
  ])

  const tenantMap = (tenants ?? []).reduce<Record<string, string>>(
    (acc, t) => { acc[t.id] = t.name; return acc }, {},
  )

  const sessions     = activeSessions ?? []
  const checkpoints  = pendingCheckpoints ?? []
  const escalations  = openEscalations ?? []
  const aiSessions   = sessions.filter((s) => s.actor_control === 'AI').length
  const humanSessions = sessions.filter((s) => s.actor_control !== 'AI').length

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Monitoreo</h1>
        <p className="text-sm text-gray-500">Estado en tiempo real de toda la plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Sesiones activas"        value={sessions.length}    sub={`${aiSessions} IA · ${humanSessions} IH`} />
        <Stat label="Checkpoints pendientes"  value={checkpoints.length} color={checkpoints.length > 0 ? 'text-amber-600' : 'text-gray-900'} />
        <Stat label="Escaladas abiertas"      value={escalations.length} color={escalations.length > 0 ? 'text-red-600' : 'text-gray-900'} />
        <Stat label="Sesiones última hora"    value={sessionsLastHour ?? 0} />
      </div>

      {/* Sesiones activas */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Sesiones en curso ({sessions.length})
        </h2>
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
            Sin sesiones activas en este momento
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['Tenant', 'Canal', 'Estado', 'Control', 'Etapa', 'Inicio'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {tenantMap[s.tenant_id] ?? s.tenant_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{s.channel ?? '—'}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.actor_control === 'AI'    ? 'bg-blue-100 text-blue-700' :
                        s.actor_control === 'HUMAN' ? 'bg-orange-100 text-orange-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {s.actor_control}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{s.current_stage ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">
                      {new Date(s.started_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Checkpoints pendientes */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Cognitive checkpoints pendientes ({checkpoints.length})
        </h2>
        {checkpoints.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
            Sin checkpoints pendientes
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['Tenant', 'Motivo', 'Confianza IA', 'Expira en', 'Creado'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {checkpoints.map((c) => {
                  const expiresAt = c.expires_at ? new Date(c.expires_at) : null
                  const minsLeft  = expiresAt ? Math.round((expiresAt.getTime() - now.getTime()) / 60000) : null
                  const isUrgent  = minsLeft != null && minsLeft < 10
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {tenantMap[c.tenant_id] ?? c.tenant_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{c.trigger_reason}</td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {c.confidence_at_trigger != null
                          ? `${(Number(c.confidence_at_trigger) * 100).toFixed(0)}%`
                          : '—'}
                      </td>
                      <td className={`px-4 py-2.5 text-xs font-medium ${isUrgent ? 'text-red-600' : 'text-gray-500'}`}>
                        {minsLeft == null ? '—' : minsLeft < 0 ? 'Expirado' : `${minsLeft} min`}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">
                        {new Date(c.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Escaladas abiertas */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Escaladas sin resolver ({escalations.length})
        </h2>
        {escalations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
            Sin escaladas abiertas
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['Tenant', 'Motivo', 'Sentimiento', 'Confianza', 'Hace'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {escalations.map((e) => {
                  const mins = Math.round((now.getTime() - new Date(e.created_at).getTime()) / 60000)
                  return (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {tenantMap[e.tenant_id] ?? e.tenant_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{e.trigger_reason}</td>
                      <td className="px-4 py-2.5 text-gray-500">{e.customer_sentiment ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {e.confidence_at_trigger != null
                          ? `${(Number(e.confidence_at_trigger) * 100).toFixed(0)}%`
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">
                        {mins < 60 ? `${mins} min` : `${Math.round(mins / 60)} h`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
