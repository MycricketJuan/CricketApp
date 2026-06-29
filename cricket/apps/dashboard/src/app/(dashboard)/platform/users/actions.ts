'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth0 } from '@/lib/auth0'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { resolveRole } from '@/lib/auth-helpers'
import type { UserRole } from '@cricket/core/types'

async function assertSuperadmin(): Promise<string> {
  const session = await auth0.getSession()
  if (!session) redirect('/auth/login')
  const role = resolveRole(session.user as Record<string, unknown>)
  if (role !== 'superadmin') redirect('/')
  return session.user.sub as string
}

// ─── Asignar usuario a tenant por email ─────────────────────────────────────
// No envía invitación. En el primer login del usuario se crea tenant_users.
export async function assignUserToTenant(formData: FormData): Promise<void> {
  const actorId  = await assertSuperadmin()
  const email    = (formData.get('email') as string ?? '').trim().toLowerCase()
  const tenantId = formData.get('tenant_id') as string
  const role     = (formData.get('role') as UserRole) ?? 'operator'
  const fullName = (formData.get('full_name') as string ?? '').trim() || null

  if (!email || !tenantId) return

  const db = getSupabaseAdmin()

  await db
    .from('user_grants')
    .upsert(
      { email, tenant_id: tenantId, role, full_name: fullName, granted_by: actorId, provisioned: false },
      { onConflict: 'email,tenant_id', ignoreDuplicates: false }
    )

  await db.from('audit_log').insert({
    tenant_id:  tenantId,
    actor_type: 'HUMAN',
    actor_id:   actorId,
    event_type: 'user.grant_created',
    payload:    { email, role },
  })

  revalidatePath('/platform/users')
}

// ─── Crear superadmin ────────────────────────────────────────────────────────
// Registra el email en superadmin_grants; se activa en el primer login.
export async function assignSuperadmin(formData: FormData): Promise<void> {
  const actorId  = await assertSuperadmin()
  const email    = (formData.get('email') as string ?? '').trim().toLowerCase()
  const fullName = (formData.get('full_name') as string ?? '').trim() || null

  if (!email) return

  const db = getSupabaseAdmin()

  await db
    .from('superadmin_grants')
    .upsert(
      { email, full_name: fullName, granted_by: actorId },
      { onConflict: 'email', ignoreDuplicates: true }
    )

  await db.from('audit_log').insert({
    tenant_id:  null as unknown as string,
    actor_type: 'HUMAN',
    actor_id:   actorId,
    event_type: 'superadmin.grant_created',
    payload:    { email },
  })

  revalidatePath('/platform/users')
}

// ─── Eliminar grant de usuario ───────────────────────────────────────────────
export async function removeUserGrant(grantId: string, _formData: FormData): Promise<void> {
  const actorId = await assertSuperadmin()
  const db      = getSupabaseAdmin()

  const { data: grant } = await db
    .from('user_grants')
    .select('tenant_id, email')
    .eq('id', grantId)
    .single() as unknown as { data: { tenant_id: string; email: string } | null }

  if (!grant) return

  await db.from('user_grants').delete().eq('id', grantId)
  await db.from('audit_log').insert({
    tenant_id:  grant.tenant_id,
    actor_type: 'HUMAN',
    actor_id:   actorId,
    event_type: 'user.grant_removed',
    payload:    { email: grant.email },
  })

  revalidatePath('/platform/users')
}

// ─── Cambiar rol de usuario activo ───────────────────────────────────────────
export async function setUserRole(userId: string, formData: FormData): Promise<void> {
  const actorId = await assertSuperadmin()
  const role    = formData.get('role') as UserRole
  const db      = getSupabaseAdmin()

  const { data: user } = await db
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('id', userId)
    .single()

  if (!user) return

  await db.from('tenant_users').update({ role }).eq('id', userId)
  await db.from('audit_log').insert({
    tenant_id:  user.tenant_id,
    actor_type: 'HUMAN',
    actor_id:   actorId,
    event_type: 'user.role_changed',
    payload:    { user_id: userId, from_role: user.role, to_role: role },
  })

  revalidatePath('/platform/users')
}

// ─── Activar / desactivar usuario activo ─────────────────────────────────────
export async function toggleUserActive(userId: string, formData: FormData): Promise<void> {
  const actorId  = await assertSuperadmin()
  const isActive = formData.get('is_active') === 'true'
  const db       = getSupabaseAdmin()

  const { data: user } = await db
    .from('tenant_users')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  if (!user) return

  await db.from('tenant_users').update({ is_active: isActive }).eq('id', userId)
  await db.from('audit_log').insert({
    tenant_id:  user.tenant_id,
    actor_type: 'HUMAN',
    actor_id:   actorId,
    event_type: isActive ? 'user.activated' : 'user.deactivated',
    payload:    { user_id: userId },
  })

  revalidatePath('/platform/users')
}

// ─── Eliminar usuario activo ─────────────────────────────────────────────────
export async function deleteUser(userId: string, _formData: FormData): Promise<void> {
  const actorId = await assertSuperadmin()
  const db      = getSupabaseAdmin()

  const { data: user } = await db
    .from('tenant_users')
    .select('tenant_id, email')
    .eq('id', userId)
    .single()

  if (!user) return

  await db.from('tenant_users').delete().eq('id', userId)
  await db.from('audit_log').insert({
    tenant_id:  user.tenant_id,
    actor_type: 'HUMAN',
    actor_id:   actorId,
    event_type: 'user.deleted',
    payload:    { user_id: userId },
  })

  revalidatePath('/platform/users')
}
