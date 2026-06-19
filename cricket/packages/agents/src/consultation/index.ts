import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient as createSupabase } from '@supabase/supabase-js'
import type { AgentInput, AgentContext, AgentOutput } from '@cricket/core/types'
import { EscalationRequired } from '@cricket/core/types'

export interface ClaudeConfig {
  model: string
  max_tokens: number
}

const UNCERTAINTY_MARKERS = [
  'no sé', 'no estoy seguro', 'no tengo información', 'no puedo confirmar',
  "i don't know", 'not sure', 'uncertain',
]

type KBChunk = { content: string; similarity: number }

export class ConsultationAgent {
  constructor(
    private client: Anthropic,
    private config: ClaudeConfig,
    private sectorPromptSuffix: string | null = null,
    private supabaseUrl: string = '',
    private supabaseKey: string = '',
  ) {}

  private async searchKnowledgeBase(message: string, tenantId: string): Promise<KBChunk[]> {
    if (!this.supabaseUrl || !this.supabaseKey || !process.env.OPENAI_API_KEY) return []

    try {
      const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const embResult = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: message,
      })
      const embedding = embResult.data[0].embedding

      const db = createSupabase(this.supabaseUrl, this.supabaseKey)
      const { data } = await db.rpc('search_knowledge_base', {
        p_tenant_id: tenantId,
        p_embedding: JSON.stringify(embedding),
        p_limit: 5,
      })

      return (data as KBChunk[] | null) ?? []
    } catch {
      return []
    }
  }

  async run(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    const start = Date.now()

    const basePrompt = `Eres el agente de consulta de un tenant en la plataforma Cricket.
Tu rol es responder las preguntas del cliente con precisión y brevedad.
Canal activo: ${context.channel}. Etapa del journey: ${context.currentStage}.
Cuando no tengas suficiente información para responder con seguridad, indícalo claramente.
Responde siempre en el mismo idioma que usa el cliente.`

    // Búsqueda semántica en la knowledge base del tenant
    const chunks = await this.searchKnowledgeBase(input.message, context.tenantId)
    const knowledgeSection = chunks.length > 0
      ? `\n\nInformación disponible del negocio (úsala para responder con precisión):\n${
          chunks.map(c => c.content).join('\n\n---\n\n')
        }`
      : ''

    const systemPrompt = basePrompt
      + knowledgeSection
      + (this.sectorPromptSuffix ? `\n\n${this.sectorPromptSuffix}` : '')

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.max_tokens,
      system: systemPrompt,
      messages: [
        ...context.conversationHistory.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: input.message },
      ],
    })

    const content   = (response.content[0] as { type: 'text'; text: string }).text
    const latencyMs = Date.now() - start

    const hasUncertainty = UNCERTAINTY_MARKERS.some(marker =>
      content.toLowerCase().includes(marker),
    )
    const confidence = hasUncertainty ? 0.45 : (chunks.length > 0 ? 0.90 : 0.85)

    if (confidence < context.ihPolicies.auto_escalate_below_confidence) {
      throw new EscalationRequired(
        'low_confidence_consultation',
        confidence,
        { content, confidence, reasoning: 'El agente detectó incertidumbre en su respuesta' },
      )
    }

    return {
      content,
      confidence,
      reasoning: `Consulta procesada. Chunks KB: ${chunks.length}. Confianza: ${confidence}. Tokens: ${response.usage.input_tokens + response.usage.output_tokens}`,
      toolsUsed: chunks.length > 0 ? ['knowledge_base_search'] : [],
      requiresIH: false,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
      },
      latencyMs,
    }
  }
}
