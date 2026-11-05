import { CHANNELS, getSectorInfo, SHIRT_COLORS, TRADES } from './constants'
import type { Sector } from './types'

interface ScreenSummaryProps {
  name:            string
  sector:          Sector
  shirtColorIndex: number
  goWorkshop:      () => void
}

export function ScreenSummary({ name, sector, shirtColorIndex, goWorkshop }: ScreenSummaryProps) {
  const info = getSectorInfo(sector)
  const shirt = SHIRT_COLORS[shirtColorIndex]

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto px-[52px] pt-11">
      <div className="flex items-center gap-2.5">
        <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
        <div className="text-[13px] text-ink-muted">Formación completada</div>
      </div>
      <h1 className="mt-5 max-w-[26ch] text-[38px] font-normal leading-[1.15] tracking-[-.02em] text-ink">
        Lucía es una sola. Por dentro son tres oficios.
      </h1>
      <p className="mt-3.5 max-w-[66ch] text-[15.5px] leading-[1.6] text-ink-muted">
        Tu cliente conversa con una sola persona. Detrás, un coordinador decide quién responde en cada momento, sin
        que la conversación se corte ni se transfiera.
      </p>

      <div className="mt-8 grid grid-cols-[280px_1fr] items-stretch gap-[26px]">
        <div className="flex flex-col items-center border border-primary-tint bg-surface-000 px-6 py-[26px] text-center">
          <div
            className="h-[104px] w-[104px] rounded-full"
            style={{
              background: info.headColor,
              boxShadow: `inset 0 -34px 0 ${shirt}, 0 0 0 1px color-mix(in srgb, var(--primary) 35%, transparent), 0 0 30px color-mix(in srgb, var(--primary) 25%, transparent)`,
            }}
          />
          <div className="mt-[18px] text-xl font-medium text-ink">{name}</div>
          <div className="mt-1.5 text-[13px] text-ink-muted">Empleada digital de Aurelia</div>
          <div className="mt-5 flex w-full flex-col gap-2.5 border-t border-border-soft pt-[18px]">
            {CHANNELS.map((c) => (
              <div key={c} className="flex items-center gap-2.5 text-[13px] text-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3.5 border border-border-soft bg-surface-000 px-5 py-4">
            <span className="text-[10.5px] font-semibold uppercase tracking-[.13em] text-primary">Coordinador</span>
            <span className="text-[13.5px] leading-[1.55] text-ink-muted">
              Lee la intención del mensaje y le pasa el turno al oficio que corresponde. El cliente nunca ve el
              cambio.
            </span>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-px border border-border-soft bg-surface-200">
            {TRADES.map((t) => (
              <div key={t.name} className="flex flex-col gap-2.5 bg-surface-000 px-5 pb-[22px] pt-5">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-primary">{t.icon}</span>
                  <span className="text-[14.5px] font-medium text-ink">{t.name}</span>
                </div>
                <div className="text-[13px] leading-[1.6] text-ink-muted">{t.detail}</div>
                <div className="flex-1" />
                <div className="text-xs text-ink-subtle">{t.trait}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[280px_1fr_auto] items-center gap-[26px] border border-dashed border-border-soft bg-surface-000 px-6 py-5">
        <div>
          <div className="text-[14.5px] font-medium text-ink">Request va por su cuenta</div>
          <div className="mt-1.5 text-[12.5px] text-ink-subtle">No entra en Lucía.</div>
        </div>
        <div className="text-[13px] leading-[1.6] text-ink-muted">
          Cada trámite tiene su propio procedimiento, sus datos obligatorios y sus tiempos. Un master request recibe
          la necesidad y la entrega al especialista del trámite.
        </div>
        <div className="cursor-pointer whitespace-nowrap border border-border-soft px-5 py-3 text-[13.5px] text-ink hover:border-primary-tint">
          Configurar Request
        </div>
      </div>

      <div className="mb-10 mt-[26px] flex items-center gap-3.5">
        <div className="cursor-pointer bg-primary px-7 py-3.5 text-[15px] font-semibold text-on-primary hover:bg-primary">
          Activar a Lucía en mis canales
        </div>
        <div
          onClick={goWorkshop}
          className="cursor-pointer border border-border-soft px-6 py-3.5 text-[15px] text-ink-muted hover:border-primary-tint hover:text-ink"
        >
          Volver al taller
        </div>
      </div>
    </div>
  )
}
