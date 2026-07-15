import Anthropic from '@anthropic-ai/sdk'
import type { AgentInput, AgentOutput } from '@cricket/core/types'
import { TRAMITE_TEMPLATES, getTramiteTemplate } from './templates'
import {
  createTramite,
  updateTramite,
  IDENTIFY_TRAMITE_TOOL,
  CREATE_TRAMITE_TOOL,
  UPDATE_TRAMITE_TOOL,
} from './tramite-tool'

interface ParsedResponse {
  content: string
  reasoning: string
  tramite_type: string | null
  all_fields_collected: boolean
}

const JSON_BLOCK_RE = /\{[^{}]*"confidence"\s*:[^{}]*\}/

function parseResponse(raw: string): ParsedResponse {
  const match = JSON_BLOCK_RE.exec(raw)
  const content = match ? raw.slice(0, match.index).trim() : raw.trim()

  if (!match) {
    return {
      content,
      reasoning: 'Sin bloque JSON en respuesta',
      tramite_type: null,
      all_fields_collected: false,
    }
  }

  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>
    return {
      content,
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
      tramite_type:
        typeof parsed.tramite_type === 'string' && parsed.tramite_type !== ''
          ? parsed.tramite_type
          : null,
      all_fields_collected: parsed.all_fields_collected === true,
    }
  } catch {
    return {
      content,
      reasoning: 'Error al parsear JSON de respuesta',
      tramite_type: null,
      all_fields_collected: false,
    }
  }
}

export class TramiteAgent {
  private static readonly MODEL = 'claude-sonnet-4-6'
  private static readonly MAX_TOKENS = 1024

  constructor(
    private client: Anthropic,
    private tenantId: string,
    private sessionId: string,
    private endUserId: string,
    private supabaseUrl: string,
    private supabaseKey: string,
    private sectorPromptSuffix: string | null = null,
  ) {}

  async run(input: AgentInput): Promise<AgentOutput> {
    const { message, context } = input
    const start = Date.now()

    const basePrompt = `Eres el agente de trámites bancarios de Cricket. Tu trabajo es ayudar al cliente a radicar solicitudes formales ante el banco: apertura de cuentas, créditos, tarjetas, certificados y reclamaciones.

IMPORTANTE: Tú recopilas la información y radicas el trámite. El banco lo procesa y responde. Nunca prometas cuándo exactamente responderá el banco (solo el SLA estándar), y nunca garantices la aprobación.

PROCESO OBLIGATORIO:

PASO 1 — Identificar el trámite:
Detectar qué trámite quiere iniciar el cliente. Si no está claro, preguntar directamente: "¿Qué deseas solicitar?" y listar las opciones disponibles.
Llamar a la tool identify_tramite con el tipo detectado.

PASO 2 — Recopilar datos (un campo a la vez):
Hacer UNA sola pregunta por turno — nunca un formulario de preguntas.
Usar exactamente el texto de "question" del template para cada campo.
Confirmar cada dato antes de pasar al siguiente:
"Perfecto, anotado. Ahora, [siguiente pregunta]"

PASO 3 — Confirmar todo antes de radicar:
Cuando tengas todos los campos, hacer un resumen completo de lo recopilado y preguntar: "¿Confirmas que estos datos son correctos para radicar tu [trámite]?"
Solo llamar create_tramite o update_tramite cuando el cliente confirme.

PASO 4 — Radicar y cerrar:
Llamar create_tramite con collected_data completo y pending_fields vacío.
Comunicar el mensaje de confirmación del template (incluye el SLA).
Indicar que recibirá novedades por el mismo canal.

REGLAS DE ORO:
- Nunca inventar información del cliente
- Si el cliente no sabe un dato, anotar 'por_definir' y continuar
- Si el cliente cancela el trámite, llamar create_tramite con los datos recopilados y los campos faltantes en pending_fields (queda en draft) para que no se pierda la información
- Documentos: informar qué documentos necesitará pero aclarar que los entregará en sucursal o por el canal que indique el especialista asignado

CONTEXTO:
Canal: ${context.channel} | Etapa: ${context.currentStage} | Cliente ID: ${context.endUserId}

FORMATO DE RESPUESTA — incluir al final de cada mensaje (en línea separada):
{"confidence":0.00,"reasoning":"...","needsHuman":true,"tramite_type":"","all_fields_collected":false}

needsHuman: SIEMPRE true — los trámites siempre van a revisión humana.
tramite_type: el tipo detectado ('apertura_cuenta', 'solicitud_credito', etc.), "" si aún no se detectó.
all_fields_collected: true cuando no quedan pending_fields.`

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

    const tools: Anthropic.Tool[] = [
      IDENTIFY_TRAMITE_TOOL,
      CREATE_TRAMITE_TOOL,
      UPDATE_TRAMITE_TOOL,
    ]

    let response = await this.client.messages.create({
      model: TramiteAgent.MODEL,
      max_tokens: TramiteAgent.MAX_TOKENS,
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
          let result: string

          if (block.name === 'identify_tramite') {
            const { tramite_type } = block.input as { tramite_type: string }
            const template = getTramiteTemplate(tramite_type)
            if (!template) {
              result = JSON.stringify({
                error: 'Tipo de trámite no reconocido',
                available: Object.keys(TRAMITE_TEMPLATES),
              })
            } else {
              result = JSON.stringify({
                template: {
                  label: template.label,
                  required_fields: template.required_fields,
                  documents_required: template.documents_required,
                  sla_hours: template.sla_hours,
                },
              })
            }
          } else if (block.name === 'create_tramite') {
            const inp = block.input as {
              tramite_type: string
              collected_data: Record<string, unknown>
              pending_fields: string[]
            }
            result = await createTramite({
              tenantId: this.tenantId,
              sessionId: this.sessionId,
              endUserId: this.endUserId,
              tramiteType: inp.tramite_type,
              collectedData: inp.collected_data,
              pendingFields: inp.pending_fields,
              supabaseUrl: this.supabaseUrl,
              supabaseKey: this.supabaseKey,
            })
          } else if (block.name === 'update_tramite') {
            const inp = block.input as {
              tramite_id: string
              collected_data: Record<string, unknown>
              pending_fields: string[]
            }
            result = await updateTramite({
              tramiteId: inp.tramite_id,
              collectedData: inp.collected_data,
              pendingFields: inp.pending_fields,
              tenantId: this.tenantId,
              supabaseUrl: this.supabaseUrl,
              supabaseKey: this.supabaseKey,
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
        model: TramiteAgent.MODEL,
        max_tokens: TramiteAgent.MAX_TOKENS,
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

    // Los trámites SIEMPRE van a revisión humana y nunca lanzan
    // EscalationRequired: el checkpoint se crea por política (action
    // con requiresIHApproval al radicar), no por confianza baja.
    // Durante la recopilación requiresIHApproval es false — si fuera
    // true, el engine crearía un checkpoint en cada turno y la
    // conversación de recopilación se congelaría.
    const confidence = parsed.all_fields_collected ? 0.95 : 0.75

    return {
      content: parsed.content,
      confidence,
      reasoning: parsed.reasoning,
      toolsUsed,
      requiresIH: true,
      action: {
        type: parsed.all_fields_collected ? 'tramite_submitted' : 'tramite_in_progress',
        payload: { tramite_type: parsed.tramite_type },
        requiresIHApproval: parsed.all_fields_collected,
      },
      usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
      latencyMs: Date.now() - start,
    }
  }
}
