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

export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  const actorId = await assertSuperadmin()
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

export async function toggleUserActive(userId: string, isActive: boolean): Promise<void> {
  const actorId = await assertSuperadmin()
  const db      = getSupabaseAdmin()

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

export async function revokeInvitation(invitationId: string): Promise<void> {
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
