import { headers } from 'next/headers'
import { LoginForm } from './login-form'

export default async function LoginPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'app'
  return <LoginForm tenantSlug={tenantSlug} />
}
