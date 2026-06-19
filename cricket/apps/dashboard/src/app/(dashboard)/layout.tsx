import { headers } from 'next/headers'
import { auth0 } from '@/lib/auth0'
import { resolveRole } from '@/lib/auth-helpers'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { NavSidebar } from './nav-sidebar'
import type { UserProfile } from './profile-switcher'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session      = await auth0.getSession()
  const role         = resolveRole((session?.user ?? {}) as Record<string, unknown>)
  const name         = session?.user.name ?? session?.user.email ?? 'Usuario'
  const userId       = session?.user.sub as string | undefined
  const headersList  = await headers()
  const activeSlug   = headersList.get('x-tenant-slug') ?? ''

  // Cargar todos los perfiles del usuario (tenant_users activos)
  let profiles: UserProfile[] = []
  if (userId) {
    const db = getSupabaseAdmin()
    const { data } = await db
      .from('tenant_users')
      .select('role, tenant_id, tenants(id, name, slug)')
      .eq('id', userId)
      .eq('is_active', true) as unknown as Promise<{
        data: Array<{
          role: string
          tenant_id: string
          tenants: { id: string; name: string; slug: string } | null
        }> | null
      }>

    profiles = (data ?? [])
      .filter(r => r.tenants !== null)
      .map(r => ({
        tenantId:   r.tenants!.id,
        tenantName: r.tenants!.name,
        tenantSlug: r.tenants!.slug,
        role:       r.role,
      }))
  }

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
