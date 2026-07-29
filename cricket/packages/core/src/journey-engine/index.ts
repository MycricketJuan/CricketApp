import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  EscalationRequired,
  type Database,
  type AgentContext,
  type AgentOutput,
  type ChannelMessage,
  type ModuleType,
  type IHPolicy,
  type StageConfig,
} from '../types'
import { getSectorIntentMapping } from '@cricket/sectors/registry'

// ── Interfaz pública — inyectada en el constructor ────────────
// Implementada por AgentRegistry en packages/agents.
// Desacopla el engine de agents y evita la dependencia circular.

export interface AgentRunner {
  run(stage: ModuleType, message: string, context: AgentContext): Promise<AgentOutput>
}

// ── Tipos internos del Journey Engine ────────────────────────

export interface Session {
  id: string
  tenant_id: string
  end_user_id: string
  current_stage: ModuleType | null
  actor_control: 'AI' | 'HUMAN' | 'MIXED'
  assigned_operator: string | null
  template_id: string | null
}

export interface Tenant {
  id: string
  ih_policies: IHPolicy
  claude_config: { model: string; max_tokens: number }
  sector?: string
}

interface IntentResult {
  intent: string
  targetStage: ModuleType
  sentiment: string
  confidence: number
}

export interface EngineResult {
  type: 'ai_response' | 'human_controlled' | 'checkpoint_created' | 'escalated' | 'fallback'
  content?: string
  stage?: ModuleType
  escalationId?: string
  checkpointId?: string
  triggerReason?: string
  confidence?: number
  customerSentiment?: string
}

// ── Intent → Stage mapping ────────────────────────────────────
// El engine NO sigue un flujo lineal fijo.
// Cada mensaje puede saltar a cualquier etapa según la intención.

const INTENT_TO_STAGE: Record<string, ModuleType> = {
  product_question:    'consultation',
  general_info:        'consultation',
  complaint:           'consultation',
  buy_intent:          'sales',
  upgrade_request:     'sales',
  transaction_request: 'transactions',
  status_check:        'transactions',
  positive_feedback:   'feedback',
  negative_feedback:   'feedback',
  tramite_request:     'tramites',
  apertura_cuenta:     'tramites',
  solicitud_credito:   'tramites',
  solicitar_tarjeta:   'tramites',
  actualizar_datos:    'tramites',
  abrir_cdt:           'tramites',
  radicar_queja:       'tramites',
  paz_y_salvo:         'tramites',
  levantamiento_de_prenda: 'tramites',
}

// El enum module_type de la DB en supabase.generated.ts no incluye
// 'tramites' hasta regenerar tipos (pnpm db:types) con la migración
// 20240103000000_tramites.sql aplicada. El cast es inocuo después.
type DbModuleType = Database['public']['Enums']['module_type']

// El enum actor_type de la DB en supabase.generated.ts no incluye
// 'CUSTOMER' hasta regenerar tipos (pnpm db:types) con la migración
// 20260730000000_customer_actor_type.sql aplicada. El cast es inocuo después.
type DbActorType = Database['public']['Enums']['actor_type']

// ── Journey Engine ────────────────────────────────────────────

export class JourneyEngine {
  constructor(
    private supabase: SupabaseClient<Database>,
    private anthropicClient: Anthropic,
    private agentRunner: AgentRunner,
  ) {}

  async process(
    message: ChannelMessage,
    session: Session,
    tenant: Tenant,
  ): Promise<EngineResult> {

    // ── 1. Si el humano tiene el control, no procesar con IA ──
    if (session.actor_control === 'HUMAN') {
      return { type: 'human_controlled' }
    }

    const ihPolicies = tenant.ih_policies
    const effectiveIntentMap = this.getEffectiveIntentMapping(tenant.sector)

    // ── 2. Clasificar intención (modelo ligero y rápido) ──────
    const intent = await this.classifyIntent(message.content, session, effectiveIntentMap)

    // ── 3. Escalada preventiva por sentimiento negativo ───────
    // Se evalúa ANTES de invocar al agente de negocio.
    // Principio IA+IH: si el cliente está frustrado, el humano interviene.
    if (intent.sentiment === 'frustrated' || intent.sentiment === 'angry') {
      return this.escalate(session, 'customer_sentiment', intent.confidence, intent.sentiment)
    }

    // ── 4. Resolver la etapa destino ──────────────────────────
    // Si hay un trámite en borrador para esta sesión, no dejar que una
    // clasificación ambigua (ej. una respuesta corta a un campo del
    // trámite mal leída como general_info/product_question) saque al
    // cliente de `tramites` a mitad de la recolección.
    const hasDraftTramite = await this.hasDraftTramite(session.id)
    const targetStage = this.resolveStage(intent, session, hasDraftTramite)

    // ── 5. Verificar si el módulo está contratado ─────────────
    const moduleConfig = await this.getModuleConfig(tenant.id, targetStage)

    if (!moduleConfig.is_active) {
      return this.applyFallback(moduleConfig, session)
    }

    // ── 6. Construir contexto y ejecutar el agente ────────────
    const context = await this.buildContext(session, tenant, message.mediaUrl)
    let output: AgentOutput

    try {
      output = await this.agentRunner.run(targetStage, message.content, context)
    } catch (err: unknown) {
      if (err instanceof EscalationRequired) {
        return this.escalate(session, err.reason, err.confidence)
      }
      throw err
    }

    // ── 7. Comprobar umbral de confianza ──────────────────────
    // Si la IA no está segura, crea un checkpoint IH antes de continuar.
    if (output.confidence < ihPolicies.auto_escalate_below_confidence) {
      return this.createCheckpoint(session, 'low_confidence', output)
    }

    // ── 8. Verificar políticas IH para acciones sensibles ─────
    // Ejemplo: pagos siempre requieren aprobación humana aunque
    // la confianza del agente sea alta.
    if (output.action?.requiresIHApproval) {
      return this.createCheckpoint(session, 'policy', output)
    }

    // ── 9. Persistir interacción y decisión de la IA ──────────
    await this.persist(session, message, output, targetStage, tenant.id)

    // ── 10. Actualizar etapa de la sesión ─────────────────────
    if (targetStage !== session.current_stage) {
      await this.supabase
        .from('sessions')
        .update({
          current_stage: targetStage as DbModuleType,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', session.id)
    }

    return { type: 'ai_response', content: output.content, stage: targetStage }
  }

  private getEffectiveIntentMapping(sector?: string): Record<string, ModuleType> {
    if (!sector) return INTENT_TO_STAGE
    const sectorMap = getSectorIntentMapping(sector)
    return { ...INTENT_TO_STAGE, ...sectorMap } as Record<string, ModuleType>
  }

  // ── Intent Classifier ─────────────────────────────────────
  // Usa claude-haiku (rápido y barato) solo para clasificar.
  // El agente de negocio usa el modelo configurado en el tenant.

  private async classifyIntent(
    message: string,
    session: Session,
    intentMap: Record<string, ModuleType>,
  ): Promise<IntentResult> {
    const response = await this.anthropicClient.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: `Clasifica la intención del mensaje. Responde SOLO en JSON, sin explicaciones.
Intents: product_question, general_info, complaint, buy_intent, upgrade_request,
         transaction_request, status_check, positive_feedback, negative_feedback,
         tramite_request, apertura_cuenta, solicitud_credito, solicitar_tarjeta,
         actualizar_datos, abrir_cdt, radicar_queja, paz_y_salvo,
         levantamiento_de_prenda, other.
Nota trámites: usa los intents de trámite cuando el cliente quiere INICIAR una
solicitud formal (abrir cuenta/CDT, pedir crédito o tarjeta, actualizar datos,
radicar una queja formal, pedir paz y salvo, levantar/liberar una prenda de
vehículo). complaint es para quejas conversacionales; radicar_queja para
reclamaciones formales.
Sentiment: positive, neutral, negative, frustrated, angry.
Formato exacto: {"intent":"...","sentiment":"...","confidence":0.00}`,
      messages: [{
        role: 'user',
        content: `Etapa actual: ${session.current_stage ?? 'inicio'}
Mensaje: "${message}"`,
      }],
    })

    const raw = (response.content[0] as { text: string }).text
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error(`Intent classifier returned no JSON: ${raw}`)
    const parsed = JSON.parse(raw.slice(start, end + 1)) as { intent: string; sentiment: string; confidence: number }
    const targetStage: ModuleType = intentMap[parsed.intent] ?? session.current_stage ?? 'consultation'

    return { ...parsed, targetStage }
  }

  private resolveStage(
    intent: IntentResult,
    session: Session,
    hasDraftTramite: boolean,
  ): ModuleType {
    if (hasDraftTramite && session.current_stage === 'tramites' && intent.targetStage !== 'tramites') {
      return 'tramites'
    }
    return intent.targetStage ?? session.current_stage ?? 'consultation'
  }

  // Trámite en borrador (aún no radicado) atado a esta sesión — usado
  // para "anclar" la conversación en `tramites` mientras se recolectan
  // campos, sin depender de que la clasificación de intención acierte
  // en cada turno (ver resolveStage()).
  private async hasDraftTramite(sessionId: string): Promise<boolean> {
    const { count } = await this.supabase
      .from('tramites')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('status', 'draft')
    return (count ?? 0) > 0
  }

  // ── Helpers IH ───────────────────────────────────────────

  private async escalate(
    session: Session,
    reason: string,
    confidence: number,
    sentiment?: string,
  ): Promise<EngineResult> {
    const { data: escalation } = await this.supabase
      .from('escalations')
      .insert({
        session_id: session.id,
        tenant_id: session.tenant_id,
        trigger_reason: reason,
        confidence_at_trigger: confidence,
        customer_sentiment: sentiment ?? null,
      })
      .select('id')
      .single()
    await this.supabase
      .from('sessions')
      .update({ actor_control: 'HUMAN', status: 'escalated' })
      .eq('id', session.id)
    return {
      type: 'escalated',
      escalationId: escalation?.id,
      triggerReason: reason,
      confidence,
      customerSentiment: sentiment,
    }
  }

  private async createCheckpoint(
    session: Session,
    trigger: 'low_confidence' | 'policy' | 'compliance' | 'customer_request',
    output: AgentOutput,
  ): Promise<EngineResult> {
    const { data: checkpoint } = await this.supabase
      .from('cognitive_checkpoints')
      .insert({
        session_id: session.id,
        tenant_id: session.tenant_id,
        trigger_reason: trigger,
        ai_recommendation: output.content,
        confidence_at_trigger: output.confidence,
        status: 'pending',
      })
      .select('id')
      .single()
    await this.supabase
      .from('sessions')
      .update({ actor_control: 'MIXED' })
      .eq('id', session.id)
    return {
      type: 'checkpoint_created',
      checkpointId: checkpoint?.id,
      triggerReason: trigger,
      confidence: output.confidence,
    }
  }

  private async applyFallback(
    config: StageConfig,
    session: Session,
  ): Promise<EngineResult> {
    if (config.fallback === 'ih_handoff') {
      return this.escalate(session, 'module_not_active', 1.0)
    }
    return { type: 'fallback' }
  }

  // ── Persistencia ──────────────────────────────────────────

  private async persist(
    session: Session,
    message: ChannelMessage,
    output: AgentOutput,
    stage: ModuleType,
    tenantId: string,
  ): Promise<void> {
    // Se persiste primero el mensaje del cliente — buildContext() lee
    // esta misma tabla para reconstruir el historial del próximo turno.
    // Sin esto, el agente solo ve sus propias preguntas pasadas y nunca
    // las respuestas del cliente, y termina repitiendo las preguntas.
    await this.supabase
      .from('interactions')
      .insert({
        session_id: session.id,
        tenant_id: tenantId,
        actor_type: 'CUSTOMER' as DbActorType,
        content: message.content,
        stage: stage as DbModuleType,
        channel: message.channelType,
      })

    const { data: interaction } = await this.supabase
      .from('interactions')
      .insert({
        session_id: session.id,
        tenant_id: tenantId,
        actor_type: 'AI',
        content: output.content,
        stage: stage as DbModuleType,
        channel: message.channelType,
      })
      .select('id')
      .single()

    if (interaction) {
      await this.supabase.from('ai_decisions').insert({
        interaction_id: interaction.id,
        tenant_id: tenantId,
        agent_type: `${stage}_agent`,
        model: 'claude-sonnet-4-6',
        confidence: output.confidence,
        reasoning: output.reasoning,
        action_taken: output.action?.type ?? null,
        tools_used: output.toolsUsed,
        prompt_tokens: output.usage.promptTokens,
        completion_tokens: output.usage.completionTokens,
        latency_ms: output.latencyMs,
      })
    }
  }

  private async buildContext(
    session: Session,
    tenant: Tenant,
    attachmentUrl?: string,
  ): Promise<AgentContext> {
    const { data: interactions } = await this.supabase
      .from('interactions')
      .select('actor_type, content, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return {
      tenantId: tenant.id,
      sessionId: session.id,
      endUserId: session.end_user_id,
      currentStage: session.current_stage ?? 'consultation',
      channel: 'whatsapp',
      ihPolicies: tenant.ih_policies,
      sectorExtension: tenant.sector,
      attachmentUrl,
      conversationHistory: (interactions ?? []).reverse().map(i => ({
        role: i.actor_type === 'AI' ? 'assistant' : 'user',
        content: i.content,
        actorType: i.actor_type as 'AI' | 'HUMAN' | 'SYSTEM' | 'CUSTOMER',
        createdAt: i.created_at,
      })),
    }
  }

  private async getModuleConfig(tenantId: string, stage: ModuleType): Promise<StageConfig> {
    const { data } = await this.supabase
      .from('tenant_modules')
      .select('is_active, fallback_type, fallback_config, config')
      .eq('tenant_id', tenantId)
      .eq('module_type', stage as DbModuleType)
      .single()

    return {
      order: 0,
      stage_type: stage,
      is_active: data?.is_active ?? false,
      agent: data?.is_active ? `${stage}_agent` : null,
      fallback: (data?.fallback_type as 'ih_handoff' | 'redirect_url' | 'skip') ?? 'ih_handoff',
      ih_checkpoint: false,
    }
  }
}
