import { NextRequest, NextResponse } from 'next/server'
import { getAuth0 } from '@/lib/auth0'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { provisionTenant, TenantProvisioningError } from '@/lib/tenants/provision'
import { parseRegistrationDraft, REGISTRATION_DRAFT_COOKIE } from '@/lib/registration/draft'

function registerError(request: NextRequest, message: string): NextResponse {
  const url = new URL('/register', request.url)
  url.searchParams.set('error', message)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getAuth0().getSession(request)
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login?returnTo=/register/complete', request.url))
  }

  if (session.user.email_verified !== true) {
    return NextResponse.redirect(new URL('/register/verify', request.url))
  }

  const draft = parseRegistrationDraft(request.cookies.get(REGISTRATION_DRAFT_COOKIE)?.value)
  if (!draft) {
    return registerError(request, 'El registro expiró. Completa nuevamente los datos de tu empresa.')
  }

  const auth0Sub = String(session.user.sub ?? '')
  const email = String(session.user.email ?? '').trim().toLowerCase()
  const fullName = typeof session.user.name === 'string' ? session.user.name : null
  if (!auth0Sub || !email) {
    return registerError(request, 'Auth0 no devolvió una identidad con correo válido.')
  }

  const db = getSupabaseAdmin()
  let { data: existingOwner, error: ownerLookupError } = await db
    .from('tenant_users')
    .select('tenant_id, tenants!inner(slug)')
    .eq('auth0_sub', auth0Sub)
    .eq('role', 'tenant_admin')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (ownerLookupError) {
    return registerError(request, 'No fue posible comprobar tus empresas existentes.')
  }

  if (!existingOwner) {
    const { data: ownerByEmail, error: emailLookupError } = await db
      .from('tenant_users')
      .select('tenant_id, tenants!inner(slug)')
      .eq('email', email)
      .eq('role', 'tenant_admin')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (emailLookupError) {
      return registerError(request, 'No fue posible comprobar tus empresas existentes.')
    }

    if (ownerByEmail) {
      const { error: bindError } = await db
        .from('tenant_users')
        .update({ auth0_sub: auth0Sub })
        .eq('tenant_id', ownerByEmail.tenant_id)
        .eq('email', email)

      if (bindError) {
        return registerError(request, 'No fue posible vincular tu identidad con la empresa existente.')
      }
      existingOwner = ownerByEmail
    }
  }

  let tenantSlug = existingOwner?.tenants.slug ?? draft.slug

  if (!existingOwner) {
    try {
      const tenant = await provisionTenant({
        name: draft.companyName,
        slug: draft.slug,
        sector: draft.sector,
        actorSub: auth0Sub,
        owner: { auth0Sub, email, fullName },
      })
      tenantSlug = tenant.slug
    } catch (error) {
      const message = error instanceof TenantProvisioningError
        ? error.message
        : 'No fue posible crear el espacio de la empresa.'
      return registerError(request, message)
    }
  }

  const response = NextResponse.redirect(new URL('/setup', request.url))
  response.cookies.delete(REGISTRATION_DRAFT_COOKIE)
  response.cookies.set('cricket_active_tenant', tenantSlug, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}
