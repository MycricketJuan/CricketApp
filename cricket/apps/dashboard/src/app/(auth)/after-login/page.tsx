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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = getSupabaseAdmin()

  // ── Provisionar superadmin_grants pendientes ──────────────────────────────
  const { data: superGrant } = (await db
    .from('superadmin_grants')
    .select('id, full_name')
    .eq('email', email)
    .eq('provisioned', false)
    .maybeSingle()) as { data: { id: string; full_name: string | null } | null }

  if (superGrant) {
    await db.from('superadmins')
      .upsert(
        { id: sub, email, full_name: superGrant.full_name ?? name ?? null },
        { onConflict: 'email', ignoreDuplicates: false }
      )
    await db.from('superadmin_grants').update({ provisioned: true }).eq('id', superGrant.id)
  }

  // ── Provisionar user_grants pendientes ────────────────────────────────────
  const { data: grants } = (await db
    .from('user_grants')
    .select('id, tenant_id, role, full_name')
    .eq('email', email)
    .eq('provisioned', false)) as {
      data: Array<{ id: string; tenant_id: string; role: string; full_name: string | null }> | null
    }

  if (grants && grants.length > 0) {
    for (const g of grants) {
      // Buscar fila existente por auth0_sub o email (dos queries para evitar | en filtros OR)
      let existing: { id: string } | null = null

      const { data: bySub } = (await db
        .from('tenant_users')
        .select('id')
        .eq('tenant_id', g.tenant_id)
        .eq('auth0_sub', sub)
        .maybeSingle()) as { data: { id: string } | null }

      if (bySub) {
        existing = bySub
      } else if (email) {
        const { data: byEmail } = (await db
          .from('tenant_users')
          .select('id')
          .eq('tenant_id', g.tenant_id)
          .eq('email', email)
          .maybeSingle()) as { data: { id: string } | null }
        existing = byEmail
      }

      if (existing) {
        const { error } = await db
          .from('tenant_users')
          .update({ auth0_sub: sub, email, role: g.role, is_active: true })
          .eq('id', existing.id)
        if (!error) {
          await db.from('user_grants').update({ provisioned: true }).eq('id', g.id)
        }
      } else {
        const { error } = await db
          .from('tenant_users')
          .insert({
            auth0_sub: sub,
            email,
            tenant_id: g.tenant_id,
            role:      g.role,
            full_name: g.full_name ?? name ?? null,
            is_active: true,
          })
        if (!error) {
          await db.from('user_grants').update({ provisioned: true }).eq('id', g.id)
        }
      }
    }
  }

  // ── Determinar rol y redirigir ────────────────────────────────────────────
  const jwtRole = resolveRole(session.user as Record<string, unknown>)

  let effectiveRole = jwtRole
  if (effectiveRole === 'operator') {
    // Buscar el rol más alto del usuario en tenant_users
    let userRow: { role: string } | null = null

    if (sub) {
      const { data } = (await db
        .from('tenant_users')
        .select('role')
        .eq('auth0_sub', sub)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()) as { data: { role: string } | null }
      userRow = data
    }

    if (!userRow && email) {
      const { data } = (await db
        .from('tenant_users')
        .select('role')
        .eq('email', email)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()) as { data: { role: string } | null }
      userRow = data
    }

    if (userRow) effectiveRole = userRow.role
  }

  redirect(ROLE_REDIRECT[effectiveRole] ?? '/dashboard')
}
