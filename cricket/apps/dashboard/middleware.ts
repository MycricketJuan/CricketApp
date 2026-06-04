/**
 * Cricket Dashboard — Middleware
 *
 * Responsabilidades:
 * 1. Resolver el tenant a partir del subdominio
 * 2. Propagar el slug via header x-tenant-slug a Server Components
 * 3. Refrescar la sesión de Supabase Auth en cada request
 * 4. Proteger rutas autenticadas
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  // ── 1. Resolver tenant desde subdominio ──────────────────
  const host = request.headers.get('host') ?? ''
  const tenantSlug = extractTenantSlug(host)
  response.headers.set('x-tenant-slug', tenantSlug)

  // ── 2. Crear cliente Supabase y refrescar sesión ─────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          response.headers.set('x-tenant-slug', tenantSlug)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() verifica el JWT contra Supabase Auth (no solo decodifica)
  const { data: { user } } = await supabase.auth.getUser()

  // ── 3. Proteger rutas autenticadas ───────────────────────
  const { pathname } = request.nextUrl

  const isAuthRoute = pathname.startsWith('/login') ||
                      pathname.startsWith('/invite')
  const isPublicRoute = pathname.startsWith('/api/webhook') ||
                        pathname === '/health'

  if (!user && !isAuthRoute && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Usuario ya autenticado intentando ir a /login → redirigir al dashboard
  if (user && isAuthRoute && !pathname.startsWith('/invite')) {
    const dashUrl = request.nextUrl.clone()
    dashUrl.pathname = '/'
    return NextResponse.redirect(dashUrl)
  }

  return response
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
