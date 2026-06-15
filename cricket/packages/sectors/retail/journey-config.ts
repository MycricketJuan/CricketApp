import type { StageConfig, IhCheckpoint } from '../types'

export const RETAIL_STAGES_CONFIG: StageConfig[] = [
  {
    order: 1,
    stage_type: 'consultation',
    is_active: true,
    agent: 'consultation_agent',
    fallback: null,
    ih_checkpoint: false,
    description: 'Consultas sobre productos, tallas, envíos y políticas de devolución',
  },
  {
    order: 2,
    stage_type: 'sales',
    is_active: true,
    agent: 'sales_agent',
    fallback: null,
    ih_checkpoint: false,
    description: 'Upsell, cross-sell, recuperación de carrito y promociones activas',
  },
  {
    order: 3,
    stage_type: 'transactions',
    is_active: true,
    agent: 'transactions_agent',
    fallback: 'ih_handoff',
    ih_checkpoint: false,
    description: 'Devoluciones, cambios, reembolsos y modificaciones de pedido',
  },
  {
    order: 4,
    stage_type: 'feedback',
    is_active: true,
    agent: 'feedback_agent',
    fallback: 'skip',
    ih_checkpoint: false,
    description: 'NPS y CSAT post-compra o post-resolución',
  },
]

export const RETAIL_IH_CHECKPOINTS: IhCheckpoint[] = [
  {
    trigger: 'refund_above_threshold',
    action: 'require_supervisor_approval',
    description: 'Reembolsos sobre 500.000 COP requieren aprobación del supervisor',
    amount_cop: 500000,
  },
  {
    trigger: 'damaged_goods_claim',
    action: 'require_supervisor_approval',
    description: 'Reclamos por producto dañado siempre requieren revisión humana',
  },
  {
    trigger: 'bulk_return',
    action: 'require_supervisor_approval',
    description: 'Devoluciones de más de 5 unidades requieren validación manual',
  },
  {
    trigger: 'fraud_suspicion',
    action: 'escalate_immediately',
    description: 'Patrones de fraude escalan sin esperar intervención del agente',
  },
]
