/**
 * Resuelve el rol del usuario desde el JWT claim de Auth0.
 * Fallback: lista de subs hardcodeados como superadmin mientras
 * se resuelve la propagación del claim en Auth0.
 */

const USER_ROLE_CLAIM = 'https://mycricket.ai/user_role'

const SUPERADMIN_SUBS = new Set([
  'google-oauth2|100286695213510962412',
])

export function resolveRole(user: Record<string, unknown>): string {
  const claimRole = user[USER_ROLE_CLAIM] as string | undefined
  if (claimRole) return claimRole

  const sub = user.sub as string | undefined
  if (sub && SUPERADMIN_SUBS.has(sub)) return 'superadmin'

  return 'operator'
}
