import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { getKBAdmin } from '@/lib/knowledge/db'

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}

const ROLE_LABELS: Record<string, string> = {
  tenant_admin: 'Admin',
  supervisor:   'Supervisor',
  operator:     'Operador',
}

function formatRelative(d: string | null | undefined) {
  if (!d) return 'Nunca'
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

export default async function AdminPage() {
  const headersList = await headers()
  const tenantSlug  = headersList.get('x-tenant-slug') ?? ''
  const db          = getSupabaseAdmin()

  const { data: tenant } = await db
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">Tenant no encontrado: {tenantSlug}</p>
      </div>
    )
  }

  const kb = getKBAdmin()

  const [
    { count: usersCount },
    { count: sessionsCount },
    { count: escalationsCount },
    { count: docsCount },
    { data: users },
  ] = await Promise.all([
    db.from('tenant_users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('is_active', true),
    db.from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('status', 'active'),
    db.from('escalations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .is('outcome', null),
    kb.from('knowledge_base_documents')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id),
    db.from('tenant_users')
      .select('id, full_name, email, role, is_active, last_seen_at')
      .eq('tenant_id', tenant.id)
      .order('role')
      .order('full_name') as unknown as Promise<{
        data: Array<{
          id: string
          full_name: string | null
          email: string | null
          role: string
          is_active: boolean
          last_seen_at: string | null
        }> | null
      }>,
  ])

  const fmt = (n: number | null) => (n === null ? '—' : n.toLocaleString('es'))

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{tenant.name}</h1>
        <p className="text-sm text-gray-500">Resumen del tenant</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card label="Usuarios activos"    value={fmt(usersCount)} />
        <Card label="Sesiones activas"    value={fmt(sessionsCount)} />
        <Card label="Escaladas abiertas"  value={fmt(escalationsCount)} />
        <Card label="Documentos KB"       value={fmt(docsCount)} />
      </div>

      {/* Usuarios del tenant */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Equipo
        </h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Nombre / Email', 'Rol', 'Estado', 'Último acceso'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                    Sin usuarios registrados
                  </td>
                </tr>
              )}
              {(users ?? []).map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 ${!u.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.full_name ?? '—'}</p>
                    {u.email && <p className="text-xs text-gray-400">{u.email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatRelative(u.last_seen_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
