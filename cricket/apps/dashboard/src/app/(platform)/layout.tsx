import { redirect } from 'next/navigation'
import { auth0 } from '@/lib/auth0'

const USER_ROLE_CLAIM = 'https://mycricket.ai/user_role'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth0.getSession()
  if (!session) redirect('/auth/login')

  const role = (session.user[USER_ROLE_CLAIM] ?? '') as string
  if (role !== 'superadmin') redirect('/')

  return <>{children}</>
}
