import { redirect } from 'next/navigation'
import { auth0 } from '@/lib/auth0'
import { resolveRole } from '@/lib/auth-helpers'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'

const ROLE_REDIRECT: Record<string, string> = {
  operator:     '/queue',
  supervisor:   '/dashboard',
  tenant_admin: '/admin',
  superadmin:   '/platform',
}

export default async function AfterLoginPage() {
  const session = await auth0.getSession()
  if (!session) redirect('/login')

  const sub   = session.user.sub as string
  const email = (session.user.email as string ?? '').toLowerCase()
  const name  = session.user.name as string | undefined

  const db = getSupabaseAdmin()

  // ── Provisionar superadmin_grants pendientes ──────────────────────────────
  const { data: superGrant } = await db
    .from('superadmin_grants')
    .select('id, full_name')
    .eq('email', email)
    .eq('provisioned', false)
    .maybeSingle() as unknown as { data: { id: string; full_name: string | null } | null }

  if (superGrant) {
    await db.from('superadmins').upsert(
      { id: sub, email, full_name: superGrant.full_name ?? name ?? null },
      { onConflict: 'email', ignoreDuplicates: false }
    )
    await db.from('superadmin_grants').update({ provisioned: true }).eq('id', superGrant.id)
  }

  // ── Provisionar user_grants pendientes ────────────────────────────────────
  const { data: grants } = await db
    .from('user_grants')
    .select('id, tenant_id, role, full_name')
    .eq('email', email)
    .eq('provisioned', false) as unknown as {
      data: Array<{ id: string; tenant_id: string; role: string; full_name: string | null }> | null
    }

  if (grants && grants.length > 0) {
    for (const g of grants) {
      await db.from('tenant_users').upsert(
        {
          auth0_sub: sub,
          email,
          tenant_id: g.tenant_id,
          role:      g.role as never,
          full_name: g.full_name ?? name ?? null,
          is_active: true,
        },
        { onConflict: 'auth0_sub,tenant_id', ignoreDuplicates: false }
      )
      await db.from('user_grants').update({ provisioned: true }).eq('id', g.id)
    }
  }

  // ── Determinar rol y redirigir ────────────────────────────────────────────
  const role = resolveRole(session.user as Record<string, unknown>)

  // Si el claim no tiene rol pero ya tenemos tenant_users, inferir el rol más alto
  let effectiveRole = role
  if (effectiveRole === 'operator' && email) {
    const { data: userRow } = await db
      .from('tenant_users')
      .select('role')
      .eq('email', email)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as unknown as { data: { role: string } | null }

    if (userRow) effectiveRole = userRow.role
  }

  redirect(ROLE_REDIRECT[effectiveRole] ?? '/dashboard')
}
