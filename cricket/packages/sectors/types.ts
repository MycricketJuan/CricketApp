export interface StageConfig {
  order: number
  stage_type: 'consultation' | 'sales' | 'transactions' | 'feedback' | 'tramites'
  is_active: boolean
  agent: string | null
  fallback: string | null
  ih_checkpoint: boolean
  description: string
}

export interface IhCheckpoint {
  trigger: string
  action: string
  description: string
  amount_cop?: number
}

export interface SectorExtension {
  sector: string

  ihPolicies: {
    require_2fa_for_operators: boolean
    auto_escalate_below_confidence: number
    max_session_duration_hours: number
    human_approval_required_for_payments: boolean
    auto_escalate_on_sentiment: string[]
  }

  journeyTemplate: {
    name: string
    stages_config: StageConfig[]
    ih_checkpoints: IhCheckpoint[]
  }

  /** Sufijo concatenado al final del base prompt de cada agente */
  agentPrompts: {
    consultation: string
    sales: string
    transactions: string
    feedback: string
    /** Opcional — solo sectores con módulo de trámites (banking por ahora) */
    tramites?: string
  }

  /** Se mergea con INTENT_TO_STAGE del Journey Engine */
  intentMapping: Record<string, string>

  transactionsConfig: {
    autoApproveOperationTypes: string[]
    requiresIHOperationTypes: string[]
    /** null = sin límite por monto */
    autoApproveMaxAmountCop: number | null
  }
}
