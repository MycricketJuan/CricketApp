// Tipos compartidos del flujo "Crear representación" (cliente y servidor).

export type ItemStatus = 'todo' | 'inferred' | 'confirmed' | 'not_applicable'

export type EvidenceKind = 'source' | 'user_message' | 'zerez_proposal'

export interface Evidence {
  kind: EvidenceKind
  source_id?: string
  message_id?: string
  quote?: string
  ref?: string
}

export interface KnowledgeItem {
  item_id: string
  submodule_id: string
  module_id: string
  status: ItemStatus
  value: string | null
  confidence: number
  quality: number
  evidence: Evidence[]
}

export type Tone = 'tu' | 'usted'

export interface RepProfile {
  user?: string
  company?: string
  color?: string
  color_secondary?: string
  logo_url?: string | null
  tone?: Tone
}

export interface RepMenu {
  menu_key: string
  title: string
  description?: string
  icon?: string
  intent?: string
  rationale?: string
  position: number
  enabled: boolean
}

export interface RepMessage {
  role: 'zerez' | 'user' | 'system'
  content: string
  card?: RepCard | null
}

export type RepCardType = 'color' | 'logo' | 'sources' | 'review' | 'menus' | 'connectors'

export interface RepCard {
  type: RepCardType
  props?: Record<string, unknown>
}

/** Cobertura calculada por el servidor para un submódulo o módulo. */
export interface Coverage {
  id: string
  title: string
  pct: number // 0–100
}

/** Estado completo que el cliente recibe para pintar (nunca calcula números). */
export interface RepresentationState {
  id: string
  status: string
  profile: RepProfile
  understanding: number // 0–100
  goal: number
  pending: { waiting_for?: string; targets?: string[] }
  moduleCoverage: Coverage[]
  submoduleCoverage: Coverage[]
  knowledge: KnowledgeItem[]
  menus: RepMenu[]
  cost: { total_input_tokens: number; total_output_tokens: number; est_cost_usd: number }
}
