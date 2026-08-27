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
        <div className="h-2 w-2 rounded-full bg-[#4ade80] shadow-[0_0_10px_#4ade80]" />
        <div className="text-[13px] text-[#9aa09a]">Formación completada</div>
      </div>
      <h1 className="mt-5 max-w-[26ch] text-[38px] font-normal leading-[1.15] tracking-[-.02em] text-white">
        Lucía es una sola. Por dentro son tres oficios.
      </h1>
      <p className="mt-3.5 max-w-[66ch] text-[15.5px] leading-[1.6] text-[#9aa09a]">
        Tu cliente conversa con una sola persona. Detrás, un coordinador decide quién responde en cada momento, sin
        que la conversación se corte ni se transfiera.
      </p>

      <div className="mt-8 grid grid-cols-[280px_1fr] items-stretch gap-[26px]">
        <div className="flex flex-col items-center border border-[#24402c] bg-[#0a0f0b] px-6 py-[26px] text-center">
          <div
            className="h-[104px] w-[104px] rounded-full"
            style={{
              background: info.headColor,
              boxShadow: `inset 0 -34px 0 ${shirt}, 0 0 0 1px rgba(74,222,128,.35), 0 0 30px rgba(74,222,128,.25)`,
            }}
          />
          <div className="mt-[18px] text-xl font-medium text-white">{name}</div>
          <div className="mt-1.5 text-[13px] text-[#8a8f8a]">Empleada digital de Aurelia</div>
          <div className="mt-5 flex w-full flex-col gap-2.5 border-t border-[#1c2a1f] pt-[18px]">
            {CHANNELS.map((c) => (
              <div key={c} className="flex items-center gap-2.5 text-[13px] text-[#c9cec9]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] shadow-[0_0_8px_#4ade80]" />
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3.5 border border-[#1c1f1c] bg-[#0a0b0a] px-5 py-4">
            <span className="text-[10.5px] font-semibold uppercase tracking-[.13em] text-[#4ade80]">Coordinador</span>
            <span className="text-[13.5px] leading-[1.55] text-[#8a8f8a]">
              Lee la intención del mensaje y le pasa el turno al oficio que corresponde. El cliente nunca ve el
              cambio.
            </span>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-px border border-[#1c1f1c] bg-[#1c1f1c]">
            {TRADES.map((t) => (
              <div key={t.name} className="flex flex-col gap-2.5 bg-[#0a0b0a] px-5 pb-[22px] pt-5">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-[#4ade80]">{t.icon}</span>
                  <span className="text-[14.5px] font-medium text-white">{t.name}</span>
                </div>
                <div className="text-[13px] leading-[1.6] text-[#8a8f8a]">{t.detail}</div>
                <div className="flex-1" />
                <div className="text-xs text-[#6d726d]">{t.trait}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[280px_1fr_auto] items-center gap-[26px] border border-dashed border-[#232623] bg-[#080908] px-6 py-5">
        <div>
          <div className="text-[14.5px] font-medium text-[#e8e8e8]">Request va por su cuenta</div>
          <div className="mt-1.5 text-[12.5px] text-[#6d726d]">No entra en Lucía.</div>
        </div>
        <div className="text-[13px] leading-[1.6] text-[#8a8f8a]">
          Cada trámite tiene su propio procedimiento, sus datos obligatorios y sus tiempos. Un master request recibe
          la necesidad y la entrega al especialista del trámite.
        </div>
        <div className="cursor-pointer whitespace-nowrap border border-[#232623] px-5 py-3 text-[13.5px] text-[#d5d8d5] hover:border-[#3f5a45]">
          Configurar Request
        </div>
      </div>

      <div className="mb-10 mt-[26px] flex items-center gap-3.5">
        <div className="cursor-pointer bg-[#4ade80] px-7 py-3.5 text-[15px] font-semibold text-[#04140a] hover:bg-[#86efac]">
          Activar a Lucía en mis canales
        </div>
        <div
          onClick={goWorkshop}
          className="cursor-pointer border border-[#232623] px-6 py-3.5 text-[15px] text-[#9aa09a] hover:border-[#3f5a45] hover:text-[#d5d8d5]"
        >
          Volver al taller
        </div>
      </div>
    </div>
  )
}
