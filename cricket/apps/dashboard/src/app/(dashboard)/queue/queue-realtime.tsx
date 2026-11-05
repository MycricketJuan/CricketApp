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
  metadata: { briefing?: { urgency?: string } } | null
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
  neutral: 'bg-surface-200 text-ink-muted',
  positive: 'bg-green-100 text-green-700',
}

const CHANNEL_BADGE: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-700',
  web_chat: 'bg-primary-tint text-primary',
  email: 'bg-surface-200 text-ink-muted',
}

const TRIGGER_BADGE: Record<string, string> = {
  policy: 'bg-amber-100 text-amber-700',
  low_confidence: 'bg-orange-100 text-orange-700',
  compliance: 'bg-red-100 text-red-700',
}

// Briefing del HandoffAgent: 4 líneas 👤🎯⚠️✅ → una por párrafo.
// null → el handoff aún corre en background; texto plano → fallback.
function ContextSummary({ summary }: { summary: string | null }) {
  if (!summary) {
    return <span className="text-xs text-ink-subtle">Generando resumen…</span>
  }
  if (summary.includes('👤')) {
    return (
      <div>
        {summary.split('\n').map((line, i) => (
          <div key={i} className="text-xs text-ink-muted mb-0.5">
            {line}
          </div>
        ))}
      </div>
    )
  }
  return <div className="text-xs text-ink-muted">{summary}</div>
}

function Badge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className ?? 'bg-surface-200 text-ink-muted'}`}>
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
    const supabase = createClient()
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
        <h2 className="text-sm font-medium text-ink-subtle uppercase tracking-wide">
          Escalaciones activas
        </h2>

        {escalations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-soft py-12 text-ink-subtle">
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
        <h2 className="text-sm font-medium text-ink-subtle uppercase tracking-wide">
          Checkpoints pendientes
        </h2>

        {checkpoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-soft py-12 text-ink-subtle">
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
    <div className="rounded-xl border border-border-soft bg-surface-100 p-4 shadow-sm space-y-3">
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
          {esc.metadata?.briefing?.urgency === 'high' && (
            <Badge label="Urgente" className="bg-red-100 text-red-700" />
          )}
          <span className="text-xs text-ink-subtle">{esc.trigger_reason}</span>
        </div>
        <span className="shrink-0 text-xs text-ink-subtle">{timeAgo}</span>
      </div>

      <ContextSummary summary={esc.context_summary} />

      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => takeControl(session.id))}
          className="flex-1 rounded-lg bg-primary py-1.5 text-sm font-medium text-white
                     hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? 'Tomando control…' : 'Tomar control'}
        </button>
        <button
          type="button"
          disabled
          title="Próximamente"
          className="rounded-lg border border-border-soft px-3 py-1.5 text-sm
                     text-ink-subtle cursor-not-allowed"
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
    <div className="rounded-xl border border-border-soft bg-surface-100 p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            label={chk.trigger_reason}
            className={TRIGGER_BADGE[chk.trigger_reason] ?? 'bg-surface-200 text-ink-muted'}
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
        <p className={`text-xs font-medium ${conf < 0.6 ? 'text-red-600' : 'text-ink-subtle'}`}>
          Confianza: {conf.toFixed(2)}
        </p>
      )}

      {chk.ai_recommendation && (
        <p className="text-sm text-ink-muted line-clamp-2">
          {chk.ai_recommendation.length > 150
            ? chk.ai_recommendation.slice(0, 150) + '…'
            : chk.ai_recommendation}
        </p>
      )}

      <button
        type="button"
        onClick={onResolve}
        className="w-full rounded-lg border border-border-strong py-1.5 text-sm font-medium
                   text-ink-muted hover:bg-surface-000"
      >
        Resolver
      </button>
    </div>
  )
}
