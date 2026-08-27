import { PORTFOLIO_SEED } from './constants'

export function ScreenPortfolio({ next }: { next: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto px-[52px] pt-11">
      <div className="flex items-center gap-2.5">
        <div className="h-2 w-2 rounded-full bg-[#4ade80] shadow-[0_0_10px_#4ade80]" />
        <div className="text-[13px] text-[#9aa09a]">Paso 3 · Portafolio</div>
      </div>
      <h1 className="mt-5 text-[36px] font-normal leading-[1.16] tracking-[-.02em] text-white">
        Ahora lo específico: qué vendes y con qué reglas.
      </h1>
      <p className="mt-3.5 max-w-[66ch] text-[15.5px] leading-[1.6] text-[#9aa09a]">
        Aquí las preguntas dejan de ser abiertas. Lucía necesita saber exactamente qué puede ofrecer, a qué precio y
        hasta dónde puede negociar.
      </p>
      <div className="mt-[30px] grid grid-cols-2 gap-px border border-[#1c1f1c] bg-[#1c1f1c]">
        {PORTFOLIO_SEED.map((p) => {
          const pend = p.status === 'pendiente'
          return (
            <div key={p.id} className="px-[22px] py-5" style={{ background: pend ? '#0c0b08' : '#0a0b0a' }}>
              <div className="flex items-center justify-between gap-3.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2 w-2 flex-none rounded-full"
                    style={{ background: pend ? '#f5c451' : '#4ade80', boxShadow: `0 0 9px ${pend ? '#f5c451' : '#4ade80'}` }}
                  />
                  <span className="text-[14.5px] font-medium text-white">{p.name}</span>
                </div>
                <span
                  className="px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[.11em]"
                  style={
                    pend
                      ? { color: '#f5c451', border: '1px solid #46391a', background: '#1a150c' }
                      : { color: '#4ade80', border: '1px solid #24402c', background: '#0f1a12' }
                  }
                >
                  {pend ? 'Pendiente' : 'Listo'}
                </span>
              </div>
              <div className="mt-2.5 text-[13px] leading-[1.6] text-[#8a8f8a]">{p.q}</div>
              <div className="mt-3 text-[13.5px] leading-[1.6] text-[#c9cec9]">{p.a}</div>
            </div>
          )
        })}
      </div>
      <div className="mb-10 mt-6 flex items-center gap-3.5">
        <div
          onClick={next}
          className="cursor-pointer bg-[#4ade80] px-7 py-3.5 text-[15px] font-semibold text-[#04140a] hover:bg-[#86efac]"
        >
          Continuar con feedback
        </div>
        <div className="cursor-pointer border border-[#232623] px-6 py-3.5 text-[15px] text-[#9aa09a] hover:border-[#3f5a45] hover:text-[#d5d8d5]">
          Cargar lista de precios
        </div>
        <div className="text-[12.5px] text-[#5f645f]">Falta 1 de 6: la política de comparación con la competencia.</div>
      </div>
    </div>
  )
}
