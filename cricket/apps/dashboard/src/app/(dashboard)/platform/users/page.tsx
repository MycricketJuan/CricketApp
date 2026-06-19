import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import type { Database } from '@cricket/core/types'
import { setUserRole, toggleUserActive, revokeInvitation } from './actions'

type TenantUserRow    = Database['public']['Tables']['tenant_users']['Row']
type SuperadminRow    = Database['public']['Tables']['superadmins']['Row']
type InvitationRow    = Database['public']['Tables']['tenant_invitations']['Row']
type TenantRow        = Database['public']['Tables']['tenants']['Row']

const ROLE_LABELS: Record<string, string> = {
  superadmin:   'Superadmin',
  tenant_admin: 'Admin',
  supervisor:   'Supervisor',
  operator:     'Operador',
}

const ROLE_OPTIONS = ['tenant_admin', 'supervisor', 'operator'] as const

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatRelative(d: string | null) {
  if (!d) return 'Nunca'
  const diff = Date.now() - new Date(d).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 60)  return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

export default async function UsersPage() {
  const db = getSupabaseAdmin()

  const [
    { data: tenantUsers },
    { data: superadmins },
    { data: invitations },
    { data: tenants },
  ] = await Promise.all([
    db.from('tenant_users')
      .select('id, full_name, role, is_active, last_seen_at, created_at, tenant_id')
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: TenantUserRow[] | null }>,
    db.from('superadmins')
      .select('id, email, full_name, created_at')
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: SuperadminRow[] | null }>,
    db.from('tenant_invitations')
      .select('id, email, role, status, expires_at, tenant_id, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: InvitationRow[] | null }>,
    db.from('tenants')
      .select('id, name, slug') as unknown as Promise<{ data: Pick<TenantRow, 'id' | 'name' | 'slug'>[] | null }>,
  ])

  const tenantMap = Object.fromEntries((tenants ?? []).map(t => [t.id, t]))
  const users     = tenantUsers ?? []
  const admins    = superadmins ?? []
  const invites   = invitations ?? []

  return (
    <div className="p-6 space-y-10">

      {/* ── Equipo Cricket ────────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900">Equipo Cricket</h1>
          <p className="text-sm text-gray-500">{admins.length} superadmins con acceso total a la plataforma</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Nombre', 'Email', 'Desde'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">Sin superadmins registrados</td></tr>
              )}
              {admins.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{a.email}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Usuarios de tenants ───────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Usuarios por tenant</h2>
          <p className="text-sm text-gray-500">{users.length} usuarios en total</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Nombre', 'Tenant', 'Rol', 'Estado', 'Último acceso', 'Desde', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Sin usuarios registrados</td></tr>
              )}
              {users.map(u => {
                const tenant = tenantMap[u.tenant_id]
                return (
                  <tr key={u.id} className={`hover:bg-gray-50 ${!u.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {u.full_name ?? <span className="font-mono text-xs text-gray-400">{u.id.slice(0, 8)}…</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {tenant?.name ?? u.tenant_id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <form action={async (fd: FormData) => {
                        'use server'
                        await setUserRole(u.id, fd.get('role') as 'tenant_admin' | 'supervisor' | 'operator')
                      }} className="flex items-center gap-1">
                        <select
                          name="role"
                          defaultValue={u.role}
                          className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
                        >
                          {ROLE_OPTIONS.map(r => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                        <button type="submit" className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200">✓</button>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatRelative(u.last_seen_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <form action={async () => {
                        'use server'
                        await toggleUserActive(u.id, !u.is_active)
                      }}>
                        <button
                          type="submit"
                          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                            u.is_active
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {u.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Invitaciones pendientes ───────────────────────── */}
      {invites.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Invitaciones pendientes</h2>
            <p className="text-sm text-gray-500">{invites.length} invitaciones sin aceptar</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['Email', 'Tenant', 'Rol', 'Expira', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invites.map(inv => {
                  const tenant  = tenantMap[inv.tenant_id]
                  const expired = new Date(inv.expires_at) < new Date()
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{inv.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {tenant?.name ?? inv.tenant_id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ROLE_LABELS[inv.role] ?? inv.role}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${expired ? 'text-red-500' : 'text-gray-500'}`}>
                          {expired ? 'Expirada' : formatDate(inv.expires_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <form action={async () => {
                          'use server'
                          await revokeInvitation(inv.id)
                        }}>
                          <button
                            type="submit"
                            className="rounded px-2 py-1 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            Revocar
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
