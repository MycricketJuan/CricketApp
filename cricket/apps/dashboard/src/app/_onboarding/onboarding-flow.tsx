'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { MODULES } from '@/lib/representation/catalog'
import type { Coverage, RepCard, RepresentationState } from '@/lib/representation/types'
import { Orb, QuestionCard, UnderstandingMeter, type OrbState } from './ui'

const COLOR_SWATCHES = ['#2563eb', '#10cba7', '#6f03fd', '#e11d48', '#f59e0b', '#0f1b4c'] as const

// Pantalla de inicio — los cuatro caminos en INFINITIVO. Solo "Crear" está activo.
const HOME_PATHS: { title: string; desc: string; active: boolean }[] = [
  { title: 'Crear', desc: 'Crea la representación digital de tu empresa: su identidad, su conocimiento y sus objetivos.', active: true },
  { title: 'Administrar', desc: 'Actualiza y evoluciona tu representación digital.', active: false },
  { title: 'Analizar', desc: 'Conoce los resultados de tu representación: relaciones, ventas, PQRs y experiencia.', active: false },
  { title: 'Conocer más', desc: 'Descubre qué es una representación digital y cómo transforma la relación con tus clientes.', active: false },
]

interface ChatMessage {
  role: 'zerez' | 'user'
  content: string
  card?: RepCard | null
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function OnboardingFlow() {
  const [phase, setPhase] = useState<'welcome' | 'chat'>('welcome')
  const [hydrated, setHydrated] = useState(false)
  const [state, setState] = useState<RepresentationState | null>(null)
  const [thread, setThread] = useState<ChatMessage[]>([])
  const [orb, setOrb] = useState<OrbState>('idle')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')

  const queueRef = useRef<string[]>([])
  const processingRef = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const company = state?.profile.company || 'tu empresa'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'end' })
  }, [thread, state])

  // Hidratar al cargar: recupera el hilo y el estado si ya existe una representación.
  useEffect(() => {
    let alive = true
    fetch('/api/representation')
      .then((r) => r.json())
      .then((data: { state: RepresentationState | null; thread: ChatMessage[] }) => {
        if (!alive) return
        setHydrated(true)
        if (data.state) {
          setState(data.state)
          setThread((data.thread ?? []).map((m) => ({ role: m.role, content: m.content, card: m.card })))
          if ((data.thread ?? []).length > 0) setPhase('chat')
        }
      })
      .catch(() => alive && setHydrated(true))
    return () => {
      alive = false
    }
  }, [])

  const fireTurn = useCallback(async (inputs: string[]) => {
    const res = await fetch('/api/representation/turn', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inputs }),
    })
    if (!res.ok) {
      setThread((t) => [...t, { role: 'zerez', content: 'Tuve un problema procesando eso. ¿Lo intentamos de nuevo?' }])
      return
    }
    const data = (await res.json()) as {
      state: RepresentationState
      message: { role: 'zerez'; content: string; card: RepCard | null }
    }
    if (data.state) setState(data.state)
    if (data.message?.content || data.message?.card) {
      setThread((t) => [...t, { role: 'zerez', content: data.message.content, card: data.message.card }])
    }
  }, [])

  const processQueue = useCallback(async () => {
    if (processingRef.current) return
    processingRef.current = true
    setBusy(true)
    setOrb('thinking')
    try {
      while (queueRef.current.length > 0) {
        const batch = queueRef.current.splice(0, queueRef.current.length)
        await fireTurn(batch)
      }
    } finally {
      processingRef.current = false
      setBusy(false)
      setOrb('idle')
    }
  }, [fireTurn])

  // La barra NUNCA se bloquea: los mensajes se encolan y se procesan en orden.
  const enqueue = useCallback(
    (text: string) => {
      const clean = text.trim()
      if (!clean) return
      setThread((t) => [...t, { role: 'user', content: clean }])
      queueRef.current.push(clean)
      void processQueue()
    },
    [processQueue],
  )

  const startCreate = useCallback(async () => {
    setPhase('chat')
    if (thread.length > 0 || processingRef.current) return
    processingRef.current = true
    setBusy(true)
    setOrb('thinking')
    try {
      await fireTurn([]) // arranque: ZEREZ se presenta y pregunta el nombre
    } finally {
      processingRef.current = false
      setBusy(false)
      setOrb('idle')
    }
  }, [fireTurn, thread.length])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const text = draft
    setDraft('')
    enqueue(text)
  }

  const pickColor = (hex: string) => enqueue(`Mi color principal es ${hex.toUpperCase()}.`)

  const lastCard = thread.length > 0 ? thread[thread.length - 1].card : null
  const understanding = state?.understanding ?? 0
  const goal = state?.goal ?? 80

  // ── Pantalla de inicio ──────────────────────────────────────
  if (phase === 'welcome') {
    return (
      <div className="min-h-screen bg-surface-000 text-ink" style={auraStyle}>
        <Header company={null} user={null} />
        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-dock flex-col items-center justify-center gap-8 px-4 pb-24 text-center">
          <Orb state="idle" size={80} />
          <p className="max-w-conversation text-message text-ink-muted">
            ZEREZ es la primera plataforma de representación digital del mercado. Aquí digitalizas la capacidad de tu
            organización para representarse y relacionarse con sus clientes.
          </p>
          <h1 className="text-slogan text-ink zz-compact:text-question">¿Qué te gustaría hacer hoy?</h1>
          <div className="grid w-full gap-3 sm:grid-cols-2">
            {HOME_PATHS.map((p) =>
              p.active ? (
                <button
                  key={p.title}
                  type="button"
                  onClick={startCreate}
                  disabled={!hydrated}
                  className="rounded-lg bg-surface-100 p-5 text-left shadow-card transition-shadow duration-base hover:shadow-float disabled:opacity-60"
                >
                  <p className="text-title">{p.title}</p>
                  <p className="mt-1 text-body text-ink-muted">{p.desc}</p>
                </button>
              ) : (
                <div key={p.title} className="rounded-lg bg-wash p-5 text-left opacity-70" aria-disabled>
                  <p className="text-title">
                    {p.title} <span className="ml-1 text-label uppercase text-ink-subtle">Próximamente</span>
                  </p>
                  <p className="mt-1 text-body text-ink-muted">{p.desc}</p>
                </div>
              ),
            )}
          </div>
        </main>
      </div>
    )
  }

  // ── Conversación ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-000 text-ink" style={auraStyle}>
      <Header company={state?.profile.company ?? null} user={state?.profile.user ?? null} />

      <div className="mx-auto flex max-w-page gap-8 px-12 pb-40 pt-8 zz-compact:px-4">
        <aside className="sticky top-24 hidden h-fit w-rail shrink-0 space-y-6 md:block zz-panel:hidden">
          <div className="space-y-4 rounded-lg bg-surface-100 p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primary-tint text-title text-primary">
                {(state?.profile.company || 'Z').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-title">{state?.profile.company || 'Tu empresa'}</p>
                <p className="text-caption text-ink-subtle">Representación digital</p>
              </div>
            </div>
            {understanding > 0 && (
              <UnderstandingMeter value={Math.round(understanding)} goal={goal} label={`Lo que sé de ${company}`} />
            )}
          </div>

          {state && <KnowledgeRail submoduleCoverage={state.submoduleCoverage} moduleCoverage={state.moduleCoverage} />}
        </aside>

        <main className="mx-auto w-full max-w-conversation space-y-4">
          <div className="flex justify-center py-2">
            <Orb state={orb} size={56} />
          </div>

          {thread.map((m, i) =>
            m.role === 'zerez' ? (
              <p key={i} className="text-message text-ink whitespace-pre-wrap">
                {m.content}
              </p>
            ) : (
              <div key={i} className="flex justify-end">
                {/* Burbuja del usuario: relleno suave + tinta. Nunca el color de marca (ilegible). */}
                <p className="max-w-[85%] rounded-lg bg-surface-200 px-4 py-2.5 text-body text-ink">{m.content}</p>
              </div>
            ),
          )}

          {!busy && lastCard?.type === 'color' && (
            <QuestionCard title="Tu color principal" help="Es un atajo: también puedes escribir el color o su código hex abajo.">
              <div className="flex flex-wrap items-center gap-3">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    onClick={() => pickColor(c)}
                    className="h-9 w-9 rounded-full ring-offset-2 ring-offset-surface-100 transition-shadow duration-fast hover:ring-2 hover:ring-primary"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          <div ref={bottomRef} />
        </main>
      </div>

      {/* Composer de vidrio, SIEMPRE habilitado. Mientras ZEREZ procesa, los mensajes se encolan. */}
      <form
        onSubmit={onSubmit}
        className="fixed inset-x-0 bottom-6 z-dock mx-auto flex w-[calc(100%-32px)] max-w-dock items-center gap-2 rounded-full bg-surface-glass p-2 pl-5 shadow-float backdrop-blur-glass"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={busy ? 'ZEREZ está procesando… puedes seguir escribiendo' : 'Escribe tu respuesta'}
          aria-label="Mensaje"
          className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-subtle"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-full bg-primary px-5 py-2 text-body font-semibold text-on-primary disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </div>
  )
}

const auraStyle: CSSProperties = {
  backgroundImage:
    'radial-gradient(60% 50% at 15% 0%, var(--aura-cyan), transparent), radial-gradient(50% 40% at 90% 10%, var(--aura-violet), transparent), radial-gradient(40% 40% at 50% 100%, var(--aura-amber), transparent)',
  backgroundAttachment: 'fixed',
}

function Header({ company, user }: { company: string | null; user: string | null }) {
  return (
    <header className="sticky top-0 z-topbar flex items-center justify-between bg-surface-glass px-12 py-3 shadow-card backdrop-blur-glass zz-compact:px-4">
      <span className="text-title font-bold tracking-tight">ZEREZ</span>
      {company && (
        <span className="text-caption text-ink-muted">
          {company}
          {user ? ` · ${user}` : ''}
        </span>
      )}
    </header>
  )
}

/** Rail del catálogo: módulos → submódulos con su % (calculado por el servidor). */
function KnowledgeRail({
  submoduleCoverage,
  moduleCoverage,
}: {
  submoduleCoverage: Coverage[]
  moduleCoverage: Coverage[]
}) {
  const subPct = new Map(submoduleCoverage.map((c) => [c.id, c.pct]))
  const modPct = new Map(moduleCoverage.map((c) => [c.id, c.pct]))
  return (
    <div className="space-y-4 rounded-lg bg-surface-100 p-5 shadow-card">
      <p className="text-label uppercase text-ink-subtle">Lo que sé</p>
      <div className="space-y-4">
        {MODULES.map((mod) => (
          <div key={mod.id} className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-title">{mod.titulo}</span>
              <span className="text-numeral text-ink-muted">{Math.round(modPct.get(mod.id) ?? 0)}%</span>
            </div>
            <ul className="space-y-1">
              {mod.submodulos.map((sub) => (
                <li key={sub.id} className="flex items-center justify-between text-caption text-ink-muted">
                  <span className="truncate">{sub.titulo}</span>
                  <span className="text-numeral tabular-nums text-ink-subtle">{Math.round(subPct.get(sub.id) ?? 0)}%</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
