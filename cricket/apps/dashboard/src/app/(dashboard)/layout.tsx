import { auth0 } from '@/lib/auth0'
import { NavSidebar } from './nav-sidebar'

const USER_ROLE_CLAIM = 'https://mycricket.ai/user_role'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth0.getSession()
  const role = (session?.user[USER_ROLE_CLAIM] ?? 'operator') as string
  const name = session?.user.name ?? session?.user.email ?? 'Usuario'

  return (
    <div className="flex min-h-screen bg-gray-50">
      <NavSidebar role={role} userName={name} />
      <main className="flex-1 overflow-y-auto pl-56">
        {/* DEBUG — eliminar después de confirmar el rol */}
        <div style={{ background: '#1e1e1e', color: '#4ec9b0', fontFamily: 'monospace', fontSize: 12, padding: '8px 16px' }}>
          role: <strong>{role}</strong> | claim key: {USER_ROLE_CLAIM} | all claims: {JSON.stringify(session?.user ?? {})}
        </div>
        {children}
      </main>
    </div>
  )
}
