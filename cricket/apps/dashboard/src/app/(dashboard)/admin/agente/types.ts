export type Sector = 'mobiliario' | 'tatuajes' | 'legal' | 'salud'

export type TestChatRole = 'atencion' | 'ventas' | 'feedback'

export interface SectorInfo {
  key:      Sector
  label:    string
  note:     string
  greeting: string
  headColor: string
}

export interface FeedbackRule {
  id:      string
  name:    string
  when:    string
  detail:  string
  enabled: boolean
}

export interface EscalationRule {
  id:    string
  topic: string
  rule:  string
  owner: string
  level: 0 | 1 | 2
}

export interface PortfolioItem {
  id:     string
  name:   string
  status: 'listo' | 'pendiente'
  q:      string
  a:      string
}

export interface ChatMessage {
  from: string
  text: string
}

export interface TradeInfo {
  icon:   string
  name:   string
  detail: string
  trait:  string
}

export interface WizardState {
  i:              number
  name:           string
  sector:         Sector
  shirtColorIndex: number
  testChatRole:   TestChatRole
  feedbackRules:  FeedbackRule[]
  trainerMessages: ChatMessage[]
  testMessages:   ChatMessage[]
  trainerSaved:   boolean
}
