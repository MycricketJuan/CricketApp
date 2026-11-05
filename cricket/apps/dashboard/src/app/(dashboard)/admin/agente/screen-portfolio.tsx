import { PORTFOLIO_SEED } from './constants'

export function ScreenPortfolio({ next }: { next: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto px-[52px] pt-11">
      <div className="flex items-center gap-2.5">
        <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
        <div className="text-[13px] text-ink-muted">Paso 3 · Portafolio</div>
      </div>
      <h1 className="mt-5 text-[36px] font-normal leading-[1.16] tracking-[-.02em] text-ink">
        Ahora lo específico: qué vendes y con qué reglas.
      </h1>
      <p className="mt-3.5 max-w-[66ch] text-[15.5px] leading-[1.6] text-ink-muted">
        Aquí las preguntas dejan de ser abiertas. Lucía necesita saber exactamente qué puede ofrecer, a qué precio y
        hasta dónde puede negociar.
      </p>
      <div className="mt-[30px] grid grid-cols-2 gap-px border border-border-soft bg-surface-200">
        {PORTFOLIO_SEED.map((p) => {
          const pend = p.status === 'pendiente'
          return (
            <div key={p.id} className="px-[22px] py-5" style={{ background: pend ? 'var(--wash)' : 'var(--surface-000)' }}>
              <div className="flex items-center justify-between gap-3.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2 w-2 flex-none rounded-full"
                    style={{ background: pend ? 'var(--spark-amber)' : 'var(--primary)', boxShadow: `0 0 9px ${pend ? 'var(--spark-amber)' : 'var(--primary)'}` }}
                  />
                  <span className="text-[14.5px] font-medium text-ink">{p.name}</span>
                </div>
                <span
                  className="px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[.11em]"
                  style={
                    pend
                      ? { color: 'var(--spark-amber)', border: '1px solid var(--border-soft)', background: 'var(--wash)' }
                      : { color: 'var(--primary)', border: '1px solid var(--primary-tint)', background: 'var(--primary-tint)' }
                  }
                >
                  {pend ? 'Pendiente' : 'Listo'}
                </span>
              </div>
              <div className="mt-2.5 text-[13px] leading-[1.6] text-ink-muted">{p.q}</div>
              <div className="mt-3 text-[13.5px] leading-[1.6] text-ink">{p.a}</div>
            </div>
          )
        })}
      </div>
      <div className="mb-10 mt-6 flex items-center gap-3.5">
        <div
          onClick={next}
          className="cursor-pointer bg-primary px-7 py-3.5 text-[15px] font-semibold text-on-primary hover:bg-primary"
        >
          Continuar con feedback
        </div>
        <div className="cursor-pointer border border-border-soft px-6 py-3.5 text-[15px] text-ink-muted hover:border-primary-tint hover:text-ink">
          Cargar lista de precios
        </div>
        <div className="text-[12.5px] text-ink-subtle">Falta 1 de 6: la política de comparación con la competencia.</div>
      </div>
    </div>
  )
}
