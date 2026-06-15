import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import type { Database } from '@cricket/core/types'

type ModuleRow = Database['public']['Tables']['tenant_modules']['Row']
type TenantRow = Database['public']['Tables']['tenants']['Row']

const MODULE_LABELS: Record<string, string> = {
  consultation: 'Consulta',
  sales:        'Ventas',
  transactions: 'Transacciones',
  feedback:     'Feedback',
}

const MODULE_COLORS: Record<string, string> = {
  consultation: 'bg-blue-50 text-blue-700 border-blue-200',
  sales:        'bg-purple-50 text-purple-700 border-purple-200',
  transactions: 'bg-amber-50 text-amber-700 border-amber-200',
  feedback:     'bg-green-50 text-green-700 border-green-200',
}

const FALLBACK_LABELS: Record<string, string> = {
  ih_handoff:   'Escalar a IH',
  redirect_url: 'Redirigir URL',
  skip:         'Omitir',
}

export default async function ModulesPage() {
  const db = getSupabaseAdmin()

  const [{ data: modules }, { data: tenants }] = await Promise.all([
    db.from('tenant_modules').select('*').order('module_type') as Promise<{ data: ModuleRow[] | null }>,
    db.from('tenants').select('id, name, slug, sector').order('name') as Promise<{ data: TenantRow[] | null }>,
  ])

  const tenantMap = (tenants ?? []).reduce<Record<string, TenantRow>>(
    (acc, t) => { acc[t.id] = t; return acc }, {},
  )

  const MODULE_ORDER = ['consultation', 'sales', 'transactions', 'feedback']

  // Agrupar por tipo de módulo
  const byType = MODULE_ORDER.reduce<Record<string, { module: ModuleRow; tenant: TenantRow }[]>>(
    (acc, type) => {
      acc[type] = (modules ?? [])
        .filter((m) => m.module_type === type)
        .map((m) => ({ module: m, tenant: tenantMap[m.tenant_id] }))
        .filter((x) => x.tenant != null)
      return acc
    },
    {},
  )

  const totalActive   = (modules ?? []).filter((m) => m.is_active).length
  const totalInactive = (modules ?? []).filter((m) => !m.is_active).length

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Módulos</h1>
        <p className="text-sm text-gray-500">
          {totalActive} activos · {totalInactive} inactivos en todos los tenants
        </p>
      </div>

      {/* Resumen por tipo */}
      <div className="grid grid-cols-4 gap-4">
        {MODULE_ORDER.map((type) => {
          const items  = byType[type] ?? []
          const active = items.filter((x) => x.module.is_active).length
          return (
            <div key={type} className={`rounded-xl border p-4 ${MODULE_COLORS[type]}`}>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                {MODULE_LABELS[type]}
              </p>
              <p className="mt-1 text-2xl font-bold">{active}</p>
              <p className="text-xs opacity-60">de {items.length} tenants</p>
            </div>
          )
        })}
      </div>

      {/* Tabla por tipo */}
      {MODULE_ORDER.map((type) => {
        const items = byType[type] ?? []
        return (
          <section key={type} className="space-y-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
              {MODULE_LABELS[type]}
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    {['Tenant', 'Sector', 'Estado', 'Fallback', 'Confianza mín.'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-xs text-gray-400">
                        Sin tenants con este módulo
                      </td>
                    </tr>
                  ) : items.map(({ module: m, tenant: t }) => {
                    const config = (m.config ?? {}) as Record<string, unknown>
                    const threshold = config.confidence_threshold as number | undefined
                    return (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{t.name}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{t.sector}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {m.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {FALLBACK_LABELS[m.fallback_type ?? ''] ?? m.fallback_type ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {threshold != null ? threshold.toFixed(2) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}
