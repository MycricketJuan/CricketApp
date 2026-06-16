import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import type { AgentInput, AgentOutput } from '@cricket/core/types'
import { npsCollector, NPS_COLLECTOR_TOOL } from './nps-collector'

interface FeedbackParsed {
  content: string
  confidence: number
  reasoning: string
  needsHuman: boolean
  npsScore: number | null
  csatScore: number | null
  confirmed: boolean
  declined: boolean
}

const JSON_BLOCK_RE = /\{[^{}]*"confidence"\s*:[^{}]*\}/

function parseResponse(raw: string): FeedbackParsed {
  const match = JSON_BLOCK_RE.exec(raw)
  const content = match ? raw.slice(0, match.index).trim() : raw.trim()

  if (!match) {
    return {
      content,
      confidence: 0.70,
      reasoning: 'Sin bloque JSON en respuesta',
      needsHuman: false,
      npsScore: null,
      csatScore: null,
      confirmed: false,
      declined: false,
    }
  }

  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>
    return {
      content,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.70,
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
      needsHuman: parsed.needsHuman === true,
      npsScore: typeof parsed.nps_score === 'number' ? parsed.nps_score : null,
      csatScore: typeof parsed.csat_score === 'number' ? parsed.csat_score : null,
      confirmed: parsed.confirmed === true,
      declined: parsed.declined === true,
    }
  } catch {
    return {
      content,
      confidence: 0.70,
      reasoning: 'Error al parsear JSON de respuesta',
      needsHuman: false,
      npsScore: null,
      csatScore: null,
      confirmed: false,
      declined: false,
    }
  }
}

export class FeedbackAgent {
  private static readonly MODEL = 'claude-sonnet-4-6'
  private static readonly MAX_TOKENS = 512

  constructor(
    private client: Anthropic,
    private tenantId: string,
    private sessionId: string,
    private stageReached: string,
    private supabaseUrl: string,
    private supabaseKey: string,
    private sectorPromptSuffix: string | null = null,
  ) {}

  async run(input: AgentInput): Promise<AgentOutput> {
    const { message, context } = input
    const start = Date.now()

    const basePrompt = `Eres el agente de cierre de Cricket. Tu trabajo es cerrar el journey del cliente
de forma cálida y recopilar su opinión sobre la experiencia.
Tono: agradecido, cercano, breve. Nunca presiones si el cliente no quiere opinar.
Máximo 2 preguntas en toda la conversación: NPS y CSAT.

FLUJO CONVERSACIONAL:

ESTADO A — Cuando aún no tienes el NPS:
Agradece brevemente la interacción con 1 frase específica sobre lo que se resolvió
(si está en el historial). Luego pregunta directamente:
"Del 0 al 10, ¿qué tan probable es que recomiendes Banco XYZ a un amigo?"
No des contexto ni explicaciones sobre la escala — ir directo a la pregunta.

ESTADO B — Cuando ya tienes el NPS pero no el CSAT:
Agradece el score con 1 frase genuina y no genérica.
Si es 9-10: "¡Gracias! Nos alegra mucho."
Si es 7-8: "Gracias, seguiremos mejorando."
Si es 0-6: "Gracias por la honestidad. Tomaremos nota."
Luego pregunta: "¿Cómo calificarías la claridad de las respuestas? (1 a 5)"

ESTADO C — Cuando ya tienes NPS y CSAT, o el cliente declinó:
Una frase de despedida cálida. Llama a nps_collector con los scores obtenidos.
Incluye confirmed:true en el JSON.

DETECCIÓN DE SCORES:
NPS: "9", "le doy un 9", "nueve", "9/10", "9 de 10" → número 9
CSAT: "4", "cuatro estrellas", "4/5" → número 4
Rechazo: "no quiero", "omitir", "paso", "no gracias" → aceptar y cerrar con declined:true
Número fuera de rango (ej: "11" para NPS) → preguntar de nuevo de forma natural.

CONTEXTO:
Canal: ${context.channel} | Cliente ID: ${context.endUserId}

FORMATO DE RESPUESTA — incluir al final de cada mensaje (línea separada):
{"confidence":0.70,"reasoning":"...","nps_score":null,"csat_score":null,"confirmed":false,"declined":false}

confidence: 0.70 mientras esperas scores | 0.95 cuando confirmed:true | 0.50 si declined:true
nps_score: número 0-10 cuando lo tengas, null si no
csat_score: número 1-5 cuando lo tengas, null si no
confirmed: true solo cuando nps_collector fue llamado exitosamente
declined: true si el cliente rechazó dar feedback`

    const systemPrompt = this.sectorPromptSuffix
      ? `${basePrompt}\n\n${this.sectorPromptSuffix}`
      : basePrompt

    const messages: Anthropic.MessageParam[] = [
      ...context.conversationHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const tools: Anthropic.Tool[] = [NPS_COLLECTOR_TOOL]

    let response = await this.client.messages.create({
      model: FeedbackAgent.MODEL,
      max_tokens: FeedbackAgent.MAX_TOKENS,
      system: systemPrompt,
      tools,
      messages,
    })

    let totalPromptTokens = response.usage.input_tokens
    let totalCompletionTokens = response.usage.output_tokens
    const toolsUsed: string[] = []
    let alreadyRecorded = false

    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      )

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block) => {
          toolsUsed.push(block.name)
          let result: string

          if (block.name === 'nps_collector') {
            const inp = block.input as {
              nps_score: number
              csat_score?: number
              verbatim?: string
              stage_reached?: string
            }

            if (inp.nps_score < 0 || inp.nps_score > 10) {
              result = JSON.stringify({ error: 'nps_score fuera de rango (0-10)' })
            } else {
              const roundedScore = Math.round(inp.nps_score)
              const raw = await npsCollector({
                tenantId: this.tenantId,
                sessionId: this.sessionId,
                endUserId: context.endUserId,
                npsScore: roundedScore,
                csatScore: inp.csat_score != null ? inp.csat_score : null,
                verbatim: inp.verbatim ?? null,
                channel: context.channel,
                stageReached: inp.stage_reached ?? this.stageReached,
                supabaseUrl: this.supabaseUrl,
                supabaseKey: this.supabaseKey,
              })
              result = raw
              try {
                const parsed = JSON.parse(raw) as Record<string, unknown>
                if (parsed.already_recorded === true) alreadyRecorded = true
              } catch {
                // ignore parse error
              }
            }
          } else {
            result = JSON.stringify({ error: `Tool desconocida: ${block.name}` })
          }

          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: result,
          }
        }),
      )

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })

      response = await this.client.messages.create({
        model: FeedbackAgent.MODEL,
        max_tokens: FeedbackAgent.MAX_TOKENS,
        system: systemPrompt,
        tools,
        messages,
      })

      totalPromptTokens += response.usage.input_tokens
      totalCompletionTokens += response.usage.output_tokens
    }

    const rawText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')

    const parsed = parseResponse(rawText)
    const latencyMs = Date.now() - start

    // Caso especial: NPS ya registrado en esta sesión
    if (alreadyRecorded) {
      return {
        content: 'Ya tenemos tu opinión registrada. ¡Gracias y hasta pronto!',
        confidence: 0.95,
        reasoning: 'NPS ya registrado previamente para esta sesión',
        toolsUsed,
        requiresIH: false,
        action: {
          type: 'journey_completed',
          payload: { nps_score: parsed.npsScore, csat_score: parsed.csatScore, session_closed: true },
          requiresIHApproval: false,
        },
        usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
        latencyMs,
      }
    }

    // Caso 1 — confirmed: nps_collector fue llamado exitosamente
    if (parsed.confirmed) {
      return {
        content: parsed.content,
        confidence: 0.95, // fijo, no viene del bloque JSON
        reasoning: parsed.reasoning,
        toolsUsed,
        requiresIH: false,
        action: {
          type: 'journey_completed',
          payload: {
            nps_score: parsed.npsScore,
            csat_score: parsed.csatScore,
            session_closed: true,
          },
          requiresIHApproval: false,
        },
        usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
        latencyMs,
      }
    }

    // Caso 2 — declined: cliente rechazó dar feedback, solo cerrar sesión
    if (parsed.declined) {
      const supabase = createClient(this.supabaseUrl, this.supabaseKey)
      await supabase
        .from('sessions')
        .update({
          status: 'completed',
          actor_control: 'AI',
          closed_at: new Date().toISOString(),
        })
        .eq('id', this.sessionId)
        .neq('status', 'completed')

      return {
        content: parsed.content,
        confidence: 0.50,
        reasoning: parsed.reasoning,
        toolsUsed,
        requiresIH: false,
        action: {
          type: 'journey_completed_no_feedback',
          payload: { session_closed: true },
          requiresIHApproval: false,
        },
        usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
        latencyMs,
      }
    }

    // Caso 3 — Esperando score
    return {
      content: parsed.content,
      confidence: 0.70,
      reasoning: parsed.reasoning,
      toolsUsed,
      requiresIH: false,
      usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
      latencyMs,
    }
  }
}
