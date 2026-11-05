'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ACKS,
  BASE_UNDERSTANDING,
  COLOR_SWATCHES,
  DEFAULT_COLOR,
  DEFAULT_MENUS,
  GAIN_PER_ANSWER,
  GAIN_PER_SOURCE,
  GOAL,
  MAX_SOURCES_COUNTED,
  OPEN_QUESTIONS,
  REVIEW_POINTS,
  extractUrls,
  onColor,
  parseHex,
  type MenuDraft,
} from './data'
import { GhostButton, Orb, PrimaryButton, QuestionCard, UnderstandingMeter, type OrbState } from './ui'

type Step =
  | 'welcome'
  | 'name'
  | 'company'
  | 'color'
  | 'logo'
  | 'sources'
  | 'analysis'
  | 'open'
  | 'review'
  | 'menus'
  | 'done'

interface Message {
  from: 'zerez' | 'user'
  text: string
  color?: string
}

interface Profile {
  user: string
  company: string
  color: string
  logo: string | null
}

interface Source {
  name: string
  progress: number
}

const EMPTY_PROFILE: Profile = { user: '', company: '', color: '', logo: null }
const ANALYSIS_PHASES = ['Leyendo tus fuentes', 'Entendiendo tu oferta y tu voz', 'Organizando lo que aprendí'] as const

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>('welcome')
  const [thread, setThread] = useState<Message[]>([])
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE)
  const [sources, setSources] = useState<Source[]>([])
  const [orb, setOrb] = useState<OrbState>('idle')
  const [busy, setBusy] = useState(false)
  const [understanding, setUnderstanding] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [menus, setMenus] = useState<MenuDraft[]>(() => DEFAULT_MENUS.map((m) => ({ ...m })))
  const [pendingColor, setPendingColor] = useState(DEFAULT_COLOR)
  const [draft, setDraft] = useState('')

  const runId = useRef(0)
  const ackN = useRef(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const company = profile.company || 'tu empresa'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'end' })
  }, [thread, step, sources, menus])

  useEffect(() => {
    const id = runId
    return () => {
      id.current += 1
    }
  }, [])

  const ack = () => {
    ackN.current += 1
    return ACKS[ackN.current % ACKS.length]
  }

  /** ZEREZ "escribe": el orbe piensa un momento y luego aparece el mensaje. Se cancela si se reinicia el flujo. */
  const say = useCallback(async (token: number, text: string) => {
    setOrb('thinking')
    await sleep(prefersReducedMotion() ? 0 : 550)
    if (token !== runId.current) return false
    setThread((t) => [...t, { from: 'zerez', text }])
    setOrb('idle')
    return true
  }, [])

  const user = (text: string, color?: string) => setThread((t) => [...t, { from: 'user', text, color }])

  const run = useCallback((script: (token: number) => Promise<void>) => {
    runId.current += 1
    const token = runId.current
    setBusy(true)
    void script(token).finally(() => {
      if (token === runId.current) setBusy(false)
    })
  }, [])

  const restart = () => {
    runId.current += 1
    setStep('welcome')
    setThread([])
    setProfile(EMPTY_PROFILE)
    setSources([])
    setUnderstanding(0)
    setQuestionIndex(0)
    setMenus(DEFAULT_MENUS.map((m) => ({ ...m })))
    setPendingColor(DEFAULT_COLOR)
    setDraft('')
    setBusy(false)
    setOrb('idle')
  }

  const startCreate = () =>
    run(async (t) => {
      setStep('name')
      if (!(await say(t, '¡Hola! Soy ZEREZ. Vamos a crear la representación digital de tu empresa: aprenderé quién es, qué vende y cómo se relaciona con sus clientes.'))) return
      if (!(await say(t, 'Empecemos por lo básico. ¿Cómo te llamas?'))) return
    })

  const answerName = (text: string) =>
    run(async (t) => {
      user(text)
      setProfile((p) => ({ ...p, user: text }))
      if (!(await say(t, `Mucho gusto, ${text}. ¿Cómo se llama tu empresa?`))) return
      setStep('company')
    })

  const answerCompany = (text: string) =>
    run(async (t) => {
      user(text)
      setProfile((p) => ({ ...p, company: text }))
      setStep('color')
      await say(t, `Ahora quiero conocer cómo se ve ${text}. Elige tu color principal o escribe su código hex.`)
    })

  const confirmColor = (hex: string) =>
    run(async (t) => {
      setProfile((p) => ({ ...p, color: hex }))
      user(`Mi color principal es ${hex.toUpperCase()}.`, hex)
      setStep('logo')
      await say(t, `${ack()} ¿Tienes un logo? Súbelo y lo uso en tu representación.`)
    })

  const askForSources = async (t: number, logo: string | null) => {
    if (!(await say(t, logo ? 'Se ve muy bien.' : 'Sin problema, lo puedes subir cuando quieras.'))) return
    if (!(await say(t, `Ahora lo más importante: comparte todo lo que me ayude a entender ${company}. Con eso deduzco la mayor parte de lo que necesito y solo te pregunto lo que falte.`))) return
    setStep('sources')
  }

  const setLogo = (src: string | null, msg: string) =>
    run(async (t) => {
      if (src) setProfile((p) => ({ ...p, logo: src }))
      user(msg)
      await askForSources(t, src)
    })

  const onLogoFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setLogo(reader.result, `Te comparto mi logo (${file.name}).`)
    }
    reader.readAsDataURL(file)
  }

  const addSources = (urls: string[]) => {
    const known = new Set(sources.map((s) => s.name))
    const fresh = urls.filter((u) => !known.has(u)).map((name) => ({ name, progress: 0 }))
    setSources((s) => [...s, ...fresh])
    return fresh.length
  }

  const answerSources = (text: string) => {
    const added = addSources(extractUrls(text))
    user(text)
    run(async (t) => {
      await say(
        t,
        added
          ? `Agregué ${added} ${added === 1 ? 'fuente' : 'fuentes'}. ¿Algo más? Cuando estés listo, empiezo a analizar.`
          : 'No encontré una URL en tu mensaje. Pega la dirección completa, por ejemplo https://tuempresa.com.',
      )
    })
  }

  const startAnalysis = () =>
    run(async (t) => {
      user('Listo, analiza todo.')
      if (!(await say(t, `Perfecto. Voy a leer todo lo que compartiste sobre ${company}.`))) return
      setStep('analysis')
      setOrb('thinking')
      let current = sources.map((s) => ({ ...s, progress: 0 }))
      let tick = 0
      while (current.some((s) => s.progress < 100)) {
        await sleep(prefersReducedMotion() ? 40 : 110)
        if (t !== runId.current) return
        tick += 1
        current = current.map((s, i) =>
          s.progress >= 100 || tick < i * 5
            ? s
            : { ...s, progress: Math.min(100, s.progress + 3 + Math.floor(Math.random() * 7)) },
        )
        setSources(current)
      }
      const base = BASE_UNDERSTANDING + GAIN_PER_SOURCE * Math.min(current.length, MAX_SOURCES_COUNTED)
      setUnderstanding(base)
      await sleep(400)
      if (t !== runId.current) return
      if (!(await say(t, `Listo. Leí ${current.length} ${current.length === 1 ? 'fuente' : 'fuentes'} y ya conozco a ${company} al ${base}%.`))) return
      if (!(await say(t, `Para representarte bien necesito llegar al ${GOAL}%. Te haré unas preguntas abiertas: contéstalas como quieras.`))) return
      setQuestionIndex(0)
      setStep('open')
    })

  const answerOpen = (text: string) =>
    run(async (t) => {
      user(text)
      const before = understanding
      const after = Math.min(100, before + GAIN_PER_ANSWER)
      setOrb('thinking')
      setUnderstanding(after)
      if (!(await say(t, `Gracias, eso me aclara mucho. Ya te conozco al ${after}% (+${after - before}).`))) return
      if (after >= GOAL || questionIndex + 1 >= OPEN_QUESTIONS.length) {
        if (!(await say(t, `Ya te conozco al ${after}%: lo suficiente para representarte bien.`))) return
        if (!(await say(t, `Solo me falta que confirmes ${REVIEW_POINTS} puntos que deduje de tus fuentes. Lo demás lo puedes completar cuando quieras en Administra.`))) return
        setStep('review')
        return
      }
      setQuestionIndex((i) => i + 1)
    })

  const confirmReview = () =>
    run(async (t) => {
      user('Confirmo todo lo que dedujiste.')
      const after = Math.min(100, understanding + 4)
      setUnderstanding(after)
      if (!(await say(t, `Listo, quedó confirmado. Ya te conozco al ${after}%.`))) return
      if (!(await say(t, `Por último, deduje los caminos principales de tu representación: lo que tus clientes vienen a hacer con ${company}. Así aparecerán arriba, en lugar de un menú de sitio web.`))) return
      setStep('menus')
    })

  const confirmMenus = () =>
    run(async (t) => {
      const on = menus.filter((m) => m.on)
      user(`Confirmo los menús: ${on.map((m) => m.title).join(', ')}.`)
      if (!(await say(t, `Perfecto. Con eso ya puedo generar la representación digital de ${company}.`))) return
      setStep('done')
    })

  const onComposerSend = () => {
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    switch (step) {
      case 'welcome':
        startCreate()
        return
      case 'name':
        answerName(text)
        return
      case 'company':
        answerCompany(text)
        return
      case 'color': {
        const hex = parseHex(text)
        if (hex) setPendingColor(hex)
        confirmColor(hex ?? pendingColor)
        return
      }
      case 'logo':
        setLogo(null, text)
        return
      case 'sources':
        answerSources(text)
        return
      case 'open':
        answerOpen(text)
        return
      default:
        return
    }
  }

  const composerEnabled = !busy && ['welcome', 'name', 'company', 'color', 'logo', 'sources', 'open'].includes(step)

  const placeholder = useMemo(() => {
    switch (step) {
      case 'name':
        return 'Escribe tu nombre'
      case 'company':
        return 'Nombre de tu empresa'
      case 'color':
        return 'Elige un color o escribe un código hex'
      case 'logo':
        return 'Sube tu logo o escribe «sin logo»'
      case 'sources':
        return 'Pega la dirección de tu sitio o tus redes'
      case 'open':
        return 'Escribe tu respuesta'
      default:
        return 'Escribe lo que necesitas…'
    }
  }, [step])

  const showMeter = understanding > 0
  const accent = profile.color || 'var(--primary)'
  const question = OPEN_QUESTIONS[questionIndex]

  return (
    <div
      className="min-h-screen bg-surface-000 text-ink"
      style={{
        backgroundImage:
          'radial-gradient(60% 50% at 15% 0%, var(--aura-cyan), transparent), radial-gradient(50% 40% at 90% 10%, var(--aura-violet), transparent), radial-gradient(40% 40% at 50% 100%, var(--aura-amber), transparent)',
        backgroundAttachment: 'fixed',
      }}
    >
      <header className="glass sticky top-0 z-topbar flex items-center justify-between px-12 py-3 zz-compact:px-4">
        <span className="text-title font-bold tracking-tight">ZEREZ</span>
        <div className="flex items-center gap-3">
          {profile.company && (
            <span className="text-caption text-ink-muted">
              {profile.company}
              {profile.user ? ` · ${profile.user}` : ''}
            </span>
          )}
          {step !== 'welcome' && (
            <button type="button" onClick={restart} className="rounded-full bg-wash px-4 py-1.5 text-caption font-semibold hover:bg-wash-strong">
              Reiniciar
            </button>
          )}
        </div>
      </header>

      {step === 'welcome' ? (
        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-dock flex-col items-center justify-center gap-8 px-4 pb-24 text-center">
          <Orb state="idle" size={80} />
          <p className="max-w-conversation text-message text-ink-muted">
            ZEREZ es la primera plataforma de representación digital del mercado. Aquí digitalizas la capacidad de tu
            organización para representarse y relacionarse con sus clientes.
          </p>
          <h1 className="text-slogan text-ink zz-compact:text-question">¿Qué te gustaría hacer hoy?</h1>
          <div className="grid w-full gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={startCreate}
              className="rounded-lg bg-surface-100 p-5 text-left shadow-card transition-shadow duration-base hover:shadow-float"
            >
              <p className="text-title">Crea</p>
              <p className="mt-1 text-body text-ink-muted">
                Crea la representación digital de tu empresa: su identidad, su conocimiento y sus objetivos.
              </p>
            </button>
            {[
              ['Administra', 'Actualiza y evoluciona tu representación digital.'],
              ['Analiza', 'Conoce los resultados de tu representación: relaciones, ventas, PQRs y experiencia.'],
              ['Conoce más', 'Descubre qué es una representación digital y cómo transforma la relación con tus clientes.'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-lg bg-wash p-5 text-left opacity-70" aria-disabled>
                <p className="text-title">
                  {title} <span className="ml-1 text-label uppercase text-ink-subtle">Próximamente</span>
                </p>
                <p className="mt-1 text-body text-ink-muted">{desc}</p>
              </div>
            ))}
          </div>
        </main>
      ) : (
        <div className="mx-auto flex max-w-page gap-8 px-12 pb-40 pt-8 zz-compact:px-4">
          <aside className="sticky top-24 hidden h-fit w-rail shrink-0 space-y-6 md:block zz-panel:hidden">
            <div className="space-y-4 rounded-lg bg-surface-100 p-5 shadow-card">
              <div className="flex items-center gap-3">
                {profile.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.logo} alt={`Logo de ${profile.company}`} className="h-10 w-10 rounded-md object-contain" />
                ) : (
                  <div
                    className="grid h-10 w-10 place-items-center rounded-md text-title"
                    style={{ background: accent, color: profile.color ? onColor(profile.color) : 'var(--on-primary)' }}
                  >
                    {(profile.company || 'Z').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-title">{profile.company || 'Tu empresa'}</p>
                  <p className="text-caption text-ink-subtle">Representación digital</p>
                </div>
              </div>
              {sources.length > 0 && (
                <div className="space-y-1">
                  <p className="text-label uppercase text-ink-subtle">Fuentes</p>
                  <ul className="space-y-1 text-caption text-ink-muted">
                    {sources.map((s) => (
                      <li key={s.name} className="truncate">
                        {s.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {showMeter && <UnderstandingMeter value={understanding} goal={GOAL} label={`Lo que sé de ${company}`} />}
          </aside>

          <main className="mx-auto w-full max-w-conversation space-y-4">
            {showMeter && (
              <div className="hidden zz-panel:block">
                <UnderstandingMeter value={understanding} goal={GOAL} label={`Lo que sé de ${company}`} />
              </div>
            )}

            <div className="flex justify-center py-2">
              <Orb state={orb} size={56} />
            </div>

            {thread.map((m, i) =>
              m.from === 'zerez' ? (
                <p key={i} className="text-message text-ink">
                  {m.text}
                </p>
              ) : (
                <div key={i} className="flex justify-end">
                  <p
                    className="max-w-[85%] rounded-lg px-4 py-2.5 text-body"
                    style={{
                      background: m.color ?? profile.color ?? 'var(--primary)',
                      color: m.color || profile.color ? onColor(m.color ?? profile.color) : 'var(--on-primary)',
                    }}
                  >
                    {m.text}
                  </p>
                </div>
              ),
            )}

            {!busy && step === 'color' && (
              <QuestionCard title="Tu color principal" help="Se usa en tu representación y en lo que escribes aquí.">
                <div className="flex flex-wrap items-center gap-3">
                  {COLOR_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Color ${c}`}
                      aria-pressed={pendingColor === c}
                      onClick={() => setPendingColor(c)}
                      className="h-9 w-9 rounded-full ring-offset-2 ring-offset-surface-100 transition-shadow duration-fast aria-pressed:ring-2 aria-pressed:ring-primary"
                      style={{ background: c }}
                    />
                  ))}
                  <input
                    type="color"
                    aria-label="Otro color"
                    value={pendingColor}
                    onChange={(e) => setPendingColor(e.target.value)}
                    className="h-9 w-9 cursor-pointer rounded-full bg-transparent"
                  />
                </div>
                <PrimaryButton onClick={() => confirmColor(pendingColor)}>Usar {pendingColor.toUpperCase()}</PrimaryButton>
              </QuestionCard>
            )}

            {!busy && step === 'logo' && (
              <QuestionCard title="Tu logo" help="PNG, JPG o SVG. Se queda en tu navegador; no se envía a ningún servidor.">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onLogoFile(e.target.files?.[0])}
                />
                <div className="flex flex-wrap gap-3">
                  <PrimaryButton onClick={() => fileRef.current?.click()}>Subir logo</PrimaryButton>
                  <GhostButton onClick={() => setLogo(null, 'Lo subo después.')}>Lo subo después</GhostButton>
                </div>
              </QuestionCard>
            )}

            {!busy && step === 'sources' && (
              <QuestionCard
                title="Tus fuentes"
                help="Pega la dirección de tu sitio web, tu Instagram, LinkedIn o cualquier página donde se vea cómo es tu empresa."
              >
                {sources.length > 0 && (
                  <ul className="space-y-1 text-body text-ink-muted">
                    {sources.map((s) => (
                      <li key={s.name} className="truncate">
                        · {s.name}
                      </li>
                    ))}
                  </ul>
                )}
                <PrimaryButton onClick={startAnalysis} disabled={sources.length === 0}>
                  Analizar todo
                </PrimaryButton>
              </QuestionCard>
            )}

            {step === 'analysis' && (
              <QuestionCard title="Analizando tus fuentes">
                <ul className="space-y-3">
                  {sources.map((s) => (
                    <li key={s.name} className="space-y-1">
                      <div className="flex justify-between text-caption text-ink-muted">
                        <span className="truncate">{s.name}</span>
                        <span className="text-numeral">{s.progress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-wash">
                        <div className="h-full rounded-full bg-primary transition-[width] duration-progress" style={{ width: `${s.progress}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-caption text-ink-subtle">
                  {ANALYSIS_PHASES[Math.min(ANALYSIS_PHASES.length - 1, Math.floor((sources.reduce((a, s) => a + s.progress, 0) / Math.max(1, sources.length * 100)) * ANALYSIS_PHASES.length))]}
                </p>
              </QuestionCard>
            )}

            {!busy && step === 'open' && question && (
              <QuestionCard title={question.q(company)} help={question.help} />
            )}

            {!busy && step === 'review' && (
              <QuestionCard
                title={`Confirma ${REVIEW_POINTS} puntos que deduje`}
                help="Son los de menor confianza. Si prefieres, déjalos para Administra."
              >
                <div className="flex flex-wrap gap-3">
                  <PrimaryButton onClick={confirmReview}>Confirmo todo</PrimaryButton>
                  <GhostButton onClick={confirmReview}>Revisar después</GhostButton>
                </div>
              </QuestionCard>
            )}

            {!busy && step === 'menus' && (
              <QuestionCard title="Los caminos de tu representación" help="Quita los que no apliquen. Más adelante podrás editarlos y reordenarlos.">
                <ul className="space-y-2">
                  {menus.map((m) => (
                    <li key={m.id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-md bg-wash p-3">
                        <input
                          type="checkbox"
                          checked={m.on}
                          onChange={() => setMenus((all) => all.map((x) => (x.id === m.id ? { ...x, on: !x.on } : x)))}
                          className="mt-1 h-4 w-4 accent-[var(--primary)]"
                        />
                        <span>
                          <span className="block text-title">{m.title}</span>
                          <span className="block text-caption text-ink-muted">{m.description}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <PrimaryButton onClick={confirmMenus} disabled={!menus.some((m) => m.on)}>
                  Confirmar menús
                </PrimaryButton>
              </QuestionCard>
            )}

            {!busy && step === 'done' && (
              <QuestionCard title={`${company} ya tiene su primera versión`} help="El siguiente paso son las Pruebas: simular conversaciones y ajustar antes de publicar.">
                <GhostButton onClick={restart}>Empezar de nuevo</GhostButton>
              </QuestionCard>
            )}

            <div ref={bottomRef} />
          </main>
        </div>
      )}

      {(step !== 'done' || busy) && (
        <form
          className="glass fixed inset-x-0 bottom-6 z-dock mx-auto flex w-[calc(100%-32px)] max-w-dock items-center gap-2 rounded-full p-2 pl-5"
          onSubmit={(e) => {
            e.preventDefault()
            onComposerSend()
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!composerEnabled}
            placeholder={placeholder}
            aria-label={placeholder}
            className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-subtle disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!composerEnabled || !draft.trim()}
            className="rounded-full bg-primary px-5 py-2 text-body font-semibold text-on-primary disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
      )}
    </div>
  )
}
