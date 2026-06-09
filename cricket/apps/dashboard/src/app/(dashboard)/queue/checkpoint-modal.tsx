'use client'

import { useState, useTransition } from 'react'
import { resolveCheckpoint } from './actions'
import type { CheckpointRow } from './queue-realtime'

interface Props {
  checkpoint: CheckpointRow
  onClose: () => void
}

const TRIGGER_LABEL: Record<string, string> = {
  policy: 'Política',
  low_confidence: 'Baja confianza',
  compliance: 'Cumplimiento',
}

const TRIGGER_BADGE: Record<string, string> = {
  policy: 'bg-amber-100 text-amber-700',
  low_confidence: 'bg-orange-100 text-orange-700',
  compliance: 'bg-red-100 text-red-700',
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = value < 0.6 ? 'bg-red-500' : value < 0.8 ? 'bg-amber-400' : 'bg-green-500'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Confianza de la IA</span>
        <span className={value < 0.6 ? 'text-red-600 font-medium' : ''}>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function CheckpointModal({ checkpoint, onClose }: Props) {
  const [overrideToggled, setOverrideToggled] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.append('checkpointId', checkpoint.id)
    formData.append('session_id', checkpoint.sessions.id)
    startTransition(async () => {
      await resolveCheckpoint(formData)
      onClose()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Resolución del checkpoint
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Trigger badge */}
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TRIGGER_BADGE[checkpoint.trigger_reason] ?? 'bg-gray-100 text-gray-600'}`}>
            {TRIGGER_LABEL[checkpoint.trigger_reason] ?? checkpoint.trigger_reason}
          </span>

          {/* Confidence bar */}
          {checkpoint.confidence_at_trigger !== null && (
            <ConfidenceBar value={checkpoint.confidence_at_trigger} />
          )}

          {/* AI Recommendation */}
          {checkpoint.ai_recommendation && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500">Recomendación de la IA</p>
              <div className="max-h-32 overflow-y-auto rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {checkpoint.ai_recommendation}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="ih_decision" className="block text-sm font-medium text-gray-700">
                Decisión <span className="text-red-500">*</span>
              </label>
              <textarea
                id="ih_decision"
                name="ih_decision"
                required
                minLength={10}
                rows={3}
                placeholder="Describe tu decisión y los pasos a seguir…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-black resize-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                id="override_toggle"
                checked={overrideToggled}
                onChange={(e) => setOverrideToggled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-black"
              />
              <span className="text-sm text-gray-700">
                Difiero de la recomendación de la IA
              </span>
            </label>

            {overrideToggled && (
              <div className="space-y-1">
                <label htmlFor="ih_override_reason" className="block text-sm font-medium text-gray-700">
                  Motivo del cambio <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="ih_override_reason"
                  name="ih_override_reason"
                  required
                  minLength={10}
                  rows={2}
                  placeholder="Explica por qué difiere tu decisión de la recomendación…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-black resize-none"
                />
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm
                           font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-lg bg-black py-2 text-sm font-medium
                           text-white hover:bg-gray-900 disabled:opacity-60"
              >
                {isPending ? 'Guardando…' : 'Confirmar decisión'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
