import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { JourneyEngine } from '@cricket/core/journey-engine'
import { AgentRegistry } from '@cricket/agents/registry'
import { generateHandoffSummary } from '@cricket/agents/handoff'
import type { ChannelMessage, IHPolicy } from '@cricket/core/types'

interface ClaudeConfig {
  model: string
  max_tokens: number
}

export async function handleWhatsAppMessage(
  senderId: string,
  messageText: string,
  tenantSlug: string,
): Promise<string | null> {

  // ── 1. Buscar tenant activo por slug ──────────────────────
  const supabaseAdmin = getSupabaseAdmin()
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('id, slug, ih_policies, claude_config, is_active')
    .eq('slug', tenantSlug)
    .eq('is_active', true)
    .single()

  if (tenantError || !tenant) {
    throw Object.assign(new Error(`Tenant not found: ${tenantSlug}`), { statusCode: 404 })
  }

  const ihPolicies = tenant.ih_policies as unknown as IHPolicy
  const claudeConfig = tenant.claude_config as unknown as ClaudeConfig

  // ── 2. Buscar o crear end_user por número de WhatsApp ─────
  let { data: endUser } = await supabaseAdmin
    .from('end_users')
    .select('id')
    .eq('tenant_id', tenant.id)
    .filter('channel_ids->>whatsapp', 'eq', senderId)
    .maybeSingle()

  if (!endUser) {
    const { data: created } = await supabaseAdmin
      .from('end_users')
      .insert({
        tenant_id: tenant.id,
        channel_ids: { whatsapp: senderId },
        consent_given: false,
      })
      .select('id')
      .single()
    endUser = created
  }

  if (!endUser) throw new Error('Failed to find or create end_user')

  // ── 3. Buscar o crear sesión activa ───────────────────────
  let { data: session } = await supabaseAdmin
    .from('sessions')
    .select('id, tenant_id, end_user_id, current_stage, actor_control, assigned_operator, template_id')
    .eq('end_user_id', endUser.id)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!session) {
    const { data: created } = await supabaseAdmin
      .from('sessions')
      .insert({
        tenant_id: tenant.id,
        end_user_id: endUser.id,
        channel: 'whatsapp',
        status: 'active',
        actor_control: 'AI',
      })
      .select('id, tenant_id, end_user_id, current_stage, actor_control, assigned_operator, template_id')
      .single()
    session = created
  }

  if (!session) throw new Error('Failed to find or create session')

  // ── 4. Ejecutar Journey Engine ────────────────────────────
  const channelMessage: ChannelMessage = {
    channelType: 'whatsapp',
    senderId,
    content: messageText,
    timestamp: new Date().toISOString(),
    raw: {},
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const agentRunner = new AgentRegistry(anthropic, claudeConfig)
  const engine = new JourneyEngine(supabaseAdmin, anthropic, agentRunner)

  const result = await engine.process(channelMessage, session, {
    id: tenant.id,
    ih_policies: ihPolicies,
    claude_config: claudeConfig,
  })

  // ── 5. Handoff async post-escalada — no bloquea la respuesta ──
  // El briefing para el operador se genera en background; si falla,
  // el operador igual tiene la conversación completa en el dashboard.
  if (result.type === 'escalated' || result.type === 'checkpoint_created') {
    generateHandoffSummary({
      escalationId: result.escalationId,
      checkpointId: result.checkpointId,
      sessionId: session.id,
      tenantId: tenant.id,
      triggerReason: result.triggerReason ?? 'unknown',
      confidenceAtTrigger: result.confidence,
      customerSentiment: result.customerSentiment,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    }, process.env.ANTHROPIC_API_KEY!).catch((err: unknown) => {
      console.error('[HandoffAgent] Error generando summary:', err)
    })
  }

  // null → sesión escalada o en checkpoint (el humano responde desde el dashboard)
  return result.type === 'ai_response' ? (result.content ?? null) : null
}
