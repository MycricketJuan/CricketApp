import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import type { Database } from '@cricket/core/types'
import { setUserRole, toggleUserActive, deleteUser, revokeInvitation, inviteUser } from './actions'

type TenantUserRow = Database['public']['Tables']['tenant_users']['Row']
type SuperadminRow = Database['public']['Tables']['superadmins']['Row']
type InvitationRow = Database['public']['Tables']['tenant_invitations']['Row']
type TenantRow     = Database['public']['Tables']['tenants']['Row']

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
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `hace ${hrs}h`
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
      .in('status', ['pending', 'revoked'])
      .order('created_at', { ascending: false })
      .limit(20) as unknown as Promise<{ data: InvitationRow[] | null }>,
    db.from('tenants')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name') as unknown as Promise<{ data: Pick<TenantRow, 'id' | 'name' | 'slug'>[] | null }>,
  ])

  const tenantMap  = Object.fromEntries((tenants ?? []).map(t => [t.id, t]))
  const users      = tenantUsers ?? []
  const admins     = superadmins ?? []
  const invites    = invitations ?? []
  const tenantList = tenants ?? []

  return (
    <div className="p-6 space-y-10 max-w-6xl">

      {/* ── Equipo Cricket (superadmins) ──────────────────── */}
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
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{a.email}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Invitar usuario ───────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Invitar usuario</h2>
          <p className="text-sm text-gray-500">El usuario recibirá acceso al tenant seleccionado con el rol indicado.</p>
        </div>
        <form action={inviteUser} className="flex flex-wrap gap-3 items-end rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              required
              placeholder="usuario@empresa.com"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-64"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Tenant</label>
            <select
              name="tenant_id"
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Seleccionar tenant…</option>
              {tenantList.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Rol</label>
            <select
              name="role"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            Enviar invitación
          </button>
        </form>
      </section>

      {/* ── Usuarios por tenant ───────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Usuarios por tenant</h2>
          <p className="text-sm text-gray-500">{users.length} usuarios registrados</p>
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
                const tenant         = tenantMap[u.tenant_id]
                const roleAction     = setUserRole.bind(null, u.id)
                const toggleAction   = toggleUserActive.bind(null, u.id)
                const deleteAction   = deleteUser.bind(null, u.id)
                return (
                  <tr key={u.id + u.tenant_id} className={`hover:bg-gray-50 ${!u.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {u.full_name ?? <span className="font-mono text-xs text-gray-400">{u.id.slice(0, 8)}…</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {tenant?.name ?? u.tenant_id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <form action={roleAction} className="flex items-center gap-1">
                        <select
                          name="role"
                          defaultValue={u.role}
                          className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
                        >
                          {ROLE_OPTIONS.map(r => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                        <button type="submit" title="Guardar rol" className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200">✓</button>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatRelative(u.last_seen_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* Activar / Desactivar */}
                        <form action={toggleAction}>
                          <input type="hidden" name="is_active" value={u.is_active ? 'false' : 'true'} />
                          <button
                            type="submit"
                            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                              u.is_active
                                ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {u.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        </form>
                        {/* Eliminar */}
                        <form action={deleteAction}>
                          <button
                            type="submit"
                            className="rounded px-2 py-1 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            onClick={(e) => {
                              if (!confirm('¿Eliminar este usuario del tenant?')) e.preventDefault()
                            }}
                          >
                            Eliminar
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Invitaciones recientes ────────────────────────── */}
      {invites.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Invitaciones recientes</h2>
            <p className="text-sm text-gray-500">Últimas 20 invitaciones</p>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['Email', 'Tenant', 'Rol', 'Estado', 'Expira', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invites.map(inv => {
                  const tenant    = tenantMap[inv.tenant_id]
                  const expired   = new Date(inv.expires_at) < new Date()
                  const isPending = inv.status === 'pending'
                  const revokeAction = revokeInvitation.bind(null, inv.id)
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
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          inv.status === 'pending'  ? 'bg-yellow-100 text-yellow-700' :
                          inv.status === 'revoked'  ? 'bg-gray-100 text-gray-500' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {inv.status === 'pending' ? 'Pendiente' : inv.status === 'revoked' ? 'Revocada' : 'Aceptada'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${expired && isPending ? 'text-red-500' : 'text-gray-500'}`}>
                          {expired && isPending ? 'Expirada' : formatDate(inv.expires_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isPending && (
                          <form action={revokeAction}>
                            <button
                              type="submit"
                              className="rounded px-2 py-1 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              Revocar
                            </button>
                          </form>
                        )}
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
