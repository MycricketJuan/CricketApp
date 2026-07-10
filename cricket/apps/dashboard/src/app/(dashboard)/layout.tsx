export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { auth0 } from '@/lib/auth0'
import { resolveRole } from '@/lib/auth-helpers'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { NavSidebar } from './nav-sidebar'
import type { UserProfile } from './profile-switcher'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session      = await auth0.getSession()
  const jwtRole      = resolveRole((session?.user ?? {}) as Record<string, unknown>)
  const name         = session?.user.name ?? session?.user.email ?? 'Usuario'
  const userId       = session?.user.sub as string | undefined
  const headersList  = await headers()
  const activeSlug   = headersList.get('x-tenant-slug') ?? ''

  // Cargar todos los perfiles del usuario (tenant_users activos)
  let profiles: UserProfile[] = []
  const userEmail = (session?.user.email as string | undefined ?? '').toLowerCase()
  if (userId || userEmail) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbAny = getSupabaseAdmin() as any
    type ProfileRow = {
      role: string
      tenant_id: string
      tenants: { id: string; name: string; slug: string } | null
    }

    // Dos queries separadas para evitar el carácter | del Auth0 sub en filtros OR de PostgREST
    const results: ProfileRow[] = []

    if (userId) {
      const { data } = (await dbAny
        .from('tenant_users')
        .select('role, tenant_id, tenants(id, name, slug)')
        .eq('auth0_sub', userId)
        .eq('is_active', true)) as { data: ProfileRow[] | null }
      results.push(...(data ?? []))
    }

    if (userEmail) {
      const { data } = (await dbAny
        .from('tenant_users')
        .select('role, tenant_id, tenants(id, name, slug)')
        .eq('email', userEmail)
        .eq('is_active', true)) as { data: ProfileRow[] | null }
      results.push(...(data ?? []))
    }

    // Deduplicar por tenant_id
    const seen = new Set<string>()
    profiles = results
      .filter(r => r.tenants !== null && !seen.has(r.tenant_id) && seen.add(r.tenant_id))
      .map(r => ({
        tenantId:   r.tenants!.id,
        tenantName: r.tenants!.name,
        tenantSlug: r.tenants!.slug,
        role:       r.role,
      }))
  }

  // El rol para el sidebar viene del JWT (superadmin) o del perfil activo en tenant_users.
  // Sin claim JWT y sin perfil → operator.
  const activeProfile = profiles.find(p => p.tenantSlug === activeSlug) ?? profiles[0]
  const role = jwtRole !== 'operator' ? jwtRole : (activeProfile?.role ?? 'operator')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <NavSidebar
        role={role}
        userName={name}
        profiles={profiles}
        activeSlug={activeSlug}
      />
      <main className="flex-1 overflow-y-auto pl-56">
        {children}
      </main>
    </div>
  )
}
