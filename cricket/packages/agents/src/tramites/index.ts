import Anthropic from '@anthropic-ai/sdk'
import type { AgentInput, AgentOutput } from '@cricket/core/types'
import { TRAMITE_TEMPLATES, getTramiteTemplate, PRENDA_STAGES } from './templates'
import {
  createTramite,
  updateTramite,
  findDraftTramite,
  IDENTIFY_TRAMITE_TOOL,
  CREATE_TRAMITE_TOOL,
  UPDATE_TRAMITE_TOOL,
} from './tramite-tool'
import { checkDebtStatus, CHECK_DEBT_TOOL } from './debt-tool'
import { extractVehicleDocument, EXTRACT_DOCUMENT_TOOL } from './vision-tool'
import { advancePrendaStage, ADVANCE_PRENDA_TOOL } from './prenda-tool'

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

    // Fuente de verdad server-side del trámite en curso — el modelo NO
    // debe depender de "recordar" el tramite_id entre turnos, porque el
    // historial de conversación reconstruido es texto plano y no incluye
    // los bloques tool_use/tool_result de turnos anteriores.
    const draft = await findDraftTramite({
      sessionId: this.sessionId,
      supabaseUrl: this.supabaseUrl,
      supabaseKey: this.supabaseKey,
    })

    const draftContext = draft
      ? `\n\nTRÁMITE EN CURSO (ya existe en la base de datos — no lo dupliques):
tramite_id: ${draft.id}
tipo: ${draft.tramiteType}
collected_data: ${JSON.stringify(draft.collectedData)}
pending_fields: ${JSON.stringify(draft.pendingFields)}
Usa update_tramite con este tramite_id para continuar. NO llames identify_tramite ni create_tramite de nuevo para este trámite.`
      : ''

    const basePrompt = `Eres el agente de trámites bancarios de Cricket. Tu trabajo es ayudar al cliente a radicar solicitudes formales ante el banco: apertura de cuentas, créditos, tarjetas, certificados y reclamaciones.

IMPORTANTE: Tú recopilas la información y radicas el trámite. El banco lo procesa y responde. Nunca prometas cuándo exactamente responderá el banco (solo el SLA estándar), y nunca garantices la aprobación.

PROCESO OBLIGATORIO:

PASO 1 — Identificar el trámite y dejar registro inmediatamente:
Detectar qué trámite quiere iniciar el cliente. Si no está claro, preguntar directamente: "¿Qué deseas solicitar?" y listar las opciones disponibles.
Si NO hay un TRÁMITE EN CURSO ya cargado en el contexto: llamar identify_tramite con el tipo detectado, y a continuación, en el mismo turno, llamar create_tramite con collected_data: {} y pending_fields igual a TODOS los campos requeridos del template. Esto deja un registro en borrador visible para el equipo humano desde el primer mensaje, aunque el cliente no termine la conversación.
Si YA hay un TRÁMITE EN CURSO en el contexto: no repitas este paso, continúa directamente en el PASO 2 usando ese tramite_id.

PASO 2 — Recopilar datos (un campo a la vez):
Hacer UNA sola pregunta por turno — nunca un formulario de preguntas.
Usar exactamente el texto de "question" del template para cada campo.
Tras cada respuesta del cliente, llamar update_tramite con el tramite_id (el que acabas de crear o el del TRÁMITE EN CURSO) para guardar el dato y achicar pending_fields.
Confirmar cada dato antes de pasar al siguiente:
"Perfecto, anotado. Ahora, [siguiente pregunta]"

PASO 3 — Confirmar todo antes de radicar:
Cuando tengas todos los campos, hacer un resumen completo de lo recopilado y preguntar: "¿Confirmas que estos datos son correctos para radicar tu [trámite]?"
Solo llamar update_tramite con pending_fields vacío cuando el cliente confirme — antes de eso, aunque ya tengas todos los datos, mantenlos en collected_data sin vaciar pending_fields.

PASO 4 — Radicar y cerrar:
Llamar update_tramite con collected_data completo y pending_fields vacío (esto transiciona el trámite de borrador a radicado automáticamente).
NUNCA escribas el mensaje de confirmación del template sin haber llamado antes update_tramite en ESTE mismo turno y haber recibido "success":true en el resultado del tool. Si el resultado trae "success":false, informa al cliente que hubo un problema técnico y que un asesor lo contactará — no inventes que quedó radicado.
Comunicar el mensaje de confirmación del template (incluye el SLA) solo tras confirmar success:true.
Indicar que recibirá novedades por el mismo canal.

REGLAS DE ORO:
- Nunca inventar información del cliente
- Si el cliente no sabe un dato, anotar 'por_definir' y continuar
- El draft ya se creó en el PASO 1 — si el cliente cancela el trámite, simplemente déjalo como está (no se pierde la información, ya quedó guardada campo a campo con update_tramite)
- Documentos: informar qué documentos necesitará pero aclarar que los entregará en sucursal o por el canal que indique el especialista asignado

CASO ESPECIAL — paz_y_salvo:
Tras recopilar numero_documento, llama SIEMPRE check_debt_status antes de pedir confirmación final.
Si has_debt es true: informa el detalle de la deuda con empatía, indica que no se puede emitir el paz y salvo mientras exista deuda pendiente, y llama update_tramite con collected_data (incluyendo blocked_reason con el detalle) y pending_fields: ["pago_deuda"] para dejar registro sin radicar.
Si has_debt es false: continúa el flujo normal hasta radicar.

CASO ESPECIAL — levantamiento_de_prenda (flujo por etapas, en collected_data.stage):
Etapas: ${PRENDA_STAGES.join(', ')}.
1. Recopila placa y entidad_prendaria, luego llama update_tramite con collected_data: {placa, entidad_prendaria, stage: "awaiting_document"} y pending_fields: ["tarjeta_propiedad", "comprobante_pago"]. Pide al cliente que adjunte una foto de la tarjeta de propiedad.
2. Cuando el mensaje del cliente traiga un adjunto y stage sea awaiting_document, llama extract_document_data para leerlo, luego advance_prenda_stage con new_stage: "document_extracted" y los datos leídos.
3. Presenta los datos extraídos y pide confirmación. Si el cliente confirma, llama advance_prenda_stage con new_stage: "document_confirmed".
4. Al llegar a document_confirmed, informa al cliente que un especialista generará el documento de levantamiento para firma digital y le llegará un enlace por este mismo canal — NO intentes avanzar más la etapa tú mismo, eso lo hace el operador.
5. Cuando el cliente indique que ya firmó y stage sea awaiting_payment (lo mueve el operador), pide que adjunte el comprobante de pago; al recibirlo llama advance_prenda_stage con new_stage: "payment_uploaded".
6. De ahí en adelante (validación de pago y despacho a domicilio) es responsabilidad exclusiva de un operador humano — informa al cliente que su comprobante quedó en revisión.
Nunca simules que un humano firmó, validó un pago o despachó el documento: esas transiciones solo las dispara un operador.

CONTEXTO:
Canal: ${context.channel} | Etapa: ${context.currentStage} | Cliente ID: ${context.endUserId}${context.attachmentUrl ? ' | Adjunto recibido: sí' : ''}${draftContext}

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
      CHECK_DEBT_TOOL,
      EXTRACT_DOCUMENT_TOOL,
      ADVANCE_PRENDA_TOOL,
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
          } else if (block.name === 'check_debt_status') {
            const { document_number } = block.input as { document_number: string }
            result = await checkDebtStatus({
              tenantId: this.tenantId,
              documentNumber: document_number,
              supabaseUrl: this.supabaseUrl,
              supabaseKey: this.supabaseKey,
            })
          } else if (block.name === 'extract_document_data') {
            if (!context.attachmentUrl) {
              result = JSON.stringify({ error: 'No hay ningún adjunto en este mensaje' })
            } else {
              try {
                const extracted = await extractVehicleDocument(context.attachmentUrl, this.client)
                result = JSON.stringify(extracted)
              } catch (err) {
                result = JSON.stringify({ error: err instanceof Error ? err.message : 'Error leyendo el documento' })
              }
            }
          } else if (block.name === 'advance_prenda_stage') {
            const inp = block.input as {
              tramite_id: string
              new_stage: string
              data: Record<string, unknown>
            }
            result = await advancePrendaStage({
              tramiteId: inp.tramite_id,
              tenantId: this.tenantId,
              newStage: inp.new_stage,
              data: inp.data,
              supabaseUrl: this.supabaseUrl,
              supabaseKey: this.supabaseKey,
            })
          } else {
            result = JSON.stringify({ error: `Tool desconocida: ${block.name}` })
          }

          console.log('[TramiteAgent] tool', block.name, 'input=', JSON.stringify(block.input), 'result=', result)

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
