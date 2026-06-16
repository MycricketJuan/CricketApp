import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import type { Database } from '@cricket/core/types'

type TenantRow = Database['public']['Tables']['tenants']['Row']

const SECTOR_LABELS: Record<string, string> = {
  banking:    'Banca',
  retail:     'Retail',
  health:     'Salud',
  telecom:    'Telecom',
  government: 'Gobierno',
}

const SECTOR_COLORS: Record<string, string> = {
  banking:    'bg-blue-100 text-blue-700',
  retail:     'bg-purple-100 text-purple-700',
  health:     'bg-green-100 text-green-700',
  telecom:    'bg-orange-100 text-orange-700',
  government: 'bg-gray-100 text-gray-600',
}

export default async function TenantsPage() {
  const db = getSupabaseAdmin()

  const [
    { data: tenants },
    { data: moduleCounts },
    { data: sessionCounts },
  ] = await Promise.all([
    db.from('tenants')
      .select('*')
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: TenantRow[] | null }>,
    db.from('tenant_modules')
      .select('tenant_id, is_active'),
    db.from('sessions')
      .select('tenant_id, status')
      .eq('status', 'active'),
  ])

  const modulesByTenant = (moduleCounts ?? []).reduce<Record<string, { total: number; active: number }>>(
    (acc, m) => {
      if (!acc[m.tenant_id]) acc[m.tenant_id] = { total: 0, active: 0 }
      acc[m.tenant_id].total++
      if (m.is_active) acc[m.tenant_id].active++
      return acc
    },
    {},
  )

  const sessionsByTenant = (sessionCounts ?? []).reduce<Record<string, number>>(
    (acc, s) => { acc[s.tenant_id] = (acc[s.tenant_id] ?? 0) + 1; return acc },
    {},
  )

  const rows = tenants ?? []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tenants</h1>
          <p className="text-sm text-gray-500">{rows.length} organizaciones registradas</p>
        </div>
        <a
          href="/onboarding"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          + Nuevo tenant
        </a>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 py-20 text-gray-400">
          <p className="text-sm">Sin tenants registrados. <a href="/onboarding" className="text-gray-600 underline">Crear el primero</a></p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Organización', 'Slug', 'Sector', 'Módulos activos', 'Sesiones activas', 'Estado', 'Creado'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((t) => {
                const mods    = modulesByTenant[t.id] ?? { total: 0, active: 0 }
                const sessions = sessionsByTenant[t.id] ?? 0
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SECTOR_COLORS[t.sector] ?? 'bg-gray-100 text-gray-600'}`}>
                        {SECTOR_LABELS[t.sector] ?? t.sector}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {mods.active}/{mods.total}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{sessions}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {t.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(t.created_at).toLocaleDateString('es', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
