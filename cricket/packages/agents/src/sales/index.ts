import Anthropic from '@anthropic-ai/sdk'
import type { AgentInput, AgentOutput } from '@cricket/core/types'
import { EscalationRequired } from '@cricket/core/types'
import { crmLookup, CRM_LOOKUP_TOOL } from '../tools/crm-lookup'
import { productSearch, PRODUCT_SEARCH_TOOL } from './product-search'

interface ParsedResponse {
  content: string
  confidence: number
  reasoning: string
  needsHuman: boolean
  leadQualified: boolean
  productName?: string
}

const JSON_BLOCK_RE = /\{[^{}]*"confidence"\s*:[^{}]*\}/s

function parseResponse(raw: string): ParsedResponse {
  const match = JSON_BLOCK_RE.exec(raw)
  const content = match ? raw.slice(0, match.index).trim() : raw.trim()

  if (!match) {
    return { content, confidence: 0.7, reasoning: 'Sin bloque JSON en respuesta', needsHuman: false, leadQualified: false }
  }

  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>
    return {
      content,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
      needsHuman: parsed.needsHuman === true,
      leadQualified: parsed.leadQualified === true,
      productName: typeof parsed.productName === 'string' ? parsed.productName : undefined,
    }
  } catch {
    return { content, confidence: 0.7, reasoning: 'Error al parsear JSON de respuesta', needsHuman: false, leadQualified: false }
  }
}

export class SalesAgent {
  private static readonly MODEL = 'claude-sonnet-4-6'
  private static readonly MAX_TOKENS = 1024

  constructor(
    private client: Anthropic,
    private tenantId: string,
    private supabaseUrl: string,
    private supabaseKey: string,
    private sectorPromptSuffix: string | null = null,
  ) {}

  async run(input: AgentInput): Promise<AgentOutput> {
    const { message, context } = input
    const start = Date.now()

    const basePrompt = `Eres el agente de ventas de Cricket. Tu objetivo es entender qué busca el cliente,
calificar si es un lead real y proponer 2-3 productos que se ajusten a su perfil.
Nunca presiones ni uses lenguaje agresivo. Si el cliente no está listo, no insistas.

PROCESO OBLIGATORIO (en este orden):
1. Llamar crm_lookup con customer_identifier = "${context.endUserId}"
2. Con el segmento del CRM, llamar product_search para obtener opciones relevantes.
3. Proponer exactamente 2 o 3 productos: nombre, beneficio principal y precio.
4. Hacer UNA sola pregunta de calificación al final.
5. Si el cliente confirma interés, indicar que se procederá — lo gestiona Transactions Agent.

CONTEXTO:
Canal: ${context.channel} | Etapa: ${context.currentStage} | Cliente ID: ${context.endUserId}

FORMATO DE RESPUESTA — incluir al final de cada mensaje (en línea separada):
{"confidence":0.00,"reasoning":"...","needsHuman":false,"leadQualified":false,"productName":null}

leadQualified: true cuando el cliente expresó intención clara de contratar un producto.
productName: nombre exacto del producto si leadQualified es true, null si no.`

    const systemPrompt = this.sectorPromptSuffix
      ? `${basePrompt}\n\n${this.sectorPromptSuffix}`
      : basePrompt

    const messages: Anthropic.MessageParam[] = [
      ...context.conversationHistory.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const tools: Anthropic.Tool[] = [CRM_LOOKUP_TOOL, PRODUCT_SEARCH_TOOL]

    let response = await this.client.messages.create({
      model: SalesAgent.MODEL,
      max_tokens: SalesAgent.MAX_TOKENS,
      system: systemPrompt,
      tools,
      messages,
    })

    let totalPromptTokens = response.usage.input_tokens
    let totalCompletionTokens = response.usage.output_tokens
    const toolsUsed: string[] = []

    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      )

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block) => {
          toolsUsed.push(block.name)
          const input = block.input as Record<string, unknown>
          let result: string

          if (block.name === 'crm_lookup') {
            result = await crmLookup({
              tenantId: this.tenantId,
              supabaseUrl: this.supabaseUrl,
              supabaseKey: this.supabaseKey,
              customerId: input.customer_identifier as string,
            })
          } else if (block.name === 'product_search') {
            result = await productSearch({
              tenantId: this.tenantId,
              supabaseUrl: this.supabaseUrl,
              supabaseKey: this.supabaseKey,
              segment: input.segment as string,
              intent: input.intent as string,
              maxResults: typeof input.max_results === 'number' ? input.max_results : undefined,
            })
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
        model: SalesAgent.MODEL,
        max_tokens: SalesAgent.MAX_TOKENS,
        system: systemPrompt,
        tools,
        messages,
      })

      totalPromptTokens += response.usage.input_tokens
      totalCompletionTokens += response.usage.output_tokens
    }

    const rawText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('\n')

    const parsed = parseResponse(rawText)
    const { content, confidence, reasoning, needsHuman, leadQualified, productName } = parsed

    if (confidence < context.ihPolicies.auto_escalate_below_confidence) {
      throw new EscalationRequired('low_confidence_sales', confidence, {
        content,
        confidence,
        reasoning,
        toolsUsed,
      })
    }

    const output: AgentOutput = {
      content,
      confidence,
      reasoning,
      toolsUsed,
      requiresIH: needsHuman,
      usage: {
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
      },
      latencyMs: Date.now() - start,
    }

    if (leadQualified) {
      output.action = {
        type: 'lead_qualified',
        payload: { product_interest: productName ?? '' },
        requiresIHApproval: false,
      }
    }

    return output
  }
}
