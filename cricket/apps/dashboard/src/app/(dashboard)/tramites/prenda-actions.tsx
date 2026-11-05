'use client'

import { useTransition } from 'react'
import { advancePrendaStage } from './actions'

const STAGE_LABEL: Record<string, string> = {
  awaiting_document: 'Esperando tarjeta de propiedad',
  document_extracted: 'Datos extraídos, esperando confirmación del cliente',
  document_confirmed: 'Datos confirmados — listo para enviar a firma',
  awaiting_signature: 'Esperando firma digital del cliente',
  signed: 'Documento firmado — esperando comprobante de pago',
  awaiting_payment: 'Esperando comprobante de pago',
  payment_uploaded: 'Comprobante de pago recibido — pendiente de validar',
  payment_confirmed: 'Pago validado — listo para despachar',
  dispatched: 'Despachado a domicilio',
  completed: 'Completado',
}

const STAGE_ACTION: Record<string, { action: string; label: string } | undefined> = {
  document_confirmed: { action: 'send_for_signature', label: 'Enviar documento para firma digital' },
  payment_uploaded: { action: 'confirm_payment', label: 'Confirmar validación del pago' },
  payment_confirmed: { action: 'mark_dispatched', label: 'Marcar despachado a domicilio' },
}

export function PrendaActions({
  tramiteId,
  stage,
}: {
  tramiteId: string
  stage: string | undefined
}) {
  const [isPending, startTransition] = useTransition()
  const nextAction = stage ? STAGE_ACTION[stage] : undefined

  function handleClick() {
    if (!nextAction) return
    const formData = new FormData()
    formData.set('tramiteId', tramiteId)
    formData.set('action', nextAction.action)
    startTransition(async () => {
      await advancePrendaStage(formData)
    })
  }

  return (
    <div className="space-y-3 rounded-xl border border-border-soft bg-surface-100 p-4 shadow-sm">
      <h2 className="text-sm font-medium uppercase tracking-wide text-ink-subtle">
        Levantamiento de prenda — progreso
      </h2>
      <p className="text-sm text-ink-muted">{STAGE_LABEL[stage ?? ''] ?? stage ?? 'Sin etapa registrada'}</p>
      {nextAction && (
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? 'Procesando...' : nextAction.label}
        </button>
      )}
      {!nextAction && stage !== 'completed' && (
        <p className="text-xs text-ink-subtle">Esperando al cliente antes de la siguiente acción del operador.</p>
      )}
    </div>
  )
}
