import Anthropic from '@anthropic-ai/sdk'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { HANDOFF_SYSTEM_PROMPT } from './prompt'

// ── Handoff Agent ─────────────────────────────────────────────
// A diferencia de los demás agentes, NO responde al cliente:
// corre asíncrono después de que el Journey Engine crea una
// escalada o un cognitive_checkpoint, y su briefing va al
// OPERADOR (escalations.context_summary / checkpoints.ai_recommendation).
// El caller NO debe awaitar — es fire-and-forget, nunca lanza.

export interface HandoffInput {
  escalationId?: string
  checkpointId?: string
  sessionId: string
  tenantId: string
  triggerReason: string // 'low_confidence' | 'customer_sentiment' | 'policy' | etc.
  confidenceAtTrigger?: number
  customerSentiment?: string
  supabaseUrl: string
  supabaseKey: string
}

export interface HandoffSummary {
  customer_name: string | null
  customer_contact: string | null
  journey_stage: string | null
  escalation_reason: string
  sentiment: string
  urgency: 'low' | 'medium' | 'high'
  what_client_wants: string
  what_ai_did: string[]
  why_escalated: string
  recommended_action: string
  key_data: Record<string, string>
  recent_turns: Array<{ role: 'cliente' | 'ia'; content: string }>
}

// ── Filas leídas de Supabase (cliente sin tipos generados) ────

interface SessionRow {
  id: string
  current_stage: string | null
  channel: string
  started_at: string
  end_users: {
    id: string
    channel_ids: Record<string, string>
    profile: Record<string, unknown> | null
  }
}

interface InteractionRow {
  actor_type: 'AI' | 'HUMAN' | 'SYSTEM'
  content: string
  stage: string | null
  created_at: string
}

interface DecisionRow {
  agent_type: string
  confidence: number | null
  reasoning: string | null
  action_taken: string | null
}

export async function generateHandoffSummary(
  input: HandoffInput,
  anthropicApiKey: string,
): Promise<void> {
  const supabase = createClient(input.supabaseUrl, input.supabaseKey)

  try {
    // ── 1. Cargar contexto de la sesión ───────────────────────
    const [sessionRes, interactionsRes, decisionRes] = await Promise.all([
      supabase
        .from('sessions')
        .select(`
          id, current_stage, channel, started_at,
          end_users!inner(id, channel_ids, profile)
        `)
        .eq('id', input.sessionId)
        .single(),
      supabase
        .from('interactions')
        .select('actor_type, content, stage, created_at')
        .eq('session_id', input.sessionId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('ai_decisions')
        .select('agent_type, confidence, reasoning, action_taken, interactions!inner(session_id)')
        .eq('interactions.session_id', input.sessionId)
        .order('created_at', { ascending: false })
        .limit(1),
    ])

    if (sessionRes.error || !sessionRes.data) {
      throw new Error(`Session not found: ${input.sessionId} (${sessionRes.error?.message})`)
    }

    const session = sessionRes.data as unknown as SessionRow
    const interactions = (interactionsRes.data ?? []) as unknown as InteractionRow[]
    const lastDecision = (decisionRes.data?.[0] ?? null) as DecisionRow | null

    // ── 2. Construir el mensaje de contexto para Claude ───────
    const profile = (session.end_users.profile ?? {}) as Record<string, unknown>
    const customerName = (profile.name ?? profile.nombre ?? null) as string | null
    const channelIds = session.end_users.channel_ids ?? {}
    const contactInfo = channelIds.whatsapp ?? channelIds.email ?? session.end_users.id

    const chronological = [...interactions].reverse()
    const historyText = chronological
      .map((i) => {
        const role = i.actor_type === 'AI' ? 'IA' : i.actor_type === 'HUMAN' ? 'Operador' : 'Cliente'
        return `[${role}]: ${i.content.slice(0, 300)}`
      })
      .join('\n')

    const contextMessage = `
INFORMACIÓN DE LA SESIÓN:
- Cliente: ${customerName ?? 'Desconocido'}
- Contacto: ${contactInfo}
- Canal: ${session.channel}
- Etapa actual: ${session.current_stage ?? 'inicio'}
- Inicio de sesión: ${session.started_at}

RAZÓN DE ESCALADA: ${input.triggerReason}
${input.confidenceAtTrigger != null ? `Confianza al escalar: ${input.confidenceAtTrigger}` : ''}
${input.customerSentiment ? `Sentimiento detectado: ${input.customerSentiment}` : ''}
${lastDecision ? `Último agente: ${lastDecision.agent_type} | Acción: ${lastDecision.action_taken ?? 'ninguna'}` : ''}

CONVERSACIÓN COMPLETA (${chronological.length} turnos):
${historyText}

Genera el briefing para el operador.
`

    // ── 3. Llamar a Claude (haiku: rápido y barato) ───────────
    const client = new Anthropic({ apiKey: anthropicApiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: HANDOFF_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: contextMessage }],
    })

    const rawText = (response.content[0] as { type: 'text'; text: string }).text

    // ── 4. Parsear — si el JSON es inválido, seguir sin summary ─
    let summary: HandoffSummary | null = null
    try {
      const start = rawText.indexOf('{')
      const end = rawText.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error('no JSON in response')
      summary = JSON.parse(rawText.slice(start, end + 1)) as HandoffSummary
    } catch {
      summary = null
    }

    // ── 5. Persistir briefing legible + JSON estructurado ─────
    const contextSummary = summary
      ? [
          `👤 ${summary.customer_name ?? 'Cliente'} · ${summary.customer_contact ?? contactInfo}`,
          `🎯 ${summary.what_client_wants}`,
          `⚠️ ${summary.why_escalated}`,
          `✅ ${summary.recommended_action}`,
        ].join('\n')
      : `Escalada por: ${input.triggerReason}. Ver conversación completa.`

    await persistSummary(supabase, input, contextSummary, summary)

    // ── 6. Urgencia alta → evento en audit_log (Realtime) ─────
    if (summary?.urgency === 'high') {
      await supabase.from('audit_log').insert({
        tenant_id: input.tenantId,
        session_id: input.sessionId,
        actor_type: 'SYSTEM',
        event_type: 'escalation.high_urgency',
        payload: {
          escalation_id: input.escalationId ?? null,
          checkpoint_id: input.checkpointId ?? null,
          customer_name: summary.customer_name,
          recommended_action: summary.recommended_action,
        },
      })
    }
  } catch (error: unknown) {
    // El handoff es opcional: nunca propagar — el operador siempre
    // tiene la conversación completa como respaldo.
    console.error('[HandoffAgent]', error)
    try {
      await persistSummary(
        supabase,
        input,
        `Escalada manual requerida. Razón: ${input.triggerReason}.`,
        null,
      )
    } catch (persistError: unknown) {
      console.error('[HandoffAgent] No se pudo persistir el fallback:', persistError)
    }
  }
}

// ── Persistencia ──────────────────────────────────────────────

async function persistSummary(
  supabase: SupabaseClient,
  input: HandoffInput,
  contextSummary: string,
  summary: HandoffSummary | null,
): Promise<void> {
  if (input.escalationId) {
    await supabase
      .from('escalations')
      .update({
        context_summary: contextSummary,
        metadata: summary ? { briefing: summary } : {},
      })
      .eq('id', input.escalationId)
  }

  if (input.checkpointId) {
    // Preservar el draft original de la IA antes de sobrescribirlo
    const { data: existing } = await supabase
      .from('cognitive_checkpoints')
      .select('ai_recommendation')
      .eq('id', input.checkpointId)
      .single()

    const metadata: Record<string, unknown> = {}
    if (summary) metadata.briefing = summary
    const original = (existing as { ai_recommendation: string | null } | null)?.ai_recommendation
    if (original) metadata.original_recommendation = original

    await supabase
      .from('cognitive_checkpoints')
      .update({
        ai_recommendation: contextSummary,
        metadata,
      })
      .eq('id', input.checkpointId)
  }
}
