import { getSupabaseAdmin } from '@cricket/core/supabase/admin'

interface StatCard {
  label: string
  value: string | number
}

function Card({ label, value }: StatCard) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}

export default async function PlatformPage() {
  const db = getSupabaseAdmin()

  const [
    { count: tenantsCount },
    { count: sessionsCount },
    { count: escalationsCount },
    { data: tenants },
  ] = await Promise.all([
    db.from('tenants').select('*', { count: 'exact', head: true }).eq('is_active', true),
    db.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('escalations').select('*', { count: 'exact', head: true }).is('outcome', null),
    db.from('tenants').select('name, slug, sector, is_active, created_at').order('created_at', { ascending: false }),
  ])

  const fmt = (n: number | null) => (n === null ? '—' : n.toLocaleString('es'))

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Plataforma Cricket</h1>
        <p className="text-sm text-gray-500">Superadministración</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card label="Tenants activos"    value={fmt(tenantsCount)} />
        <Card label="Sesiones activas"   value={fmt(sessionsCount)} />
        <Card label="Escaladas abiertas" value={fmt(escalationsCount)} />
        <Card label="Agentes disponibles" value="4" />
      </div>

      {/* Tenants table */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Todos los tenants
        </h2>

        {!tenants || tenants.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 text-gray-400">
            <p className="text-sm">Sin tenants registrados</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['Nombre', 'Slug', 'Sector', 'Estado', 'Creado'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map((t) => (
                  <tr key={t.slug} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 font-mono text-gray-600">{t.slug}</td>
                    <td className="px-4 py-3 text-gray-600">{t.sector ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
