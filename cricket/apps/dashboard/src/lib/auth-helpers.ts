/**
 * Resuelve el rol del usuario desde el JWT claim de Auth0.
 * Fallback: lista de subs hardcodeados como superadmin mientras
 * se resuelve la propagación del claim en Auth0.
 */

const USER_ROLE_CLAIM = 'https://mycricket.ai/user_role'

// Fallback mientras los claims de Auth0 no están configurados.
// Agregar aquí el sub o email de cualquier superadmin adicional.
const SUPERADMIN_SUBS = new Set([
  'google-oauth2|100286695213510962412',
])

const SUPERADMIN_EMAILS = new Set([
  'juandavid.franco@mycricket.ai',
])

export function resolveRole(user: Record<string, unknown>): string {
  const claimRole = user[USER_ROLE_CLAIM] as string | undefined
  if (claimRole) return claimRole

  const sub   = user.sub as string | undefined
  const email = (user.email as string | undefined ?? '').toLowerCase()

  if (sub && SUPERADMIN_SUBS.has(sub)) return 'superadmin'
  if (email && SUPERADMIN_EMAILS.has(email)) return 'superadmin'

  return 'operator'
}
