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
  banking:    'bg-primary-tint text-primary',
  retail:     'bg-purple-100 text-purple-700',
  health:     'bg-green-100 text-green-700',
  telecom:    'bg-orange-100 text-orange-700',
  government: 'bg-surface-200 text-ink-muted',
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
          <h1 className="text-xl font-semibold text-ink">Tenants</h1>
          <p className="text-sm text-ink-subtle">{rows.length} organizaciones registradas</p>
        </div>
        <a
          href="/onboarding"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          + Nuevo tenant
        </a>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border-soft py-20 text-ink-subtle">
          <p className="text-sm">Sin tenants registrados. <a href="/onboarding" className="text-ink-muted underline">Crear el primero</a></p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-soft bg-surface-100 shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border-soft bg-surface-000">
              <tr>
                {['Organización', 'Slug', 'Sector', 'Módulos activos', 'Sesiones activas', 'Estado', 'Creado'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-subtle">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {rows.map((t) => {
                const mods    = modulesByTenant[t.id] ?? { total: 0, active: 0 }
                const sessions = sessionsByTenant[t.id] ?? 0
                return (
                  <tr key={t.id} className="hover:bg-surface-000">
                    <td className="px-4 py-3 font-medium text-ink">{t.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-subtle">{t.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SECTOR_COLORS[t.sector] ?? 'bg-surface-200 text-ink-muted'}`}>
                        {SECTOR_LABELS[t.sector] ?? t.sector}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {mods.active}/{mods.total}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{sessions}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-200 text-ink-subtle'
                      }`}>
                        {t.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-subtle">
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
