/**
 * Cricket Dashboard — Middleware
 *
 * Responsabilidades:
 * 1. Resolver el tenant a partir del subdominio
 * 2. Propagar el slug via header x-tenant-slug a Server Components
 * 3. Gestionar sesión Auth0 en cada request (rolling sessions)
 * 4. Proteger rutas autenticadas
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth0 } from './src/lib/auth0'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. Resolver tenant desde subdominio ──────────────────
  const tenantSlug = extractTenantSlug(request.headers.get('host') ?? '')

  // ── 2. Auth0 gestiona las rutas /auth/* + refresca sesión
  // Siempre correr para que las rolling sessions funcionen en todas las rutas
  const authResponse = await auth0.middleware(request)
  authResponse.headers.set('x-tenant-slug', tenantSlug)

  // Las rutas /auth/* son manejadas exclusivamente por Auth0
  if (pathname.startsWith('/auth/')) {
    return authResponse
  }

  // ── 3. Proteger rutas autenticadas ───────────────────────
  const isPublicRoute = pathname.startsWith('/api/webhook') || pathname === '/health'
  const isLoginRoute = pathname === '/login'

  if (!isPublicRoute) {
    const session = await auth0.getSession(request)

    if (!session && !isLoginRoute) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    if (session && isLoginRoute) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return authResponse
}

/**
 * Extrae el slug del tenant desde el host header.
 *
 * banco.mycricket.ai  → 'banco'
 * app.mycricket.ai    → 'app'   (platform admin)
 * localhost:3000      → process.env.DEV_TENANT_SLUG ?? 'dev'
 */
function extractTenantSlug(host: string): string {
  if (host.includes('localhost') || host.match(/^\d+\.\d+\.\d+\.\d+/)) {
    return process.env.DEV_TENANT_SLUG ?? 'dev'
  }
  const subdomain = host.split('.')[0]
  return subdomain ?? 'app'
}

export const config = {
  matcher: [
    // Excluir archivos estáticos y rutas internas de Next.js
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
