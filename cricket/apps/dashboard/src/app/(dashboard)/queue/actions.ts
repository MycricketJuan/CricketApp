'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@cricket/core/supabase/admin'
import { auth0 } from '@/lib/auth0'

// ── takeControl ──────────────────────────────────────────────────
// Toma el control de una sesión en nombre del operador autenticado.
// Registra la transferencia en audit_log (requerido para cumplimiento bancario).

export async function takeControl(sessionId: string): Promise<void> {
  const session = await auth0.getSession()
  const userId = session?.user.sub ?? 'unknown'

  await supabaseAdmin
    .from('sessions')
    .update({
      actor_control: 'HUMAN',
      assigned_operator: userId,
      status: 'human_takeover',
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  await supabaseAdmin.from('audit_log').insert({
    session_id: sessionId,
    actor_type: 'HUMAN',
    actor_id: userId,
    event_type: 'session.control_transferred',
    payload: { from: 'AI', to: 'HUMAN', triggered_by: 'operator_queue' },
  })

  revalidatePath('/queue')
}

// ── resolveCheckpoint ────────────────────────────────────────────
// Resuelve un cognitive_checkpoint como aprobado o con override.
// Si no quedan checkpoints pendientes en la sesión, devuelve el control a la IA.

export async function resolveCheckpoint(formData: FormData): Promise<void> {
  const checkpointId  = formData.get('checkpointId') as string
  const sessionId     = formData.get('session_id') as string
  const ihDecision    = formData.get('ih_decision') as string
  const rawOverride   = formData.get('ih_override_reason') as string | null
  const overrideReason = rawOverride?.trim() || null
  const hasOverride   = Boolean(overrideReason)

  await supabaseAdmin
    .from('cognitive_checkpoints')
    .update({
      status: hasOverride ? 'overridden' : 'approved',
      ih_decision: ihDecision,
      ih_override_reason: overrideReason,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', checkpointId)

  // Si no quedan checkpoints pendientes, devolver control a IA
  const { count } = await supabaseAdmin
    .from('cognitive_checkpoints')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('status', 'pending')

  if (count === 0) {
    await supabaseAdmin
      .from('sessions')
      .update({ actor_control: 'AI' })
      .eq('id', sessionId)
  }

  revalidatePath('/queue')
}

// ── returnToAI ───────────────────────────────────────────────────
// Devuelve el control de la sesión a la IA y cierra la escalación.

export async function returnToAI(
  sessionId: string,
  escalationId: string,
): Promise<void> {
  await Promise.all([
    supabaseAdmin
      .from('sessions')
      .update({
        actor_control: 'AI',
        assigned_operator: null,
        status: 'active',
      })
      .eq('id', sessionId),

    supabaseAdmin
      .from('escalations')
      .update({
        outcome: 'returned_to_ai',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', escalationId),
  ])

  revalidatePath('/queue')
}
