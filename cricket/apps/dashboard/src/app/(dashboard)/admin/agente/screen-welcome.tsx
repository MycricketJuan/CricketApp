import { STAGES } from './constants'

export function ScreenWelcome({ next }: { next: () => void }) {
  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col px-10 pb-8 pt-14 pl-[52px]">
        <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#4ade80]">Bienvenida</div>
        <h1 className="mt-5 max-w-[22ch] text-[42px] font-normal leading-[1.13] tracking-[-.022em] text-white text-pretty">
          Vas a contratar a alguien. Primero hay que formarla.
        </h1>
        <p className="mt-[18px] max-w-[52ch] text-[16.5px] leading-[1.6] text-[#9aa09a] text-pretty">
          Tu empleado digital atiende a tus clientes en WhatsApp, en tu sitio y en Instagram. Antes de eso necesita
          saber lo que sabe tu mejor persona del equipo: qué vendes, con qué reglas, y cuándo pedir ayuda.
        </p>
        <p className="mt-3.5 max-w-[52ch] text-[16.5px] leading-[1.6] text-[#9aa09a] text-pretty">
          Son cinco conversaciones. No hay formularios largos: te preguntamos y tú respondes con tus palabras,
          escribiendo o hablando.
        </p>
        <div className="flex-1" />
        <div className="flex items-center gap-3.5">
          <div
            onClick={next}
            className="cursor-pointer bg-[#4ade80] px-[30px] py-[15px] text-[15px] font-semibold text-[#04140a] hover:bg-[#86efac]"
          >
            Empezar
          </div>
          <div className="text-[13px] text-[#5f645f]">Unos 15 minutos. Puedes salir y retomar donde ibas.</div>
        </div>
      </div>
      <div className="flex w-[436px] flex-none flex-col border-l border-[#1a1c1a] bg-[#050605] px-[34px] pb-[34px] pt-11">
        <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-[#5f645f]">El proceso</div>
        <div className="mt-[22px] flex flex-col gap-5">
          {STAGES.map((s) => (
            <div key={s.n} className="grid grid-cols-[30px_1fr] items-start gap-3.5">
              <div className="grid h-[30px] w-[30px] flex-none place-items-center rounded-full border border-[#2c4a35] bg-[#0a0f0b] text-xs tabular-nums text-[#4ade80]">
                {s.n}
              </div>
              <div>
                <div className="text-[14.5px] font-medium text-white">{s.name}</div>
                <div className="mt-1 text-[12.5px] leading-[1.55] text-[#6d726d]">{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-[26px] border-t border-[#1a1c1a] pt-[22px]">
          <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-[#5f645f]">
            Cómo sabes que va bien
          </div>
          <div className="mt-4 flex flex-col gap-[13px]">
            <div className="flex items-center gap-3">
              <span
                className="h-[11px] w-[11px] flex-none rounded-full"
                style={{ background: '#f0603f', boxShadow: '0 0 0 4px #f0603f1f, 0 0 11px #f0603f99' }}
              />
              <span className="text-[13px] text-[#c9cec9]">Atención limitada: falta información.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-[11px] w-[11px] flex-none rounded-full border border-[#f5c45155] bg-[#f5c45138]" />
              <span className="text-[13px] text-[#8a8f8a]">Mejora parcial: responde lo básico.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-[11px] w-[11px] flex-none rounded-full border border-[#4ade8055] bg-[#4ade8038]" />
              <span className="text-[13px] text-[#8a8f8a]">Completa: alta confianza en atención al cliente.</span>
            </div>
          </div>
          <div className="mt-4 text-xs leading-[1.55] text-[#5f645f]">
            El semáforo de la izquierda cambia de color a medida que avanzas. Empiezas en rojo.
          </div>
        </div>
      </div>
    </div>
  )
}
