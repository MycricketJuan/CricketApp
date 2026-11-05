'use client'

import { useState } from 'react'
import { KNOWLEDGE_CHIPS } from './constants'

export function ScreenKnowledge() {
  const [draft, setDraft] = useState('')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-[84px] pt-10 text-center">
        <div className="mb-[38px] flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
          <div className="text-[13px] text-ink-muted">Paso 2 · Conocimiento de la empresa</div>
        </div>
        <h1 className="max-w-[17ch] text-[48px] font-normal leading-[1.13] tracking-[-.022em] text-ink text-pretty">
          Cuéntame qué es Aurelia.
        </h1>
        <p className="mt-6 max-w-[50ch] text-lg leading-[1.58] text-ink-muted text-pretty">
          A qué se dedica, qué vende, quiénes son sus clientes y qué la hace distinta. Con eso Lucía deja de
          improvisar.
        </p>
        <div
          className="mt-[38px] flex h-[132px] w-[132px] items-center justify-center gap-2.5 rounded-full border border-[color-mix(in_srgb,var(--primary)_40%,transparent)]"
          style={{ animation: 'agenteOrbPulse 3.4s ease-in-out infinite' }}
        >
          <div className="h-[9px] w-[9px] animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
          <div className="h-[9px] w-[9px] animate-bounce rounded-full bg-primary [animation-delay:180ms]" />
          <div className="h-[9px] w-[9px] animate-bounce rounded-full bg-primary [animation-delay:360ms]" />
        </div>
        <div className="mt-[34px] flex gap-px border border-border-soft bg-surface-200">
          {KNOWLEDGE_CHIPS.map((k) => (
            <div key={k.name} className="flex items-center gap-2.5 bg-surface-000 px-[18px] py-3">
              <span
                className={`h-[7px] w-[7px] rounded-full bg-primary ${k.pending ? 'animate-pulse opacity-40' : ''}`}
                style={k.pending ? { background: 'var(--ink-subtle)' } : undefined}
              />
              <span className="text-[12.5px] text-ink-muted">{k.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-center px-[84px] pb-[34px] pt-[30px]">
        <div className="flex h-[60px] w-full max-w-[760px] items-center gap-3.5 rounded-[30px] border border-border-soft bg-surface-000 px-3">
          <div className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-surface-200 text-sm text-ink-muted hover:bg-surface-200 hover:text-primary">
            🎙
          </div>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe o habla tu respuesta…"
            className="flex-1 bg-transparent text-[15.5px] text-ink placeholder:text-ink-subtle focus:outline-none"
          />
          <div
            onClick={() => setDraft('')}
            className="grid h-[38px] w-[38px] cursor-pointer place-items-center rounded-full bg-primary text-[15px] text-on-primary hover:bg-primary"
          >
            ↑
          </div>
        </div>
      </div>
    </div>
  )
}
