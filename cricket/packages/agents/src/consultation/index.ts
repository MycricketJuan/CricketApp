import Anthropic from '@anthropic-ai/sdk'
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

export class ConsultationAgent {
  constructor(
    private client: Anthropic,
    private config: ClaudeConfig,
  ) {}

  async run(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    const start = Date.now()

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.max_tokens,
      system: `Eres el agente de consulta de un tenant en la plataforma Cricket.
Tu rol es responder las preguntas del cliente con precisión y brevedad.
Canal activo: ${context.channel}. Etapa del journey: ${context.currentStage}.
Cuando no tengas suficiente información para responder con seguridad, indícalo claramente.
Responde siempre en el mismo idioma que usa el cliente.`,
      messages: [
        ...context.conversationHistory.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: input.message },
      ],
    })

    const content = (response.content[0] as { type: 'text'; text: string }).text
    const latencyMs = Date.now() - start

    const hasUncertainty = UNCERTAINTY_MARKERS.some(marker =>
      content.toLowerCase().includes(marker),
    )
    const confidence = hasUncertainty ? 0.45 : 0.85

    // Si la confianza cae bajo el umbral del tenant, escalar antes de responder
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
      reasoning: `Consulta procesada. Confianza: ${confidence}. Tokens totales: ${response.usage.input_tokens + response.usage.output_tokens}`,
      toolsUsed: [],
      requiresIH: false,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
      },
      latencyMs,
    }
  }
}
