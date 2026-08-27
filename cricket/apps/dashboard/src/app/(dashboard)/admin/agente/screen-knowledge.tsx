'use client'

import { useState } from 'react'
import { KNOWLEDGE_CHIPS } from './constants'

export function ScreenKnowledge() {
  const [draft, setDraft] = useState('')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-[84px] pt-10 text-center">
        <div className="mb-[38px] flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-[#4ade80] shadow-[0_0_10px_#4ade80]" />
          <div className="text-[13px] text-[#9aa09a]">Paso 2 · Conocimiento de la empresa</div>
        </div>
        <h1 className="max-w-[17ch] text-[48px] font-normal leading-[1.13] tracking-[-.022em] text-white text-pretty">
          Cuéntame qué es Aurelia.
        </h1>
        <p className="mt-6 max-w-[50ch] text-lg leading-[1.58] text-[#b6bbb6] text-pretty">
          A qué se dedica, qué vende, quiénes son sus clientes y qué la hace distinta. Con eso Lucía deja de
          improvisar.
        </p>
        <div
          className="mt-[38px] flex h-[132px] w-[132px] items-center justify-center gap-2.5 rounded-full border border-[rgba(74,222,128,.4)]"
          style={{ animation: 'agenteOrbPulse 3.4s ease-in-out infinite' }}
        >
          <div className="h-[9px] w-[9px] animate-bounce rounded-full bg-[#4ade80] [animation-delay:0ms]" />
          <div className="h-[9px] w-[9px] animate-bounce rounded-full bg-[#4ade80] [animation-delay:180ms]" />
          <div className="h-[9px] w-[9px] animate-bounce rounded-full bg-[#4ade80] [animation-delay:360ms]" />
        </div>
        <div className="mt-[34px] flex gap-px border border-[#1c1f1c] bg-[#1c1f1c]">
          {KNOWLEDGE_CHIPS.map((k) => (
            <div key={k.name} className="flex items-center gap-2.5 bg-[#0a0b0a] px-[18px] py-3">
              <span
                className={`h-[7px] w-[7px] rounded-full bg-[#4ade80] ${k.pending ? 'animate-pulse opacity-40' : ''}`}
                style={k.pending ? { background: '#5f645f' } : undefined}
              />
              <span className="text-[12.5px] text-[#8a8f8a]">{k.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-center px-[84px] pb-[34px] pt-[30px]">
        <div className="flex h-[60px] w-full max-w-[760px] items-center gap-3.5 rounded-[30px] border border-[#212421] bg-[#0f110f] px-3">
          <div className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-[#181b18] text-sm text-[#8a8f8a] hover:bg-[#20261f] hover:text-[#4ade80]">
            🎙
          </div>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe o habla tu respuesta…"
            className="flex-1 bg-transparent text-[15.5px] text-[#e8e8e8] placeholder:text-[#5f645f] focus:outline-none"
          />
          <div
            onClick={() => setDraft('')}
            className="grid h-[38px] w-[38px] cursor-pointer place-items-center rounded-full bg-[#4ade80] text-[15px] text-[#04140a] hover:bg-[#86efac]"
          >
            ↑
          </div>
        </div>
      </div>
    </div>
  )
}
