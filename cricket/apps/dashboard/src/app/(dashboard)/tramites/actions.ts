'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { uploadTramiteDocument } from '@cricket/core/supabase/storage'
import { sendWhatsAppMessage } from '@cricket/core/twilio'
import { getTramiteTemplate } from '@cricket/agents/tramites/templates'
import { generatePazYSalvoPdf } from '@cricket/agents/tramites/pdf'
import { getTramitesAdmin } from '@/lib/tramites/db'
import { getAuth0 } from '@/lib/auth0'
import { VALID_TRANSITIONS, RESOLVED_STATUSES } from './status'

// Re-valida la deuda y genera + envía el certificado por WhatsApp
// cuando un operador aprueba un paz_y_salvo. Nunca se genera de forma
// autónoma por la IA — solo tras aprobación humana explícita.
async function issuePazYSalvoPdf(params: {
  tramiteId: string
  tenantId: string
  tenantName: string
  collectedData: Record<string, unknown>
  whatsapp: string | null
  customerName: string | null
}): Promise<{ pdfUrl: string } | { error: string }> {
  const { tramiteId, tenantId, tenantName, collectedData, whatsapp, customerName } = params
  const documentNumber = collectedData.numero_documento as string | undefined

  if (!documentNumber) {
    return { error: 'El trámite no tiene número de documento registrado — no se puede generar el certificado' }
  }

  const db = getSupabaseAdmin()
  const { data: debt } = await db
    .from('mock_client_debts')
    .select('has_debt, debt_detail')
    .eq('tenant_id', tenantId)
    .eq('document_number', documentNumber)
    .maybeSingle()

  if (debt?.has_debt) {
    return { error: `El cliente tiene una deuda pendiente (${debt.debt_detail ?? 'sin detalle'}) — no se puede emitir el paz y salvo` }
  }

  const pdfBytes = await generatePazYSalvoPdf({
    tenantName,
    tramiteId,
    customerName,
    documentNumber,
    producto: (collectedData.producto as string) ?? 'no especificado',
    destinoCertificado: (collectedData.destino_certificado as string) ?? 'no especificado',
    issuedAt: new Date(),
  })

  let pdfUrl: string
  try {
    pdfUrl = await uploadTramiteDocument(
      `${tenantId}/${tramiteId}/paz-y-salvo.pdf`,
      pdfBytes,
      'application/pdf',
    )
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'No se pudo subir el certificado' }
  }

  if (whatsapp) {
    await sendWhatsAppMessage({
      to: whatsapp,
      body: 'Tu certificado de paz y salvo fue aprobado. Adjunto encontrarás el documento.',
      mediaUrl: pdfUrl,
    })
  }

  return { pdfUrl }
}

// Pasos del levantamiento de prenda que solo puede disparar un
// operador humano (IA First, IH Always) — la IA nunca los avanza.
const PRENDA_OPERATOR_ACTIONS = {
  send_for_signature: {
    fromStage: 'document_confirmed',
    toStage: 'awaiting_signature',
    customerMessage: (label: string) =>
      `Hemos generado tu documento de ${label.toLowerCase()}. En breve recibirás un enlace por este mismo canal para firmarlo digitalmente.`,
  },
  confirm_payment: {
    fromStage: 'payment_uploaded',
    toStage: 'payment_confirmed',
    customerMessage: () =>
      'Confirmamos la recepción y validación de tu comprobante de pago. Estamos agendando el envío del documento a tu domicilio.',
  },
  mark_dispatched: {
    fromStage: 'payment_confirmed',
    toStage: 'dispatched',
    customerMessage: (label: string) =>
      `Tu ${label.toLowerCase()} fue despachado y llegará a tu domicilio en los próximos días.`,
  },
} as const

type PrendaAction = keyof typeof PRENDA_OPERATOR_ACTIONS

interface ActionResult {
  error?: string
}

export async function updateTramiteStatus(formData: FormData): Promise<ActionResult> {
  const session = await getAuth0().getSession()
  if (!session) redirect('/auth/login')
  const actorId = session.user.sub as string

  const tramiteId = formData.get('tramiteId') as string
  const newStatus = formData.get('newStatus') as string
  const assignedTo = (formData.get('assignedTo') as string) || null
  const internalNotes = ((formData.get('internalNotes') as string) ?? '').trim() || null
  const customerMessage = ((formData.get('customerMessage') as string) ?? '').trim() || null

  if (!tramiteId || !newStatus) {
    return { error: 'Datos incompletos' }
  }

  const db = getSupabaseAdmin()

  // Tenant del subdominio — el trámite debe pertenecerle
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug') ?? ''
  const { data: tenant } = await db
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) {
    return { error: `Tenant no encontrado: ${tenantSlug}` }
  }

  const tramitesDb = getTramitesAdmin()

  const { data: tramite } = await tramitesDb
    .from('tramites')
    .select('id, status, sla_hours, session_id, tramite_type, assigned_to, collected_data, end_users(channel_ids, profile)')
    .eq('id', tramiteId)
    .eq('tenant_id', tenant.id)
    .single()

  if (!tramite) {
    return { error: 'Trámite no encontrado' }
  }

  const fromStatus = tramite.status as string
  const statusChanged = newStatus !== fromStatus

  // Validar transición — el select del cliente solo ofrece las válidas,
  // pero el server action es la barrera real
  if (statusChanged && !(VALID_TRANSITIONS[fromStatus] ?? []).includes(newStatus)) {
    return { error: `Transición inválida: ${fromStatus} → ${newStatus}` }
  }

  const now = new Date()
  const updateData: Record<string, unknown> = {
    status: newStatus,
    internal_notes: internalNotes,
    customer_message: customerMessage,
  }

  // Al aprobar un paz_y_salvo, re-validar deuda, generar el certificado
  // y enviarlo por WhatsApp antes de confirmar el cambio de estado —
  // si algo falla, el trámite se queda como estaba y el operador ve el error.
  if (statusChanged && newStatus === 'approved' && tramite.tramite_type === 'paz_y_salvo') {
    const endUser = tramite.end_users as { channel_ids?: Record<string, string>; profile?: Record<string, unknown> } | null
    const result = await issuePazYSalvoPdf({
      tramiteId,
      tenantId: tenant.id,
      tenantName: tenant.name,
      collectedData: tramite.collected_data as Record<string, unknown>,
      whatsapp: endUser?.channel_ids?.whatsapp ?? null,
      customerName: typeof endUser?.profile?.name === 'string' ? (endUser.profile.name as string) : null,
    })
    if ('error' in result) {
      return { error: result.error }
    }
    updateData.collected_data = { ...(tramite.collected_data as Record<string, unknown>), pdf_url: result.pdfUrl }
  }

  if (assignedTo !== tramite.assigned_to) {
    updateData.assigned_to = assignedTo
    updateData.assigned_at = assignedTo ? now.toISOString() : null
  }

  if (statusChanged && newStatus === 'submitted') {
    updateData.submitted_at = now.toISOString()
    updateData.sla_deadline = new Date(
      now.getTime() + (tramite.sla_hours as number) * 3600000,
    ).toISOString()
  }

  if (statusChanged && RESOLVED_STATUSES.includes(newStatus)) {
    updateData.resolved_at = now.toISOString()
    updateData.resolution = newStatus
  }

  const { error: updateError } = await tramitesDb
    .from('tramites')
    .update(updateData)
    .eq('id', tramiteId)
    .eq('tenant_id', tenant.id)

  if (updateError) {
    return { error: updateError.message }
  }

  // actor_id es UUID en el schema y el sub de Auth0 no lo es —
  // la atribución del humano va en payload.actor_sub
  await db.from('audit_log').insert({
    tenant_id: tenant.id,
    session_id: tramite.session_id,
    actor_type: 'HUMAN',
    event_type: 'tramite.status_changed',
    payload: {
      tramite_id: tramiteId,
      tramite_type: tramite.tramite_type,
      from_status: fromStatus,
      to_status: newStatus,
      assigned_to: assignedTo,
      has_customer_message: Boolean(customerMessage),
      pdf_generated: Boolean((updateData.collected_data as Record<string, unknown> | undefined)?.pdf_url),
      actor_sub: actorId,
    },
  })

  revalidatePath('/tramites')
  revalidatePath(`/tramites/${tramiteId}`)
  return {}
}

// Avanza las etapas del levantamiento de prenda que requieren acción
// humana (enviar a firma, validar pago, marcar despacho). Distinto de
// updateTramiteStatus: aquí se mueve collected_data.stage, no el status
// general del trámite (que el operador sigue gestionando aparte).
export async function advancePrendaStage(formData: FormData): Promise<ActionResult> {
  const session = await getAuth0().getSession()
  if (!session) redirect('/auth/login')
  const actorId = session.user.sub as string

  const tramiteId = formData.get('tramiteId') as string
  const action = formData.get('action') as PrendaAction

  const config = PRENDA_OPERATOR_ACTIONS[action]
  if (!tramiteId || !config) {
    return { error: 'Acción inválida' }
  }

  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug') ?? ''
  const db = getSupabaseAdmin()
  const { data: tenant } = await db.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return { error: `Tenant no encontrado: ${tenantSlug}` }

  const tramitesDb = getTramitesAdmin()
  const { data: tramite } = await tramitesDb
    .from('tramites')
    .select('id, tramite_type, collected_data, session_id, end_users(channel_ids)')
    .eq('id', tramiteId)
    .eq('tenant_id', tenant.id)
    .single()

  if (!tramite) return { error: 'Trámite no encontrado' }

  const collectedData = tramite.collected_data as Record<string, unknown>
  const currentStage = collectedData.stage as string | undefined

  if (currentStage !== config.fromStage) {
    return { error: `El trámite está en la etapa "${currentStage}", no en "${config.fromStage}"` }
  }

  const isFinalStep = action === 'mark_dispatched'
  const nextStatus = isFinalStep ? 'completed' : undefined

  const { error: updateError } = await tramitesDb
    .from('tramites')
    .update({
      collected_data: { ...collectedData, stage: config.toStage },
      ...(nextStatus ? { status: nextStatus, resolved_at: new Date().toISOString(), resolution: 'approved' } : {}),
    })
    .eq('id', tramiteId)
    .eq('tenant_id', tenant.id)

  if (updateError) return { error: updateError.message }

  await db.from('audit_log').insert({
    tenant_id: tenant.id,
    session_id: tramite.session_id,
    actor_type: 'HUMAN',
    event_type: 'tramite.prenda_stage_advanced',
    payload: { tramite_id: tramiteId, action, from_stage: config.fromStage, to_stage: config.toStage, actor_sub: actorId },
  })

  const whatsapp = (tramite.end_users as { channel_ids?: Record<string, string> } | null)?.channel_ids?.whatsapp
  const template = getTramiteTemplate(tramite.tramite_type as string)
  let message = template ? config.customerMessage(template.label) : null
  if (action === 'send_for_signature' && message) {
    const baseUrl = process.env.APP_BASE_URL ?? ''
    message = `${message} ${baseUrl}/firmar/${tramiteId}`
  }
  if (whatsapp && message) {
    await sendWhatsAppMessage({ to: whatsapp, body: message })
  }

  revalidatePath('/tramites')
  revalidatePath(`/tramites/${tramiteId}`)
  return {}
}
