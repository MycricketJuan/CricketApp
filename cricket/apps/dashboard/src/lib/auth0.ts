import { Auth0Client } from '@auth0/nextjs-auth0/server'

let _auth0: Auth0Client | undefined

export function getAuth0(): Auth0Client {
  if (!_auth0) {
    _auth0 = new Auth0Client({ signInReturnToPath: '/after-login' })
  }
  return _auth0
}
