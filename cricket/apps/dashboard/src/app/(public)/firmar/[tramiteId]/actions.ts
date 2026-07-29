'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { sendWhatsAppMessage } from '@cricket/core/twilio'
import { getTramitesAdmin } from '@/lib/tramites/db'

interface ActionResult {
  error?: string
}

// Firma digital simulada: sin proveedor de firma electrónica real,
// el clic del cliente en este enlace público registra la firma.
// El enlace lo genera un operador desde /tramites al mover el
// trámite a la etapa awaiting_signature (ver PRENDA_OPERATOR_ACTIONS
// en apps/dashboard/.../tramites/actions.ts).
export async function signDocument(tramiteId: string): Promise<ActionResult> {
  const auditDb = getSupabaseAdmin()
  const tramitesDb = getTramitesAdmin()

  const { data: tramite } = await tramitesDb
    .from('tramites')
    .select('id, tenant_id, collected_data, session_id, end_users(channel_ids)')
    .eq('id', tramiteId)
    .eq('tramite_type', 'levantamiento_de_prenda')
    .single()

  if (!tramite) return { error: 'Trámite no encontrado' }

  const collectedData = tramite.collected_data as Record<string, unknown>
  if (collectedData.stage !== 'awaiting_signature') {
    return { error: 'Este documento no está pendiente de firma' }
  }

  const { error: updateError } = await tramitesDb
    .from('tramites')
    .update({ collected_data: { ...collectedData, stage: 'signed', signed_at: new Date().toISOString() } })
    .eq('id', tramiteId)

  if (updateError) return { error: updateError.message }

  await auditDb.from('audit_log').insert({
    tenant_id: tramite.tenant_id,
    session_id: tramite.session_id,
    actor_type: 'HUMAN',
    event_type: 'tramite.prenda_stage_advanced',
    payload: { tramite_id: tramiteId, action: 'client_signed', from_stage: 'awaiting_signature', to_stage: 'signed' },
  })

  const whatsapp = (tramite.end_users as { channel_ids?: Record<string, string> } | null)?.channel_ids?.whatsapp
  if (whatsapp) {
    await sendWhatsAppMessage({
      to: whatsapp,
      body: 'Recibimos tu firma. Ahora envíanos por este chat el comprobante del pago total del crédito para continuar con el levantamiento de la prenda.',
    })
  }

  revalidatePath(`/firmar/${tramiteId}`)
  return {}
}
