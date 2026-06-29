import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import type { Database } from '@cricket/core/types'
import {
  assignUserToTenant,
  assignSuperadmin,
  removeUserGrant,
  setUserRole,
  toggleUserActive,
  deleteUser,
} from './actions'

type TenantUserRow = Database['public']['Tables']['tenant_users']['Row'] & {
  auth0_sub?: string | null
  email?: string | null
}
type TenantRow = Database['public']['Tables']['tenants']['Row']

const ROLE_LABELS: Record<string, string> = {
  superadmin:   'Superadmin',
  tenant_admin: 'Admin',
  supervisor:   'Supervisor',
  operator:     'Operador',
}

const ROLE_OPTIONS = ['tenant_admin', 'supervisor', 'operator'] as const

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
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

interface Grant {
  id: string
  email: string
  tenant_id: string
  role: string
  full_name: string | null
  provisioned: boolean
  created_at: string
}

interface SuperadminGrant {
  id: string
  email: string
  full_name: string | null
  provisioned: boolean
  created_at: string
}

interface Superadmin {
  id: string
  email: string
  full_name: string | null
  created_at: string
}

export default async function UsersPage() {
  const db    = getSupabaseAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const [
    { data: tenantUsers, error: e1 },
    { data: superadmins, error: e2 },
    { data: userGrants,  error: e3 },
    { data: superadminGrants, error: e4 },
    { data: tenants,     error: e5 },
  ] = await Promise.all([
    db.from('tenant_users')
      .select('id, full_name, email, role, is_active, last_seen_at, created_at, tenant_id')
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: TenantUserRow[] | null; error: { message: string } | null }>,
    db.from('superadmins')
      .select('id, email, full_name, created_at')
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: Superadmin[] | null; error: { message: string } | null }>,
    dbAny.from('user_grants')
      .select('id, email, tenant_id, role, full_name, provisioned, created_at')
      .order('created_at', { ascending: false }) as Promise<{ data: Grant[] | null; error: { message: string } | null }>,
    dbAny.from('superadmin_grants')
      .select('id, email, full_name, provisioned, created_at')
      .order('created_at', { ascending: false }) as Promise<{ data: SuperadminGrant[] | null; error: { message: string } | null }>,
    db.from('tenants')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name') as unknown as Promise<{ data: Pick<TenantRow, 'id' | 'name' | 'slug'>[] | null; error: { message: string } | null }>,
  ])

  // Log query errors so they appear in Vercel runtime logs
  if (e1) console.error('[users/page] tenant_users:', e1.message)
  if (e2) console.error('[users/page] superadmins:', e2.message)
  if (e3) console.error('[users/page] user_grants:', e3.message)
  if (e4) console.error('[users/page] superadmin_grants:', e4.message)
  if (e5) console.error('[users/page] tenants:', e5.message)

  const tenantMap  = Object.fromEntries((tenants ?? []).map(t => [t.id, t]))
  const users      = tenantUsers ?? []
  const admins     = superadmins ?? []
  const grants     = userGrants ?? []
  const saGrants   = superadminGrants ?? []
  const tenantList = tenants ?? []

  const pendingGrants = grants.filter(g => !g.provisioned)

  return (
    <div className="p-6 space-y-10 max-w-6xl">

      {/* ── Equipo Cricket (superadmins activos) ──────────────────────────── */}
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
                  <td className="px-4 py-3 text-gray-600">{a.email}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Agregar superadmin */}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 select-none">
            + Agregar superadmin
          </summary>
          <form action={assignSuperadmin} className="mt-3 flex flex-wrap gap-3 items-end rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">Email</label>
              <input
                type="email" name="email" required placeholder="admin@mycricket.ai"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-64"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">Nombre (opcional)</label>
              <input
                type="text" name="full_name" placeholder="Juan García"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-48"
              />
            </div>
            <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
              Agregar
            </button>
            <p className="w-full text-xs text-gray-400">
              El acceso se activa automáticamente la próxima vez que el usuario ingrese con ese email.
            </p>
          </form>
        </details>

        {/* Superadmin grants pendientes */}
        {saGrants.filter(g => !g.provisioned).length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-medium text-amber-700 mb-2">Pendientes de primer ingreso</p>
            <div className="space-y-1">
              {saGrants.filter(g => !g.provisioned).map(g => (
                <div key={g.id} className="flex items-center gap-3 text-sm text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>{g.email}</span>
                  {g.full_name && <span className="text-amber-600 text-xs">({g.full_name})</span>}
                  <span className="text-amber-500 text-xs ml-auto">{formatDate(g.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Asignar usuario a tenant ───────────────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Asignar usuario a tenant</h2>
          <p className="text-sm text-gray-500">
            El acceso se activa automáticamente la próxima vez que el usuario ingrese con ese email.
          </p>
        </div>
        <form action={assignUserToTenant} className="flex flex-wrap gap-3 items-end rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Email</label>
            <input
              type="email" name="email" required placeholder="usuario@empresa.com"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-64"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Nombre (opcional)</label>
            <input
              type="text" name="full_name" placeholder="María López"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-44"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Tenant</label>
            <select
              name="tenant_id" required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Seleccionar…</option>
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
          <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
            Asignar acceso
          </button>
        </form>

        {/* Grants pendientes de activación */}
        {pendingGrants.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-amber-100 bg-amber-50">
            <div className="px-4 py-3 border-b border-amber-100">
              <p className="text-sm font-medium text-amber-800">Pendientes de primer ingreso ({pendingGrants.length})</p>
              <p className="text-xs text-amber-600">Se activarán automáticamente cuando el usuario ingrese por primera vez.</p>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-amber-100">
                {pendingGrants.map(g => {
                  const tenant      = tenantMap[g.tenant_id]
                  const removeAction = removeUserGrant.bind(null, g.id)
                  return (
                    <tr key={g.id} className="hover:bg-amber-50/50">
                      <td className="px-4 py-3 text-gray-900">{g.email}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{g.full_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-white border border-amber-200 px-2 py-0.5 text-xs text-gray-700">
                          {tenant?.name ?? g.tenant_id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{ROLE_LABELS[g.role] ?? g.role}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(g.created_at)}</td>
                      <td className="px-4 py-3">
                        <form action={removeAction}>
                          <button type="submit" className="rounded px-2 py-1 text-xs bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                            Quitar
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Usuarios activos por tenant ───────────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Usuarios activos</h2>
          <p className="text-sm text-gray-500">{users.length} usuarios con acceso activo</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Nombre / Email', 'Tenant', 'Rol', 'Estado', 'Último acceso', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                    Sin usuarios activos. Los usuarios aparecerán aquí tras su primer ingreso.
                  </td>
                </tr>
              )}
              {users.map(u => {
                const tenant       = tenantMap[u.tenant_id]
                const roleAction   = setUserRole.bind(null, u.id)
                const toggleAction = toggleUserActive.bind(null, u.id)
                const deleteAction = deleteUser.bind(null, u.id)
                return (
                  <tr key={u.id} className={`hover:bg-gray-50 ${!u.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.full_name ?? '—'}</p>
                      {u.email && <p className="text-xs text-gray-400">{u.email}</p>}
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <form action={toggleAction}>
                          <input type="hidden" name="is_active" value={u.is_active ? 'false' : 'true'} />
                          <button type="submit" className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                            u.is_active
                              ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}>
                            {u.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        </form>
                        <form action={deleteAction}>
                          <button
                            type="submit"
                            className="rounded px-2 py-1 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            onClick={(e) => { if (!confirm('¿Eliminar acceso de este usuario?')) e.preventDefault() }}
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
    </div>
  )
}
