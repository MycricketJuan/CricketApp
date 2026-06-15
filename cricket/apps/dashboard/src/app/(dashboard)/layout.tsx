import { auth0 } from '@/lib/auth0'
import { resolveRole } from '@/lib/auth-helpers'
import { NavSidebar } from './nav-sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth0.getSession()
  const role = resolveRole((session?.user ?? {}) as Record<string, unknown>)
  const name = session?.user.name ?? session?.user.email ?? 'Usuario'

  return (
    <div className="flex min-h-screen bg-gray-50">
      <NavSidebar role={role} userName={name} />
      <main className="flex-1 overflow-y-auto pl-56">
        {children}
      </main>
    </div>
  )
}
