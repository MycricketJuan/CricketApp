// Bucle conversacional con tool use (servidor, sin streaming en fase 1).
// Agrupa los mensajes del usuario, llama al modelo con herramientas en varias
// rondas dentro del mismo turno, ejecuta/valida cada tool, y devuelve el texto
// final de ZEREZ, los efectos de estado y el uso de tokens.

import Anthropic from '@anthropic-ai/sdk'
import { estimateCostUsd } from './cost'
import { loadKnowledge, loadProfile, loadThread } from './db'
import { buildContext, SYSTEM_PROMPT } from './prompts'
import { computeFromKnowledge } from './understanding'
import { emptyEffects, executeTool, TOOLS, type TurnEffects } from './tools'

const MAX_TOKENS = 1500
const MAX_ROUNDS = 6
const HISTORY_LIMIT = 24

export interface TurnResult {
  text: string
  effects: TurnEffects
  usage: { inputTokens: number; outputTokens: number; costUsd: number }
  toolsUsed: string[]
}

const KICKOFF = '(El usuario acaba de abrir Crear. Inicia la conversación como indica tu primer mensaje.)'

export async function runTurn(args: {
  representationId: string
  tenantId: string
  model: string
}): Promise<TurnResult> {
  const { representationId, tenantId, model } = args

  // El hilo ya incluye los mensajes del usuario de este turno (la ruta los
  // persiste antes de llamar). Reconstruimos el contexto desde el estado actual.
  const [profile, knowledge, thread] = await Promise.all([
    loadProfile(representationId),
    loadKnowledge(representationId),
    loadThread(representationId),
  ])
  const { submoduleCoverage } = computeFromKnowledge(knowledge)
  const context = buildContext(profile.profile, knowledge, submoduleCoverage, profile.pending)

  const messages: Anthropic.MessageParam[] = thread
    .filter((m) => m.role !== 'system')
    .slice(-HISTORY_LIMIT)
    .map((m) => ({
      role: m.role === 'zerez' ? 'assistant' : 'user',
      content: m.content,
    }))

  // Arranque (clic en Crear, sin texto del usuario) o hilo que no termina en user.
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    messages.push({ role: 'user', content: KICKOFF })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const effects = emptyEffects()
  const toolsUsed: string[] = []
  const textParts: string[] = []
  let inputTokens = 0
  let outputTokens = 0

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      system: [
        { type: 'text', text: SYSTEM_PROMPT },
        { type: 'text', text: context },
      ],
      tools: TOOLS,
      messages,
    })

    inputTokens += response.usage.input_tokens
    outputTokens += response.usage.output_tokens

    // Un solo recorrido: acumula texto y ejecuta las herramientas (narrowing por .type).
    const results: { type: 'tool_result'; tool_use_id: string; content: string }[] = []
    let hasToolUse = false
    for (const block of response.content) {
      if (block.type === 'text') {
        textParts.push(block.text)
      } else if (block.type === 'tool_use') {
        hasToolUse = true
        toolsUsed.push(block.name)
        const out = await executeTool(block.name, (block.input ?? {}) as Record<string, unknown>, {
          representationId,
          tenantId,
          effects,
        })
        results.push({ type: 'tool_result', tool_use_id: block.id, content: out })
      }
    }

    if (response.stop_reason !== 'tool_use' || !hasToolUse) break

    // Round-trip: el turno del asistente (con sus tool_use) + los tool_result.
    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: results })
  }

  const text = textParts.join('\n\n').trim()
  const costUsd = estimateCostUsd(model, inputTokens, outputTokens)

  return { text, effects, usage: { inputTokens, outputTokens, costUsd }, toolsUsed }
}
