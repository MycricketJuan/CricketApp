import { STAGES } from './constants'

export function ScreenWelcome({ next }: { next: () => void }) {
  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col px-10 pb-8 pt-14 pl-[52px]">
        <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-primary">Bienvenida</div>
        <h1 className="mt-5 max-w-[22ch] text-[42px] font-normal leading-[1.13] tracking-[-.022em] text-ink text-pretty">
          Vas a contratar a alguien. Primero hay que formarla.
        </h1>
        <p className="mt-[18px] max-w-[52ch] text-[16.5px] leading-[1.6] text-ink-muted text-pretty">
          Tu empleado digital atiende a tus clientes en WhatsApp, en tu sitio y en Instagram. Antes de eso necesita
          saber lo que sabe tu mejor persona del equipo: qué vendes, con qué reglas, y cuándo pedir ayuda.
        </p>
        <p className="mt-3.5 max-w-[52ch] text-[16.5px] leading-[1.6] text-ink-muted text-pretty">
          Son cinco conversaciones. No hay formularios largos: te preguntamos y tú respondes con tus palabras,
          escribiendo o hablando.
        </p>
        <div className="flex-1" />
        <div className="flex items-center gap-3.5">
          <div
            onClick={next}
            className="cursor-pointer bg-primary px-[30px] py-[15px] text-[15px] font-semibold text-on-primary hover:bg-primary"
          >
            Empezar
          </div>
          <div className="text-[13px] text-ink-subtle">Unos 15 minutos. Puedes salir y retomar donde ibas.</div>
        </div>
      </div>
      <div className="flex w-[436px] flex-none flex-col border-l border-border-soft bg-surface-000 px-[34px] pb-[34px] pt-11">
        <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-ink-subtle">El proceso</div>
        <div className="mt-[22px] flex flex-col gap-5">
          {STAGES.map((s) => (
            <div key={s.n} className="grid grid-cols-[30px_1fr] items-start gap-3.5">
              <div className="grid h-[30px] w-[30px] flex-none place-items-center rounded-full border border-primary-tint bg-surface-000 text-xs tabular-nums text-primary">
                {s.n}
              </div>
              <div>
                <div className="text-[14.5px] font-medium text-ink">{s.name}</div>
                <div className="mt-1 text-[12.5px] leading-[1.55] text-ink-subtle">{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-[26px] border-t border-border-soft pt-[22px]">
          <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-ink-subtle">
            Cómo sabes que va bien
          </div>
          <div className="mt-4 flex flex-col gap-[13px]">
            <div className="flex items-center gap-3">
              <span
                className="h-[11px] w-[11px] flex-none rounded-full"
                style={{ background: 'var(--danger)', boxShadow: '0 0 0 4px color-mix(in srgb, var(--danger) 12%, transparent), 0 0 11px color-mix(in srgb, var(--danger) 60%, transparent)' }}
              />
              <span className="text-[13px] text-ink">Atención limitada: falta información.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-[11px] w-[11px] flex-none rounded-full border border-[color-mix(in_srgb,var(--spark-amber)_33%,transparent)] bg-[color-mix(in_srgb,var(--spark-amber)_22%,transparent)]" />
              <span className="text-[13px] text-ink-muted">Mejora parcial: responde lo básico.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-[11px] w-[11px] flex-none rounded-full border border-[var(--primary)55] bg-[var(--primary)38]" />
              <span className="text-[13px] text-ink-muted">Completa: alta confianza en atención al cliente.</span>
            </div>
          </div>
          <div className="mt-4 text-xs leading-[1.55] text-ink-subtle">
            El semáforo de la izquierda cambia de color a medida que avanzas. Empiezas en rojo.
          </div>
        </div>
      </div>
    </div>
  )
}
