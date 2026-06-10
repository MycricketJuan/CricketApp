import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth0 } from './src/lib/auth0'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. Auth0 gestiona las rutas /auth/* + refresca rolling sessions ──
  // Debe correr en TODAS las rutas para que las rolling sessions funcionen.
  let authResponse: NextResponse
  try {
    authResponse = await auth0.middleware(request)
  } catch (err) {
    // Auth0 env vars no configuradas — devolver error explícito en vez de 404 silencioso
    const message = err instanceof Error ? err.message : 'Auth0 misconfigured'
    return new NextResponse(`Auth0 configuration error: ${message}`, { status: 500 })
  }

  // Las rutas /auth/* (login, callback, logout) son manejadas exclusivamente por Auth0
  if (pathname.startsWith('/auth/')) {
    return authResponse
  }

  // ── 2. Resolver tenant y propagar como REQUEST header ────────────────
  // IMPORTANTE: usar NextResponse.next({ request: { headers } }) para que
  // Server Components puedan leerlo con headers() de next/headers.
  // authResponse.headers.set() solo fija headers de respuesta HTTP (no llegan al Server Component).
  const tenantSlug = extractTenantSlug(request.headers.get('host') ?? '')
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-slug', tenantSlug)

  // ── 3. Proteger rutas autenticadas ───────────────────────────────────
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

  // ── 4. Construir respuesta con header de tenant en el request ────────
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Propagar las cookies de sesión que Auth0 pudo haber actualizado (rolling sessions)
  authResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie)
  })

  return response
}

/**
 * Extrae el slug del tenant desde el host header.
 *
 * banco.mycricket.ai   → 'banco'
 * localhost:3000       → process.env.DEV_TENANT_SLUG ?? 'dev'
 * *.vercel.app         → process.env.DEV_TENANT_SLUG ?? 'dev'
 */
function extractTenantSlug(host: string): string {
  // Entornos locales y previews de Vercel usan la variable de entorno
  if (
    host.includes('localhost') ||
    host.match(/^\d+\.\d+\.\d+\.\d+/) ||
    host.endsWith('.vercel.app')
  ) {
    return process.env.DEV_TENANT_SLUG ?? 'dev'
  }
  const subdomain = host.split('.')[0]
  return subdomain ?? 'dev'
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
