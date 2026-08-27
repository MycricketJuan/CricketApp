import { createClient } from '@supabase/supabase-js'
import { getTramiteTemplate } from './templates'

// ── findDraftTramite ──────────────────────────────────────────────
// Busca un trámite en borrador ya existente para esta sesión, para
// que el agente no dependa de "recordar" el tramite_id a través del
// historial de conversación en texto plano (que no incluye los
// bloques tool_use/tool_result de turnos anteriores).

export interface DraftTramite {
  id: string
  tramiteType: string
  label: string
  collectedData: Record<string, unknown>
  pendingFields: string[]
}

export async function findDraftTramite(params: {
  sessionId: string
  supabaseUrl: string
  supabaseKey: string
}): Promise<DraftTramite | null> {
  const { sessionId, supabaseUrl, supabaseKey } = params
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data } = await supabase
    .from('tramites')
    .select('id, tramite_type, label, collected_data, pending_fields')
    .eq('session_id', sessionId)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    tramiteType: data.tramite_type,
    label: data.label,
    collectedData: data.collected_data as Record<string, unknown>,
    pendingFields: data.pending_fields as string[],
  }
}

// ── createTramite ─────────────────────────────────────────────────

export interface CreateTramiteParams {
  tenantId: string
  sessionId: string
  endUserId: string
  tramiteType: string
  collectedData: Record<string, unknown>
  pendingFields: string[]
  supabaseUrl: string
  supabaseKey: string
}

export async function createTramite(params: CreateTramiteParams): Promise<string> {
  const {
    tenantId, sessionId, endUserId,
    tramiteType, collectedData, pendingFields,
    supabaseUrl, supabaseKey,
  } = params

  const template = getTramiteTemplate(tramiteType)
  if (!template) {
    return JSON.stringify({ success: false, error: `Tipo de trámite no reconocido: ${tramiteType}` })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const isComplete = pendingFields.length === 0
  const now = new Date()
  const slaDeadline = new Date(now.getTime() + template.sla_hours * 3600000).toISOString()

  const { data: tramite, error: insertError } = await supabase
    .from('tramites')
    .insert({
      tenant_id: tenantId,
      session_id: sessionId,
      end_user_id: endUserId,
      tramite_type: tramiteType,
      label: template.label,
      status: isComplete ? 'submitted' : 'draft',
      collected_data: collectedData,
      pending_fields: pendingFields,
      documents_required: template.documents_required.map((d) => ({ ...d, provided: false })),
      sla_hours: template.sla_hours,
      sla_deadline: isComplete ? slaDeadline : null,
      submitted_at: isComplete ? now.toISOString() : null,
    })
    .select('id, status')
    .single()

  if (insertError || !tramite) {
    return JSON.stringify({ success: false, error: insertError?.message ?? 'Insert falló' })
  }

  await supabase.from('audit_log').insert({
    tenant_id: tenantId,
    session_id: sessionId,
    actor_type: 'SYSTEM',
    event_type: isComplete ? 'tramite.submitted' : 'tramite.created',
    payload: {
      tramite_id: tramite.id,
      tramite_type: tramiteType,
      status: tramite.status,
    },
  })

  return JSON.stringify({
    success: true,
    tramite_id: tramite.id,
    status: tramite.status,
    pending_fields: pendingFields,
    confirmation_message: isComplete ? template.confirmation_message : null,
  })
}

// ── updateTramite ─────────────────────────────────────────────────

export interface UpdateTramiteParams {
  tramiteId: string
  collectedData: Record<string, unknown>
  pendingFields: string[]
  tenantId: string
  supabaseUrl: string
  supabaseKey: string
}

export async function updateTramite(params: UpdateTramiteParams): Promise<string> {
  const { tramiteId, collectedData, pendingFields, tenantId, supabaseUrl, supabaseKey } = params

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: existing, error: fetchError } = await supabase
    .from('tramites')
    .select('id, tramite_type, status, collected_data, sla_hours, session_id')
    .eq('id', tramiteId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !existing) {
    return JSON.stringify({ success: false, error: 'Trámite no encontrado para este tenant' })
  }

  // collected_data se acumula: merge con lo existente, no reemplazo
  const mergedData = {
    ...(existing.collected_data as Record<string, unknown>),
    ...collectedData,
  }

  const isComplete = pendingFields.length === 0
  const now = new Date()

  const updateData: Record<string, unknown> = {
    collected_data: mergedData,
    pending_fields: pendingFields,
  }

  if (isComplete && existing.status === 'draft') {
    updateData.status = 'submitted'
    updateData.submitted_at = now.toISOString()
    updateData.sla_deadline = new Date(
      now.getTime() + (existing.sla_hours as number) * 3600000,
    ).toISOString()
  }

  const { data: updated, error: updateError } = await supabase
    .from('tramites')
    .update(updateData)
    .eq('id', tramiteId)
    .eq('tenant_id', tenantId)
    .select('id, status')
    .single()

  if (updateError || !updated) {
    return JSON.stringify({ success: false, error: updateError?.message ?? 'Update falló' })
  }

  if (isComplete && existing.status === 'draft') {
    await supabase.from('audit_log').insert({
      tenant_id: tenantId,
      session_id: existing.session_id,
      actor_type: 'SYSTEM',
      event_type: 'tramite.submitted',
      payload: {
        tramite_id: tramiteId,
        tramite_type: existing.tramite_type,
        status: updated.status,
      },
    })
  }

  const template = getTramiteTemplate(existing.tramite_type as string)

  return JSON.stringify({
    success: true,
    tramite_id: updated.id,
    status: updated.status,
    pending_fields: pendingFields,
    confirmation_message:
      isComplete && template ? template.confirmation_message : null,
  })
}

// ── Definiciones de tools para el agentic loop ────────────────────

export const IDENTIFY_TRAMITE_TOOL = {
  name: 'identify_tramite',
  description:
    'Identifica el tipo de trámite que quiere iniciar el cliente y carga el template con los campos requeridos. Llamar al inicio de la conversación.',
  input_schema: {
    type: 'object' as const,
    properties: {
      tramite_type: {
        type: 'string',
        description:
          'Tipo detectado: apertura_cuenta, solicitud_credito, tarjeta_credito, actualizacion_datos, cdt, reclamacion, paz_y_salvo, levantamiento_de_prenda',
      },
    },
    required: ['tramite_type'],
  },
}

export const CREATE_TRAMITE_TOOL = {
  name: 'create_tramite',
  description:
    'Crea el registro en borrador (draft) del trámite. Llamar UNA sola vez, inmediatamente después de identify_tramite, con collected_data vacío y pending_fields igual a todos los campos requeridos del template — NO esperar a que el cliente termine de responder. Los datos que se vayan recopilando después se guardan con update_tramite. Si ya existe un trámite en curso para esta sesión (ver TRÁMITE EN CURSO en el contexto), no volver a llamar esta tool.',
  input_schema: {
    type: 'object' as const,
    properties: {
      tramite_type: { type: 'string' },
      collected_data: {
        type: 'object',
        description: 'Todos los datos recopilados como key-value',
      },
      pending_fields: {
        type: 'array',
        description: 'Campos que faltan. Vacío si está completo.',
        items: { type: 'string' },
      },
    },
    required: ['tramite_type', 'collected_data', 'pending_fields'],
  },
}

export const UPDATE_TRAMITE_TOOL = {
  name: 'update_tramite',
  description:
    'Actualiza el trámite en borrador con cada nuevo dato recopilado (una llamada por campo). Cuando pending_fields queda vacío, el trámite pasa automáticamente de draft a submitted — llamar así solo tras la confirmación explícita del cliente.',
  input_schema: {
    type: 'object' as const,
    properties: {
      tramite_id: { type: 'string' },
      collected_data: { type: 'object' },
      pending_fields: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['tramite_id', 'collected_data', 'pending_fields'],
  },
}
