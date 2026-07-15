'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { getTramitesAdmin } from '@/lib/tramites/db'
import { getAuth0 } from '@/lib/auth0'
import { VALID_TRANSITIONS, RESOLVED_STATUSES } from './status'

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
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) {
    return { error: `Tenant no encontrado: ${tenantSlug}` }
  }

  const tramitesDb = getTramitesAdmin()

  const { data: tramite } = await tramitesDb
    .from('tramites')
    .select('id, status, sla_hours, session_id, tramite_type, assigned_to')
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
      actor_sub: actorId,
    },
  })

  revalidatePath('/tramites')
  revalidatePath(`/tramites/${tramiteId}`)
  return {}
}
