export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'

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

export default async function AdminUsersPage() {
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
        <p className="text-sm text-ink-subtle">Tenant no encontrado: {tenantSlug}</p>
      </div>
    )
  }

  const { data: users } = await db
    .from('tenant_users')
    .select('id, full_name, email, role, is_active, last_seen_at, created_at')
    .eq('tenant_id', tenant.id)
    .order('role')
    .order('full_name') as {
      data: Array<{
        id: string
        full_name: string | null
        email: string | null
        role: string
        is_active: boolean
        last_seen_at: string | null
        created_at: string
      }> | null
    }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-ink">Usuarios</h1>
        <p className="text-sm text-ink-subtle">{tenant.name} · {users?.length ?? 0} registros</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-soft bg-surface-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border-soft bg-surface-000">
            <tr>
              {['Nombre / Email', 'Rol', 'Estado', 'Último acceso', 'Alta'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-subtle">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {(!users || users.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-subtle">
                  Sin usuarios registrados
                </td>
              </tr>
            )}
            {(users ?? []).map(u => (
              <tr key={u.id} className={`hover:bg-surface-000 ${!u.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{u.full_name ?? '—'}</p>
                  {u.email && <p className="text-xs text-ink-subtle">{u.email}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-surface-200 px-2 py-0.5 text-xs font-medium text-ink-muted">
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-200 text-ink-subtle'
                  }`}>
                    {u.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-ink-subtle">{formatRelative(u.last_seen_at)}</td>
                <td className="px-4 py-3 text-xs text-ink-subtle">
                  {new Date(u.created_at).toLocaleDateString('es')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
