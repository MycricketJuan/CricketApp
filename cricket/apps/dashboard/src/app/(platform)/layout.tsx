export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getAuth0 } from '@/lib/auth0'
import { resolveRole } from '@/lib/auth-helpers'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuth0().getSession()
  if (!session) redirect('/auth/login')

  const role = resolveRole(session.user as Record<string, unknown>)
  if (role !== 'superadmin') redirect('/')

  return <>{children}</>
}
