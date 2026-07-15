'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { getAuth0 } from '@/lib/auth0'

export async function takeControl(sessionId: string): Promise<void> {
  const db = getSupabaseAdmin()
  const authSession = await getAuth0().getSession()
  const actorSub = authSession?.user.sub ?? null
  const actorEmail = (authSession?.user.email as string | undefined)?.toLowerCase() ?? null

  // sessions.assigned_operator y audit_log.actor_id son UUID (FK a
  // tenant_users) — el sub de Auth0 no es un UUID y rompería el UPDATE
  // completo. Se resuelve el tenant_user del operador; si no existe,
  // el control pasa a HUMAN igual pero sin asignación.
  const { data: chatSession } = await db
    .from('sessions')
    .select('tenant_id')
    .eq('id', sessionId)
    .single()

  // auth0_sub/email no están en los tipos generados de tenant_users
  // hasta regenerar con pnpm db:types (mismo cast que usa el layout)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  let operatorId: string | null = null
  if (chatSession && actorSub) {
    const { data: bySub } = (await dbAny
      .from('tenant_users')
      .select('id')
      .eq('tenant_id', chatSession.tenant_id)
      .eq('auth0_sub', actorSub)
      .maybeSingle()) as { data: { id: string } | null }
    operatorId = bySub?.id ?? null
  }
  if (chatSession && !operatorId && actorEmail) {
    const { data: byEmail } = (await dbAny
      .from('tenant_users')
      .select('id')
      .eq('tenant_id', chatSession.tenant_id)
      .eq('email', actorEmail)
      .maybeSingle()) as { data: { id: string } | null }
    operatorId = byEmail?.id ?? null
  }

  await db
    .from('sessions')
    .update({
      actor_control: 'HUMAN',
      assigned_operator: operatorId,
      status: 'human_takeover',
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  await db.from('audit_log').insert({
    tenant_id: chatSession?.tenant_id ?? null,
    session_id: sessionId,
    actor_type: 'HUMAN',
    actor_id: operatorId,
    event_type: 'session.control_transferred',
    payload: {
      from: 'AI',
      to: 'HUMAN',
      triggered_by: 'operator_queue',
      actor_sub: actorSub ?? 'unknown',
    },
  })

  revalidatePath('/queue')
}

export async function resolveCheckpoint(formData: FormData): Promise<void> {
  const db = getSupabaseAdmin()
  const checkpointId   = formData.get('checkpointId') as string
  const sessionId      = formData.get('session_id') as string
  const ihDecision     = formData.get('ih_decision') as string
  const rawOverride    = formData.get('ih_override_reason') as string | null
  const overrideReason = rawOverride?.trim() || null
  const hasOverride    = Boolean(overrideReason)

  await db
    .from('cognitive_checkpoints')
    .update({
      status: hasOverride ? 'overridden' : 'approved',
      ih_decision: ihDecision,
      ih_override_reason: overrideReason,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', checkpointId)

  const { count } = await db
    .from('cognitive_checkpoints')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('status', 'pending')

  if (count === 0) {
    await db
      .from('sessions')
      .update({ actor_control: 'AI' })
      .eq('id', sessionId)
  }

  revalidatePath('/queue')
}

export async function returnToAI(
  sessionId: string,
  escalationId: string,
): Promise<void> {
  const db = getSupabaseAdmin()

  await Promise.all([
    db
      .from('sessions')
      .update({
        actor_control: 'AI',
        assigned_operator: null,
        status: 'active',
      })
      .eq('id', sessionId),

    db
      .from('escalations')
      .update({
        outcome: 'returned_to_ai',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', escalationId),
  ])

  revalidatePath('/queue')
}
