import { createClient } from '@cricket/core/supabase/server'
import type { Database } from '@cricket/core/types'
import { SessionsChart } from './sessions-chart'
import type { DailySession } from './sessions-chart'
import { NpsGauge } from './nps-gauge'

type SessionRow    = Database['public']['Tables']['sessions']['Row']
type EscalationRow = Database['public']['Tables']['escalations']['Row']

// nps_responses may not be in generated types until migration 20240102000000 is applied.
// This helper creates its own client so the unknown cast never touches the typed client
// used by the rest of the page — prevents 'never' type contamination downstream.
async function fetchNpsData(
  since: string,
): Promise<Array<{ nps_score: number; nps_category: string }>> {
  try {
    const client = await createClient()
    // Cast only the .from call to bypass the missing table in generated types
    type UntypedFrom = (table: string) => {
      select: (cols: string) => {
        gte: (col: string, val: string) => Promise<{
          data: Array<{ nps_score: number; nps_category: string }> | null
          error: { message: string } | null
        }>
      }
    }
    const { data, error } = await (client.from as unknown as UntypedFrom)('nps_responses')
      .select('nps_score, nps_category')
      .gte('created_at', since)
    if (error || !data) return []
    return data
  } catch {
    return []
  }
}

// ── Tipos ────────────────────────────────────────────────────────────────────

interface NpsMetrics {
  avgScore: number
  npsScore: number
  totalResponses: number
  promoters: number
  passives: number
  detractors: number
  promoterPct: number
  passivePct: number
  detractorPct: number
}

interface SessionMetrics {
  total: number
  completed: number
  escalated: number
  escalationRate: number
  resolutionRateAI: number
  resolutionRateIH: number
  avgDurationMinutes: number
  byChannel: { whatsapp: number; web_chat: number; email: number }
}

// ── Componentes inline ───────────────────────────────────────────────────────

function metricColor(type: 'nps' | 'escalation' | 'neutral', value: number): string {
  if (type === 'nps') {
    if (value > 50) return '#1D9E75'
    if (value >= 0) return '#BA7517'
    return '#D85A30'
  }
  if (type === 'escalation') {
    if (value < 20) return '#1D9E75'
    if (value <= 40) return '#BA7517'
    return '#D85A30'
  }
  return 'var(--color-text-primary)'
}

function MetricCard({
  label,
  value,
  suffix,
  sub,
  colorType = 'neutral',
}: {
  label: string
  value: number
  suffix: string
  sub: string
  colorType?: 'nps' | 'escalation' | 'neutral'
}) {
  const color = metricColor(colorType, value)
  return (
    <div
      style={{
        background: 'var(--color-background-secondary)',
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '.05em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 500, color, lineHeight: 1, marginBottom: 4 }}>
        {value}{suffix}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{sub}</div>
    </div>
  )
}

function ChannelBreakdown({
  byChannel,
  total,
}: {
  byChannel: { whatsapp: number; web_chat: number; email: number }
  total: number
}) {
  if (total === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 80,
          color: 'var(--color-text-tertiary)',
          fontSize: 13,
        }}
      >
        Sin datos
      </div>
    )
  }

  const channels = [
    { key: 'whatsapp', label: 'WhatsApp', count: byChannel.whatsapp, color: '#1D9E75' },
    { key: 'web_chat', label: 'Web Chat', count: byChannel.web_chat, color: '#7F77DD' },
    { key: 'email', label: 'Email', count: byChannel.email, color: '#BA7517' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {channels.map((ch) => {
        const pct = Math.round((ch.count / total) * 100)
        return (
          <div key={ch.key}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                {ch.label}
              </span>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {ch.count} <span style={{ color: 'var(--color-text-tertiary)' }}>({pct}%)</span>
              </span>
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: 'var(--color-background-secondary)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: ch.color,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Helpers de cómputo ───────────────────────────────────────────────────────

function computeNps(npsData: { nps_score: number; nps_category: string }[]): NpsMetrics {
  const total = npsData.length
  if (total === 0) {
    return {
      avgScore: 0, npsScore: 0, totalResponses: 0,
      promoters: 0, passives: 0, detractors: 0,
      promoterPct: 0, passivePct: 0, detractorPct: 0,
    }
  }
  const promoters  = npsData.filter((r) => r.nps_score >= 9).length
  const passives   = npsData.filter((r) => r.nps_score >= 7 && r.nps_score < 9).length
  const detractors = npsData.filter((r) => r.nps_score < 7).length
  const avgScore   = Math.round(npsData.reduce((s, r) => s + r.nps_score, 0) / total)
  const npsScore   = Math.round(((promoters - detractors) / total) * 100)
  return {
    avgScore,
    npsScore,
    totalResponses: total,
    promoters,
    passives,
    detractors,
    promoterPct: Math.round((promoters / total) * 100),
    passivePct:  Math.round((passives  / total) * 100),
    detractorPct:Math.round((detractors / total) * 100),
  }
}

function computeSessions(
  sessionsData: {
    id: string
    status: string
    actor_control: string
    channel: string
    started_at: string
    closed_at: string | null
  }[],
  escalatedIds: Set<string>,
): SessionMetrics {
  const total = sessionsData.length
  if (total === 0) {
    return {
      total: 0, completed: 0, escalated: 0,
      escalationRate: 0, resolutionRateAI: 0, resolutionRateIH: 0,
      avgDurationMinutes: 0,
      byChannel: { whatsapp: 0, web_chat: 0, email: 0 },
    }
  }

  const completed = sessionsData.filter((s) => s.status === 'completed')
  const escalated = sessionsData.filter((s) => escalatedIds.has(s.id)).length

  const aiResolved = completed.filter((s) => s.actor_control === 'AI').length
  const ihResolved = completed.filter(
    (s) => s.actor_control === 'HUMAN' || s.actor_control === 'MIXED',
  ).length

  const durations = completed
    .filter((s) => s.closed_at != null)
    .map(
      (s) =>
        (new Date(s.closed_at!).getTime() - new Date(s.started_at).getTime()) / 60000,
    )
  const avgDurationMinutes =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0

  return {
    total,
    completed: completed.length,
    escalated,
    escalationRate: Math.round((escalated / total) * 100),
    resolutionRateAI:
      completed.length > 0 ? Math.round((aiResolved / completed.length) * 100) : 0,
    resolutionRateIH:
      completed.length > 0 ? Math.round((ihResolved / completed.length) * 100) : 0,
    avgDurationMinutes,
    byChannel: {
      whatsapp: sessionsData.filter((s) => s.channel === 'whatsapp').length,
      web_chat: sessionsData.filter((s) => s.channel === 'web_chat').length,
      email:    sessionsData.filter((s) => s.channel === 'email').length,
    },
  }
}

function computeDailySessions(
  sessionsData: { id: string; status: string; started_at: string }[],
  escalatedIds: Set<string>,
): DailySession[] {
  const map = new Map<string, DailySession>()

  // Pre-inicializar los últimos 30 días
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    map.set(iso, { date: label, isoDate: iso, total: 0, completed: 0, escalated: 0 })
  }

  for (const s of sessionsData) {
    const iso = s.started_at.slice(0, 10)
    const entry = map.get(iso)
    if (!entry) continue
    entry.total++
    if (s.status === 'completed') entry.completed++
    if (escalatedIds.has(s.id)) entry.escalated++
  }

  return Array.from(map.values()).sort((a, b) => a.isoDate.localeCompare(b.isoDate))
}

// ── Card shell reutilizable ──────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 12,
        padding: 20,
        background: 'var(--color-background-primary)',
      }}
    >
      <p
        style={{
          fontSize: 12,
          color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '.05em',
          margin: '0 0 16px',
        }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  let npsMetrics: NpsMetrics
  let sessionMetrics: SessionMetrics
  let dailySessions: DailySession[]

  try {
    const supabase = await createClient()

    // Query A — NPS (aislado en helper propio para no contaminar el cliente tipado)
    const npsData = await fetchNpsData(thirtyDaysAgo)

    // Query B — Sessions
    // Explicit cast: ParseQuery<'*'> returns never in TS 5.9 + postgrest-js 2.107
    const sessionsResult = await supabase
      .from('sessions')
      .select('*')
      .gte('started_at', thirtyDaysAgo)
    const sessionsData = (sessionsResult.data ?? []) as SessionRow[]

    // Query C — Escalations
    const escalationsResult = await supabase
      .from('escalations')
      .select('*')
      .gte('created_at', thirtyDaysAgo)
    const escalationsData = (escalationsResult.data ?? []) as EscalationRow[]
    const escalatedIds = new Set(escalationsData.map((e) => e.session_id))

    npsMetrics     = computeNps(npsData)
    sessionMetrics = computeSessions(sessionsData, escalatedIds)
    dailySessions  = computeDailySessions(sessionsData, escalatedIds)
  } catch {
    return (
      <main style={{ padding: 24 }}>
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
            fontSize: 14,
          }}
        >
          No se pudieron cargar las métricas. Intenta de nuevo más tarde.
        </div>
      </main>
    )
  }

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>
          Analytics
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
          Últimos 30 días
        </p>
      </div>

      {/* Fila 1 — 5 metric cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <MetricCard
          label="NPS Score"
          value={npsMetrics.npsScore}
          suffix=" pts"
          sub={`${npsMetrics.promoterPct}% promotores`}
          colorType="nps"
        />
        <MetricCard
          label="Tasa de escalada"
          value={sessionMetrics.escalationRate}
          suffix="%"
          sub={`${sessionMetrics.escalated} de ${sessionMetrics.total} sesiones`}
          colorType="escalation"
        />
        <MetricCard
          label="Resolución IA"
          value={sessionMetrics.resolutionRateAI}
          suffix="%"
          sub="Sesiones cerradas sin IH"
        />
        <MetricCard
          label="Duración promedio"
          value={sessionMetrics.avgDurationMinutes}
          suffix=" min"
          sub="Por sesión completada"
        />
        <MetricCard
          label="Total sesiones"
          value={sessionMetrics.total}
          suffix=""
          sub={`${sessionMetrics.completed} completadas`}
        />
      </div>

      {/* Fila 2 — NPS + Canales */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Card title="Distribución NPS">
          <NpsGauge
            score={npsMetrics.npsScore}
            promoterPct={npsMetrics.promoterPct}
            passivePct={npsMetrics.passivePct}
            detractorPct={npsMetrics.detractorPct}
            totalResponses={npsMetrics.totalResponses}
          />
        </Card>

        <Card title="Sesiones por canal">
          <ChannelBreakdown
            byChannel={sessionMetrics.byChannel}
            total={sessionMetrics.total}
          />
        </Card>
      </div>

      {/* Fila 3 — Gráfico diario */}
      <div
        style={{
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 12,
          padding: 20,
          background: 'var(--color-background-primary)',
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            margin: '0 0 4px',
          }}
        >
          Sesiones por día
        </p>
        <p
          style={{
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            margin: '0 0 20px',
          }}
        >
          {sessionMetrics.total} sesiones en 30 días
        </p>
        <SessionsChart data={dailySessions} />
      </div>
    </main>
  )
}
