/**
 * Cricket — Tipos TypeScript base
 * Los tipos de tabla (Database) se generan automáticamente con:
 *   pnpm db:types
 * y quedan en supabase.generated.ts
 *
 * Este archivo exporta los tipos de uso frecuente y los tipos
 * propios de la lógica de agentes / journey.
 */

// ── Enums (mirrors de los tipos PostgreSQL) ──────────────────

export type SectorType =
  | 'banking'
  | 'retail'
  | 'health'
  | 'telecom'
  | 'government'

export type ModuleType =
  | 'consultation'
  | 'sales'
  | 'transactions'
  | 'feedback'

export type ChannelType = 'whatsapp' | 'web_chat' | 'email'

export type ActorType = 'AI' | 'HUMAN' | 'SYSTEM'

export type ActorControl = 'AI' | 'HUMAN' | 'MIXED'

export type SessionStatus =
  | 'active'
  | 'escalated'
  | 'human_takeover'
  | 'completed'
  | 'abandoned'

export type CheckpointStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'overridden'
  | 'expired'

export type EscalationOutcome =
  | 'resolved_by_human'
  | 'returned_to_ai'
  | 'closed'
  | 'transferred'

export type UserRole =
  | 'superadmin'
  | 'tenant_admin'
  | 'supervisor'
  | 'operator'

export type FallbackType = 'ih_handoff' | 'redirect_url' | 'skip'

// ── Políticas IH (tenant.ih_policies JSONB) ──────────────────

export interface IHPolicy {
  require_2fa_for_operators: boolean
  /** Confianza mínima del agente. Bajo este umbral → checkpoint automático */
  auto_escalate_below_confidence: number  // 0.0 - 1.0
  max_session_duration_hours: number
  human_approval_required_for_payments: boolean
}

// ── Config de etapas (journey_templates.stages_config JSONB) ─

export interface StageConfig {
  order: number
  stage_type: ModuleType
  is_active: boolean
  agent: string | null              // nombre del agente, null si inactivo
  fallback: FallbackType | null     // null si is_active = true
  ih_checkpoint: boolean            // true → crear checkpoint al entrar a esta etapa
}

// ── Config de módulo (tenant_modules.config JSONB) ───────────

export interface ModuleConfig {
  knowledge_base_id?: string
  custom_system_prompt?: string
  confidence_threshold?: number     // sobreescribe el del tenant si se define
  max_turns?: number
}

export interface FallbackConfig {
  url?: string                      // para redirect_url
  message?: string                  // mensaje al cliente al omitir etapa
  operator_pool_id?: string         // pool de operadores para ih_handoff
}

// ── Agentes ──────────────────────────────────────────────────

export interface AgentContext {
  tenantId: string
  sessionId: string
  endUserId: string
  currentStage: ModuleType
  channel: ChannelType
  ihPolicies: IHPolicy
  conversationHistory: MessageTurn[]
}

export interface MessageTurn {
  role: 'user' | 'assistant'
  content: string
  actorType: ActorType
  createdAt: string
}

export interface AgentInput {
  message: string
  context: AgentContext
}

/**
 * Todo agente Claude devuelve este shape.
 * confidence < ihPolicies.auto_escalate_below_confidence → requiresIH = true automático
 */
export interface AgentOutput {
  content: string
  /** Score 0.000 - 1.000. Bajo el umbral del tenant → checkpoint IH */
  confidence: number
  /** Chain-of-thought del agente. Se persiste en ai_decisions.reasoning */
  reasoning: string
  /** Herramientas invocadas durante la respuesta */
  toolsUsed: string[]
  /** true → el Journey Engine crea un cognitive_checkpoint antes de continuar */
  requiresIH: boolean
  /** Acción concreta que el agente propone ejecutar (si la hay) */
  action?: AgentAction
  /** Tokens consumidos (para billing y analytics) */
  usage: { promptTokens: number; completionTokens: number }
  /** Latencia en ms */
  latencyMs: number
}

export interface AgentAction {
  type: string                 // 'create_ticket' | 'send_notification' | 'initiate_payment' | etc.
  payload: Record<string, unknown>
  requiresIHApproval: boolean  // true → NUNCA ejecutar sin checkpoint resuelto
}

/** Error que lanza un agente cuando detecta que debe escalar */
export class EscalationRequired extends Error {
  constructor(
    public readonly reason: string,
    public readonly confidence: number,
    public readonly partialOutput: Partial<AgentOutput>
  ) {
    super(`Escalation required: ${reason}`)
    this.name = 'EscalationRequired'
  }
}

// ── Channel message (formato unificado entre canales) ────────

export interface ChannelMessage {
  channelType: ChannelType
  /** Identificador del remitente en el canal (número WhatsApp, email, session ID) */
  senderId: string
  content: string
  mediaUrl?: string
  timestamp: string
  /** Metadatos específicos del canal (ej: WhatsApp message ID para responder) */
  raw: Record<string, unknown>
}

// ── Re-export del tipo Database generado (post db:types) ─────
// Este import fallará hasta que ejecutes: pnpm db:types
export type { Database } from './supabase.generated'
