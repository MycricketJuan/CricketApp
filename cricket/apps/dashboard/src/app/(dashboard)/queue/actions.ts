'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { auth0 } from '@/lib/auth0'

export async function takeControl(sessionId: string): Promise<void> {
  const db = getSupabaseAdmin()
  const session = await auth0.getSession()
  const userId = session?.user.sub ?? 'unknown'

  await db
    .from('sessions')
    .update({
      actor_control: 'HUMAN',
      assigned_operator: userId,
      status: 'human_takeover',
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  await db.from('audit_log').insert({
    session_id: sessionId,
    actor_type: 'HUMAN',
    actor_id: userId,
    event_type: 'session.control_transferred',
    payload: { from: 'AI', to: 'HUMAN', triggered_by: 'operator_queue' },
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
