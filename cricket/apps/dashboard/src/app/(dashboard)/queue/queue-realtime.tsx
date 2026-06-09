'use client'

import { createClient } from '@cricket/core/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'
import { CheckpointModal } from './checkpoint-modal'
import { takeControl } from './actions'

// ── Tipos exportados para uso en page.tsx ─────────────────────────

export interface EscalationRow {
  id: string
  trigger_reason: string
  customer_sentiment: string | null
  context_summary: string | null
  created_at: string
  sessions: {
    id: string
    current_stage: string | null
    actor_control: string
    channel: string
    end_users: { channel_ids: Record<string, string> }
  }
}

export interface CheckpointRow {
  id: string
  trigger_reason: string
  ai_recommendation: string | null
  confidence_at_trigger: number | null
  status: string
  created_at: string
  expires_at: string | null
  sessions: { id: string; current_stage: string | null }
}

// ── Cliente Supabase para Realtime (instancia única) ──────────────
const supabase = createClient()

// ── Helpers ───────────────────────────────────────────────────────

function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)}d`
}

function formatTimeLeft(isoString: string): string {
  const diffMs = new Date(isoString).getTime() - Date.now()
  if (diffMs <= 0) return 'expirado'
  const mins = Math.ceil(diffMs / 60000)
  if (mins < 60) return `${mins} min restantes`
  return `${Math.ceil(mins / 60)}h restantes`
}

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  web_chat: 'Web Chat',
  email: 'Email',
}

const SENTIMENT_BADGE: Record<string, string> = {
  frustrated: 'bg-red-100 text-red-700',
  negative: 'bg-amber-100 text-amber-700',
  neutral: 'bg-gray-100 text-gray-600',
  positive: 'bg-green-100 text-green-700',
}

const CHANNEL_BADGE: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-700',
  web_chat: 'bg-blue-100 text-blue-700',
  email: 'bg-gray-100 text-gray-600',
}

const TRIGGER_BADGE: Record<string, string> = {
  policy: 'bg-amber-100 text-amber-700',
  low_confidence: 'bg-orange-100 text-orange-700',
  compliance: 'bg-red-100 text-red-700',
}

function Badge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  )
}

// ── Componente principal ──────────────────────────────────────────

export function QueueRealtime({
  escalations,
  checkpoints,
}: {
  escalations: EscalationRow[]
  checkpoints: CheckpointRow[]
}) {
  const router = useRouter()
  const [activeCheckpoint, setActiveCheckpoint] = useState<CheckpointRow | null>(null)

  // Realtime: re-fetch vía router.refresh() en cualquier cambio
  useEffect(() => {
    const channel = supabase
      .channel('queue-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escalations' },
          () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cognitive_checkpoints' },
          () => router.refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [router])

  return (
    <>
      {/* Sección A — Escalaciones */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Escalaciones activas
        </h2>

        {escalations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 text-gray-400">
            <p className="text-sm">No hay escalaciones activas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {escalations.map((esc) => (
              <EscalationCard
                key={esc.id}
                escalation={esc}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sección B — Checkpoints */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Checkpoints pendientes
        </h2>

        {checkpoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 text-gray-400">
            <p className="text-sm">No hay checkpoints pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {checkpoints.map((chk) => (
              <CheckpointCard
                key={chk.id}
                checkpoint={chk}
                onResolve={() => setActiveCheckpoint(chk)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal — renderizado con position:fixed */}
      {activeCheckpoint && (
        <CheckpointModal
          checkpoint={activeCheckpoint}
          onClose={() => setActiveCheckpoint(null)}
        />
      )}
    </>
  )
}

// ── EscalationCard ────────────────────────────────────────────────

function EscalationCard({ escalation: esc }: { escalation: EscalationRow }) {
  const [isPending, startTransition] = useTransition()
  // Tiempos calculados en cliente para evitar hydration mismatch
  const [timeAgo, setTimeAgo] = useState('')

  useEffect(() => {
    setTimeAgo(formatTimeAgo(esc.created_at))
    const id = setInterval(() => setTimeAgo(formatTimeAgo(esc.created_at)), 60_000)
    return () => clearInterval(id)
  }, [esc.created_at])

  const session = esc.sessions

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            label={CHANNEL_LABEL[session.channel] ?? session.channel}
            className={CHANNEL_BADGE[session.channel]}
          />
          {session.current_stage && (
            <Badge label={session.current_stage} className="bg-purple-100 text-purple-700" />
          )}
          {esc.customer_sentiment && (
            <Badge
              label={esc.customer_sentiment}
              className={SENTIMENT_BADGE[esc.customer_sentiment]}
            />
          )}
          <span className="text-xs text-gray-400">{esc.trigger_reason}</span>
        </div>
        <span className="shrink-0 text-xs text-gray-400">{timeAgo}</span>
      </div>

      {esc.context_summary && (
        <p className="text-sm text-gray-600 line-clamp-2">
          {esc.context_summary.length > 120
            ? esc.context_summary.slice(0, 120) + '…'
            : esc.context_summary}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => takeControl(session.id))}
          className="flex-1 rounded-lg bg-black py-1.5 text-sm font-medium text-white
                     hover:bg-gray-900 disabled:opacity-60"
        >
          {isPending ? 'Tomando control…' : 'Tomar control'}
        </button>
        <button
          type="button"
          disabled
          title="Próximamente"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm
                     text-gray-400 cursor-not-allowed"
        >
          Ver historial
        </button>
      </div>
    </div>
  )
}

// ── CheckpointCard ────────────────────────────────────────────────

function CheckpointCard({
  checkpoint: chk,
  onResolve,
}: {
  checkpoint: CheckpointRow
  onResolve: () => void
}) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!chk.expires_at) return
    setTimeLeft(formatTimeLeft(chk.expires_at))
    const id = setInterval(() => setTimeLeft(formatTimeLeft(chk.expires_at!)), 30_000)
    return () => clearInterval(id)
  }, [chk.expires_at])

  const conf = chk.confidence_at_trigger

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            label={chk.trigger_reason}
            className={TRIGGER_BADGE[chk.trigger_reason] ?? 'bg-gray-100 text-gray-600'}
          />
          {chk.sessions.current_stage && (
            <Badge label={chk.sessions.current_stage} className="bg-purple-100 text-purple-700" />
          )}
        </div>
        {timeLeft && (
          <span className="shrink-0 text-xs text-amber-600 font-medium">{timeLeft}</span>
        )}
      </div>

      {conf !== null && (
        <p className={`text-xs font-medium ${conf < 0.6 ? 'text-red-600' : 'text-gray-500'}`}>
          Confianza: {conf.toFixed(2)}
        </p>
      )}

      {chk.ai_recommendation && (
        <p className="text-sm text-gray-600 line-clamp-2">
          {chk.ai_recommendation.length > 150
            ? chk.ai_recommendation.slice(0, 150) + '…'
            : chk.ai_recommendation}
        </p>
      )}

      <button
        type="button"
        onClick={onResolve}
        className="w-full rounded-lg border border-gray-300 py-1.5 text-sm font-medium
                   text-gray-700 hover:bg-gray-50"
      >
        Resolver
      </button>
    </div>
  )
}
