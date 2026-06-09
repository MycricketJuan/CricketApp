import { redirect } from 'next/navigation'
import { auth0 } from '@/lib/auth0'

const ROLE_REDIRECT: Record<string, string> = {
  operator:     '/queue',
  supervisor:   '/dashboard',
  tenant_admin: '/admin',
  superadmin:   '/platform',
}

const USER_ROLE_CLAIM = 'https://mycricket.ai/user_role'

export default async function AfterLoginPage() {
  const session = await auth0.getSession()
  if (!session) redirect('/login')

  const role = (session.user[USER_ROLE_CLAIM] ?? 'operator') as string
  redirect(ROLE_REDIRECT[role] ?? '/dashboard')
}
