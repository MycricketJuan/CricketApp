import Anthropic from '@anthropic-ai/sdk'
import type { AgentInput, AgentOutput } from '@cricket/core/types'
import { EscalationRequired } from '@cricket/core/types'
import { accountCheck, ACCOUNT_CHECK_TOOL } from './account-check'
import { buildTransactionPreview, TRANSACTION_PREVIEW_TOOL } from './transaction-preview'
import type { TransactionPreview, TransactionPreviewInput } from './transaction-preview'
import type { SectorExtension } from '@cricket/sectors/types'

interface ParsedResponse {
  content: string
  confidence: number
  reasoning: string
  needsHuman: boolean
  confirmed: boolean
  operation_type: string | null
}

const JSON_BLOCK_RE = /\{[^{}]*"confidence"\s*:[^{}]*\}/s

function parseResponse(raw: string): ParsedResponse {
  const match = JSON_BLOCK_RE.exec(raw)
  const content = match ? raw.slice(0, match.index).trim() : raw.trim()

  if (!match) {
    return {
      content,
      confidence: 0.7,
      reasoning: 'Sin bloque JSON en respuesta',
      needsHuman: false,
      confirmed: false,
      operation_type: null,
    }
  }

  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>
    return {
      content,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
      needsHuman: parsed.needsHuman === true,
      confirmed: parsed.confirmed === true,
      operation_type: typeof parsed.operation_type === 'string' ? parsed.operation_type : null,
    }
  } catch {
    return {
      content,
      confidence: 0.7,
      reasoning: 'Error al parsear JSON de respuesta',
      needsHuman: false,
      confirmed: false,
      operation_type: null,
    }
  }
}

function extractPreviewFromContext(
  messages: Anthropic.MessageParam[],
): TransactionPreview | null {
  for (const msg of messages) {
    if (msg.role !== 'user' || !Array.isArray(msg.content)) continue
    for (const block of msg.content) {
      if (
        typeof block === 'object' &&
        block !== null &&
        'type' in block &&
        block.type === 'tool_result' &&
        'content' in block
      ) {
        const content = block.content
        const text = typeof content === 'string' ? content : undefined
        if (!text) continue
        try {
          const parsed = JSON.parse(text) as Record<string, unknown>
          if ('operation_type' in parsed && 'amount_formatted' in parsed) {
            return parsed as unknown as TransactionPreview
          }
        } catch {
          // not a preview result, continue
        }
      }
    }
  }
  return null
}

export class TransactionsAgent {
  private static readonly MODEL = 'claude-sonnet-4-6'
  private static readonly MAX_TOKENS = 1024

  constructor(
    private client: Anthropic,
    private tenantId: string,
    private supabaseUrl: string,
    private supabaseKey: string,
    private sectorPromptSuffix: string | null = null,
    private sectorConfig: SectorExtension['transactionsConfig'] | null = null,
  ) {}

  async run(input: AgentInput): Promise<AgentOutput> {
    const { message, context } = input
    const start = Date.now()

    const basePrompt = `Eres el agente de transacciones de Cricket. Tu única función es estructurar y validar operaciones financieras para que un operador humano las apruebe. NUNCA ejecutas operaciones — solo preparas el camino para la aprobación humana.

PROCESO OBLIGATORIO (en este orden):
1. Llamar account_check con customer_id = "${context.endUserId}" para verificar identidad.
2. Si verified = false → informar al cliente que no es posible continuar y detenerse.
3. Si verified = true → llamar transaction_preview con los datos de la operación solicitada.
4. Presentar el preview al cliente de forma clara: monto, comisión, total, y cualquier flag de cumplimiento.
5. Pedir confirmación explícita. Solo cuando el cliente confirme, emitir confirmed: true en el JSON.

CONTEXTO:
Canal: ${context.channel} | Etapa: ${context.currentStage} | Cliente ID: ${context.endUserId}

FORMATO DE RESPUESTA — incluir al final de cada mensaje (en línea separada):
{"confidence":0.00,"reasoning":"...","needsHuman":false,"confirmed":false,"operation_type":null}

confirmed: true únicamente cuando el cliente confirmó explícitamente la operación.
operation_type: el tipo de operación ('transfer', 'payment', 'update_data') si se determinó, null si no.

IMPORTANTE: Nunca menciones que un humano ejecutará la operación. Simplemente di que el proceso de validación continuará.`

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

    const tools: Anthropic.Tool[] = [ACCOUNT_CHECK_TOOL, TRANSACTION_PREVIEW_TOOL]

    let response = await this.client.messages.create({
      model: TransactionsAgent.MODEL,
      max_tokens: TransactionsAgent.MAX_TOKENS,
      system: systemPrompt,
      tools,
      messages,
    })

    let totalPromptTokens = response.usage.input_tokens
    let totalCompletionTokens = response.usage.output_tokens
    const toolsUsed: string[] = []
    let accountVerified: boolean | null = null

    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      )

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block) => {
          toolsUsed.push(block.name)
          const blockInput = block.input as Record<string, unknown>
          let result: string

          if (block.name === 'account_check') {
            result = await accountCheck({
              tenantId: this.tenantId,
              supabaseUrl: this.supabaseUrl,
              supabaseKey: this.supabaseKey,
              endUserId: blockInput.customer_id as string,
            })
            try {
              const parsed = JSON.parse(result) as Record<string, unknown>
              accountVerified = parsed.verified === true
            } catch {
              accountVerified = false
            }
          } else if (block.name === 'transaction_preview') {
            const previewInput = blockInput as unknown as TransactionPreviewInput
            const preview = buildTransactionPreview(previewInput)
            result = JSON.stringify(preview)
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
        model: TransactionsAgent.MODEL,
        max_tokens: TransactionsAgent.MAX_TOKENS,
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
    const { content, confidence, reasoning, needsHuman, confirmed, operation_type } = parsed

    // Account check failed — flag for IH without action
    if (accountVerified === false) {
      return {
        content,
        confidence: Math.min(confidence, 0.3),
        reasoning,
        toolsUsed,
        requiresIH: true,
        usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
        latencyMs: Date.now() - start,
      }
    }

    if (confidence < 0.4) {
      throw new EscalationRequired('low_confidence_transactions', confidence, {
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
      usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
      latencyMs: Date.now() - start,
    }

    if (confirmed) {
      const preview = extractPreviewFromContext(messages)
      const op = operation_type ?? 'unknown'

      // Determine if this operation can auto-approve (sector config overrides banking default)
      // Banking default: ALWAYS requires IH approval (no auto-approve)
      let requiresIHApproval = true
      if (this.sectorConfig) {
        const isAutoApproveType = this.sectorConfig.autoApproveOperationTypes.includes(op)
        const maxAmount = this.sectorConfig.autoApproveMaxAmountCop
        const amountOk = maxAmount === null || (preview?.amount_raw ?? Infinity) <= maxAmount
        requiresIHApproval = !isAutoApproveType || !amountOk
      }

      output.action = {
        type: requiresIHApproval ? 'transaction_requires_approval' : 'transaction_auto_approved',
        payload: {
          preview,
          operation_type: op,
        },
        requiresIHApproval,
      }
    }

    return output
  }
}
