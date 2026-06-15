import type { SectorExtension } from '../types'
import { RETAIL_STAGES_CONFIG, RETAIL_IH_CHECKPOINTS } from './journey-config'
import {
  RETAIL_CONSULTATION_PROMPT,
  RETAIL_SALES_PROMPT,
  RETAIL_TRANSACTIONS_PROMPT,
  RETAIL_FEEDBACK_PROMPT,
} from './prompts'

export const retailExtension: SectorExtension = {
  sector: 'retail',

  ihPolicies: {
    require_2fa_for_operators: false,
    auto_escalate_below_confidence: 0.55,
    max_session_duration_hours: 2,
    human_approval_required_for_payments: true,
    auto_escalate_on_sentiment: ['angry', 'frustrated', 'very_negative'],
  },

  journeyTemplate: {
    name: 'Journey Retail Estándar',
    stages_config: RETAIL_STAGES_CONFIG,
    ih_checkpoints: RETAIL_IH_CHECKPOINTS,
  },

  agentPrompts: {
    consultation: RETAIL_CONSULTATION_PROMPT,
    sales: RETAIL_SALES_PROMPT,
    transactions: RETAIL_TRANSACTIONS_PROMPT,
    feedback: RETAIL_FEEDBACK_PROMPT,
  },

  intentMapping: {
    devolucion: 'transactions',
    cambio_talla: 'transactions',
    cambio_color: 'transactions',
    reembolso: 'transactions',
    cancelar_pedido: 'transactions',
    modificar_pedido: 'transactions',
    reclamo_defecto: 'transactions',
    tracking_pedido: 'consultation',
    guia_tallas: 'consultation',
    disponibilidad: 'consultation',
    politica_devolucion: 'consultation',
    cuidado_prenda: 'consultation',
    programa_lealtad: 'consultation',
    oferta: 'sales',
    cross_sell: 'sales',
    carrito_abandonado: 'sales',
  },

  transactionsConfig: {
    autoApproveOperationTypes: [],
    requiresIHOperationTypes: ['refund', 'return', 'exchange', 'cancel_order', 'defect_claim'],
    autoApproveMaxAmountCop: null,
  },
}
