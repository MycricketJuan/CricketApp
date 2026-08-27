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
        <div className="h-2 w-2 rounded-full bg-[#4ade80] shadow-[0_0_10px_#4ade80]" />
        <div className="text-[13px] text-[#9aa09a]">Paso 4 · Feedback</div>
      </div>
      <h1 className="mt-5 text-[36px] font-normal leading-[1.16] tracking-[-.02em] text-white">
        ¿Qué quieres saber de tus clientes después de atenderlos?
      </h1>
      <p className="mt-3.5 max-w-[64ch] text-[15.5px] leading-[1.6] text-[#9aa09a]">
        Lucía cierra la conversación con una pregunta corta. Escoge qué medir y cuándo preguntarlo.
      </p>

      <div className="mt-[30px] grid grid-cols-[1.1fr_.9fr] items-start gap-[26px]">
        <div className="flex flex-col gap-px border border-[#1c1f1c] bg-[#1c1f1c]">
          {rules.map((f) => (
            <div key={f.id} className="bg-[#0a0b0a] px-[22px] py-[18px]">
              <div className="flex items-center gap-3">
                <span
                  onClick={() => toggle(f.id)}
                  className="grid h-5 w-5 flex-none cursor-pointer place-items-center text-[11px]"
                  style={
                    f.enabled
                      ? { background: '#4ade80', color: '#04140a', fontWeight: 700 }
                      : { border: '1px solid #232623', color: '#5f645f' }
                  }
                >
                  {f.enabled ? '✓' : ''}
                </span>
                <span className="text-[14.5px] font-medium text-white">{f.name}</span>
                <span className="flex-1" />
                <span className="text-xs text-[#6d726d]">{f.when}</span>
              </div>
              <div className="mt-2.5 pl-8 text-[13px] leading-[1.6] text-[#8a8f8a]">{f.detail}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-[#5f645f]">Así lo pregunta</div>
          <div className="mt-3 flex flex-col gap-3.5 border border-[#1c1f1c] bg-[#0a0b0a] px-[22px] py-5">
            <div className="text-[14.5px] leading-[1.6] text-[#dcf3e2]">
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
                      ? { height: 32, border: '1px solid #232623', color: '#6d726d' }
                      : { height: 32, border: '1px solid #24402c', color: '#4ade80', background: '#0f1a12' }
                  }
                >
                  {n}
                </div>
              ))}
            </div>
            <div className="text-[12.5px] leading-[1.55] text-[#6d726d]">
              Si responde 6 o menos, pregunta una sola cosa más: qué habría hecho la diferencia.
            </div>
          </div>
          {showPending && (
            <div className="mt-3.5 border border-dashed border-[#46391a] bg-[#12100a] px-[18px] py-[15px] text-[12.5px] leading-[1.6] text-[#c9b477]">
              Pendiente de definir: el set completo de preguntas por sector y el tiempo de espera antes de encuestar.
            </div>
          )}
        </div>
      </div>

      <div className="mb-10 mt-[26px] flex gap-3.5">
        <div
          onClick={next}
          className="cursor-pointer bg-[#4ade80] px-7 py-3.5 text-[15px] font-semibold text-[#04140a] hover:bg-[#86efac]"
        >
          Continuar con escalamientos
        </div>
      </div>
    </div>
  )
}
