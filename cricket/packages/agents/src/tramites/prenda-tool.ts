import { createClient } from '@supabase/supabase-js'
import { PRENDA_STAGES, type PrendaStage } from './templates'

export interface AdvancePrendaStageParams {
  tramiteId: string
  tenantId: string
  newStage: string
  data: Record<string, unknown>
  supabaseUrl: string
  supabaseKey: string
}

// Avanza collected_data.stage del levantamiento de prenda. El agente
// solo puede mover el estado hasta el siguiente paso conversacional
// (adjuntar documento, confirmar datos, adjuntar comprobante de pago).
// Los pasos que dependen de una acción humana (awaiting_signature →
// signed, payment_uploaded → payment_confirmed, dispatched) NO se
// avanzan aquí — los dispara el operador desde el panel de trámites
// (apps/dashboard/.../tramites/actions.ts, advancePrendaStage).
const AGENT_ADVANCEABLE_STAGES = new Set<PrendaStage>([
  'awaiting_document',
  'document_extracted',
  'document_confirmed',
  'awaiting_payment',
  'payment_uploaded',
])

export async function advancePrendaStage(params: AdvancePrendaStageParams): Promise<string> {
  const { tramiteId, tenantId, newStage, data, supabaseUrl, supabaseKey } = params

  if (!PRENDA_STAGES.includes(newStage as PrendaStage)) {
    return JSON.stringify({ success: false, error: `Etapa inválida: ${newStage}` })
  }
  if (!AGENT_ADVANCEABLE_STAGES.has(newStage as PrendaStage)) {
    return JSON.stringify({
      success: false,
      error: `La etapa ${newStage} requiere una acción de un operador humano, no puede avanzarla el agente`,
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: existing, error: fetchError } = await supabase
    .from('tramites')
    .select('id, collected_data, status, session_id')
    .eq('id', tramiteId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !existing) {
    return JSON.stringify({ success: false, error: 'Trámite no encontrado para este tenant' })
  }

  const mergedData = {
    ...(existing.collected_data as Record<string, unknown>),
    ...data,
    stage: newStage,
  }

  // pending_docs mantiene el trámite visible como "en gestión" hasta
  // que un operador lo mueva a in_review/approved en el panel.
  const nextStatus = existing.status === 'draft' ? 'pending_docs' : existing.status

  const { error: updateError } = await supabase
    .from('tramites')
    .update({ collected_data: mergedData, status: nextStatus })
    .eq('id', tramiteId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    return JSON.stringify({ success: false, error: updateError.message })
  }

  await supabase.from('audit_log').insert({
    tenant_id: tenantId,
    session_id: existing.session_id,
    actor_type: 'AI',
    event_type: 'tramite.prenda_stage_advanced',
    payload: { tramite_id: tramiteId, new_stage: newStage },
  })

  return JSON.stringify({ success: true, tramite_id: tramiteId, stage: newStage })
}

export const ADVANCE_PRENDA_TOOL = {
  name: 'advance_prenda_stage',
  description:
    'Actualiza la etapa del levantamiento de prenda cuando el cliente confirma un paso (adjuntó el documento, confirmó que los datos extraídos son correctos, adjuntó el comprobante de pago). Etapas disponibles: ' +
    PRENDA_STAGES.join(', ') +
    '. Solo se pueden avanzar las etapas conversacionales; las etapas que requieren un operador (firma, validación de pago, despacho) las mueve el panel de trámites.',
  input_schema: {
    type: 'object' as const,
    properties: {
      tramite_id: { type: 'string' },
      new_stage: { type: 'string' },
      data: {
        type: 'object',
        description: 'Datos a fusionar en collected_data (ej. los campos extraídos del documento)',
      },
    },
    required: ['tramite_id', 'new_stage', 'data'],
  },
}
