'use server'

import { redirect } from 'next/navigation'
import { auth0 } from '@/lib/auth0'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import type { UserRole } from '@cricket/core/types'

const USER_ROLE_CLAIM = 'https://mycricket.ai/user_role'

async function assertSuperadmin(): Promise<string> {
  const session = await auth0.getSession()
  if (!session) redirect('/auth/login')
  const role = (session.user[USER_ROLE_CLAIM] ?? '') as string
  if (role !== 'superadmin') redirect('/')
  return session.user.sub as string
}

// Cambiar rol — se usa con .bind(null, userId) como action del form
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
}

// Activar / desactivar — se usa con .bind(null, userId) como action del form
// El form pasa is_active como hidden input ('true'/'false')
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
}

// Eliminar usuario de un tenant — se usa con .bind(null, userId)
export async function deleteUser(userId: string, _formData: FormData): Promise<void> {
  const actorId = await assertSuperadmin()
  const db      = getSupabaseAdmin()

  const { data: user } = await db
    .from('tenant_users')
    .select('tenant_id, full_name')
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
}

// Revocar invitación — se usa con .bind(null, invitationId)
export async function revokeInvitation(invitationId: string, _formData: FormData): Promise<void> {
  const actorId = await assertSuperadmin()
  const db      = getSupabaseAdmin()

  const { data: inv } = await db
    .from('tenant_invitations')
    .select('tenant_id, email')
    .eq('id', invitationId)
    .single()

  if (!inv) return

  await db
    .from('tenant_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)

  await db.from('audit_log').insert({
    tenant_id:  inv.tenant_id,
    actor_type: 'HUMAN',
    actor_id:   actorId,
    event_type: 'invitation.revoked',
    payload:    { invitation_id: invitationId, email: inv.email },
  })
}

// Invitar usuario a un tenant — form directo
export async function inviteUser(formData: FormData): Promise<void> {
  const actorId  = await assertSuperadmin()
  const email    = (formData.get('email') as string ?? '').trim().toLowerCase()
  const tenantId = formData.get('tenant_id') as string
  const role     = (formData.get('role') as UserRole) ?? 'operator'

  if (!email || !tenantId) return

  const db = getSupabaseAdmin()

  // Upsert: si ya existe una invitación revocada/expirada, la renueva
  await db
    .from('tenant_invitations')
    .upsert(
      {
        tenant_id:  tenantId,
        email,
        role,
        status:     'pending',
        invited_by: null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'tenant_id,email', ignoreDuplicates: false }
    )

  await db.from('audit_log').insert({
    tenant_id:  tenantId,
    actor_type: 'HUMAN',
    actor_id:   actorId,
    event_type: 'invitation.created',
    payload:    { email, role },
  })
}
