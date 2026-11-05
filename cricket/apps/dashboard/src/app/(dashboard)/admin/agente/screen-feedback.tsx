import type { FeedbackRule } from './types'

interface ScreenFeedbackProps {
  rules:  FeedbackRule[]
  toggle: (id: string) => void
  next:   () => void
}

export function ScreenFeedback({ rules, toggle, next }: ScreenFeedbackProps) {
  const postEntrega = rules.find((r) => r.id === 'postentrega')
  const showPending = postEntrega ? !postEntrega.enabled : true

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto px-[52px] pt-11">
      <div className="flex items-center gap-2.5">
        <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
        <div className="text-[13px] text-ink-muted">Paso 4 · Feedback</div>
      </div>
      <h1 className="mt-5 text-[36px] font-normal leading-[1.16] tracking-[-.02em] text-ink">
        ¿Qué quieres saber de tus clientes después de atenderlos?
      </h1>
      <p className="mt-3.5 max-w-[64ch] text-[15.5px] leading-[1.6] text-ink-muted">
        Lucía cierra la conversación con una pregunta corta. Escoge qué medir y cuándo preguntarlo.
      </p>

      <div className="mt-[30px] grid grid-cols-[1.1fr_.9fr] items-start gap-[26px]">
        <div className="flex flex-col gap-px border border-border-soft bg-surface-200">
          {rules.map((f) => (
            <div key={f.id} className="bg-surface-000 px-[22px] py-[18px]">
              <div className="flex items-center gap-3">
                <span
                  onClick={() => toggle(f.id)}
                  className="grid h-5 w-5 flex-none cursor-pointer place-items-center text-[11px]"
                  style={
                    f.enabled
                      ? { background: 'var(--primary)', color: 'var(--on-primary)', fontWeight: 700 }
                      : { border: '1px solid var(--border-soft)', color: 'var(--ink-subtle)' }
                  }
                >
                  {f.enabled ? '✓' : ''}
                </span>
                <span className="text-[14.5px] font-medium text-ink">{f.name}</span>
                <span className="flex-1" />
                <span className="text-xs text-ink-subtle">{f.when}</span>
              </div>
              <div className="mt-2.5 pl-8 text-[13px] leading-[1.6] text-ink-muted">{f.detail}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-ink-subtle">Así lo pregunta</div>
          <div className="mt-3 flex flex-col gap-3.5 border border-border-soft bg-surface-000 px-[22px] py-5">
            <div className="text-[14.5px] leading-[1.6] text-ink">
              «Gracias por escribirnos. En una escala de 0 a 10, ¿qué tan probable es que recomiendes Aurelia a
              alguien que está amoblando su casa?»
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 11 }, (_, n) => (
                <div
                  key={n}
                  className="grid flex-1 place-items-center text-xs tabular-nums"
                  style={
                    n <= 6
                      ? { height: 32, border: '1px solid var(--border-soft)', color: 'var(--ink-subtle)' }
                      : { height: 32, border: '1px solid var(--primary-tint)', color: 'var(--primary)', background: 'var(--primary-tint)' }
                  }
                >
                  {n}
                </div>
              ))}
            </div>
            <div className="text-[12.5px] leading-[1.55] text-ink-subtle">
              Si responde 6 o menos, pregunta una sola cosa más: qué habría hecho la diferencia.
            </div>
          </div>
          {showPending && (
            <div className="mt-3.5 border border-dashed border-spark-amber bg-wash px-[18px] py-[15px] text-[12.5px] leading-[1.6] text-ink-muted">
              Pendiente de definir: el set completo de preguntas por sector y el tiempo de espera antes de encuestar.
            </div>
          )}
        </div>
      </div>

      <div className="mb-10 mt-[26px] flex gap-3.5">
        <div
          onClick={next}
          className="cursor-pointer bg-primary px-7 py-3.5 text-[15px] font-semibold text-on-primary hover:bg-primary"
        >
          Continuar con escalamientos
        </div>
      </div>
    </div>
  )
}
