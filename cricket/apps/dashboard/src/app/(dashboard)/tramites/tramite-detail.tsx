'use client'

import { useState, useTransition } from 'react'
import { updateTramiteStatus } from './actions'
import { STATUS_LABEL, VALID_TRANSITIONS } from './status'

// ── Tipos exportados para uso en [id]/page.tsx ────────────────────

export interface TramiteDetailRow {
  id: string
  tramite_type: string
  label: string
  status: string
  collected_data: Record<string, unknown>
  pending_fields: string[]
  documents_required: Array<{ name: string; description: string; provided: boolean }>
  assigned_to: string | null
  internal_notes: string | null
  customer_message: string | null
  resolution: string | null
  sla_hours: number
  sla_deadline: string | null
  submitted_at: string | null
  assigned_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  end_users: {
    channel_ids: Record<string, string>
    profile: Record<string, unknown>
  } | null
  tenant_users: { id: string; full_name: string | null; email: string | null } | null
}

export interface OperatorRow {
  id: string
  full_name: string | null
  role: string
}

const MESSAGE_STATUSES = ['approved', 'rejected', 'pending_docs']

export function TramiteDetail({
  tramite,
  operators,
}: {
  tramite: TramiteDetailRow
  operators: OperatorRow[]
}) {
  const [isPending, startTransition] = useTransition()
  const [selectedOperator, setSelectedOperator] = useState(tramite.assigned_to ?? '')
  const [status, setStatus] = useState(tramite.status)
  const [notes, setNotes] = useState(tramite.internal_notes ?? '')
  const [customerMessage, setCustomerMessage] = useState(tramite.customer_message ?? '')
  const [error, setError] = useState<string | null>(null)

  const allowedNext = VALID_TRANSITIONS[tramite.status] ?? []
  const isFinal = allowedNext.length === 0
  const showCustomerMessage = MESSAGE_STATUSES.includes(status)

  const customerName =
    typeof tramite.end_users?.profile?.name === 'string'
      ? (tramite.end_users.profile.name as string)
      : null
  const whatsapp = tramite.end_users?.channel_ids?.whatsapp ?? null
  const email = tramite.end_users?.channel_ids?.email ?? null

  function handleSubmit() {
    setError(null)
    const formData = new FormData()
    formData.set('tramiteId', tramite.id)
    formData.set('newStatus', status)
    formData.set('assignedTo', selectedOperator)
    formData.set('internalNotes', notes)
    formData.set('customerMessage', customerMessage)

    startTransition(async () => {
      const result = await updateTramiteStatus(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
        Gestión del trámite
      </h2>

      {/* Contacto del cliente */}
      <div className="rounded-lg bg-gray-50 p-3 space-y-1">
        {customerName && (
          <p className="text-sm font-medium text-gray-900">{customerName}</p>
        )}
        {whatsapp && <p className="text-sm text-gray-600">WhatsApp: {whatsapp}</p>}
        {email && <p className="text-sm text-gray-600">Email: {email}</p>}
        {!customerName && !whatsapp && !email && (
          <p className="text-sm text-gray-400">Sin datos de contacto</p>
        )}
      </div>

      {/* Asignación */}
      <section className="space-y-1">
        <label htmlFor="assigned_to" className="text-sm font-medium text-gray-700">
          Asignado a
        </label>
        <select
          id="assigned_to"
          value={selectedOperator}
          onChange={(e) => setSelectedOperator(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
        >
          <option value="">Sin asignar</option>
          {operators.map((op) => (
            <option key={op.id} value={op.id}>
              {op.full_name ?? op.id} ({op.role})
            </option>
          ))}
        </select>
      </section>

      {/* Cambio de estado */}
      <section className="space-y-1">
        <label htmlFor="status" className="text-sm font-medium text-gray-700">
          Estado del trámite
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={isFinal}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm
                     text-gray-700 disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value={tramite.status}>
            {STATUS_LABEL[tramite.status] ?? tramite.status} (actual)
          </option>
          {allowedNext.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s] ?? s}
            </option>
          ))}
        </select>
        {isFinal && (
          <p className="text-xs text-gray-400">Este trámite está en un estado final</p>
        )}
      </section>

      {/* Notas internas */}
      <section className="space-y-1">
        <label htmlFor="internal_notes" className="text-sm font-medium text-gray-700">
          Notas internas{' '}
          <span className="font-normal text-gray-400">(no visibles para el cliente)</span>
        </label>
        <textarea
          id="internal_notes"
          name="internal_notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observaciones del analista..."
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm
                     placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
        />
      </section>

      {/* Mensaje al cliente — solo en estados resueltos */}
      {showCustomerMessage && (
        <section className="space-y-1">
          <label htmlFor="customer_message" className="text-sm font-medium text-gray-700">
            Mensaje para el cliente
          </label>
          <textarea
            id="customer_message"
            name="customer_message"
            rows={3}
            value={customerMessage}
            onChange={(e) => setCustomerMessage(e.target.value)}
            placeholder="Este mensaje se enviará al cliente por WhatsApp..."
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm
                       placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
          />
          <p className="text-xs text-gray-400">
            Si dejas este campo vacío, se usará el mensaje estándar del trámite.
          </p>
        </section>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full rounded-lg bg-black py-2 text-sm font-medium text-white
                   hover:bg-gray-900 disabled:opacity-60"
      >
        {isPending ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}
