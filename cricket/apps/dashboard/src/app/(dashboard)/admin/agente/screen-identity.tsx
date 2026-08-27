import { getSectorInfo, SECTORS, SHIRT_COLORS } from './constants'
import type { Sector } from './types'

interface ScreenIdentityProps {
  name:             string
  sector:           Sector
  setSector:        (s: Sector) => void
  shirtColorIndex:  number
  setShirtColorIndex: (i: number) => void
  next:             () => void
}

export function ScreenIdentity({ name, sector, setSector, shirtColorIndex, setShirtColorIndex, next }: ScreenIdentityProps) {
  const info = getSectorInfo(sector)
  const shirt = SHIRT_COLORS[shirtColorIndex]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col px-10 pb-10 pt-[46px] pl-[52px]">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-[#4ade80] shadow-[0_0_10px_#4ade80]" />
            <div className="text-[13px] text-[#9aa09a]">Paso 1 · Identidad</div>
          </div>
          <h1 className="mt-[22px] max-w-[20ch] text-[40px] font-normal leading-[1.14] tracking-[-.022em] text-white text-pretty">
            Antes de enseñarle, démosle cara.
          </h1>
          <p className="mt-4 max-w-[50ch] text-base leading-[1.6] text-[#9aa09a] text-pretty">
            Tu empleado digital se presenta con la imagen de tu empresa. Su apariencia y su tono cambian según el
            sector: un estudio de tatuajes no habla como una firma de abogados.
          </p>

          <div className="mt-8 flex max-w-[460px] flex-col gap-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-[#5f645f]">Nombre</div>
              <div className="mt-2.5 border border-[#232623] bg-[#0a0b0a] px-[15px] py-3.5 text-[15px] text-[#e8e8e8]">
                {name}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-[#5f645f]">Sector</div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {SECTORS.map((s) => (
                  <div
                    key={s.key}
                    onClick={() => setSector(s.key)}
                    className="cursor-pointer px-4 py-2.5 text-[13.5px]"
                    style={
                      s.key === sector
                        ? { background: '#4ade80', color: '#04140a', fontWeight: 600 }
                        : { border: '1px solid #232623', color: '#9aa09a', background: '#0a0b0a' }
                    }
                  >
                    {s.label}
                  </div>
                ))}
              </div>
              <div className="mt-[11px] text-[12.5px] leading-[1.55] text-[#6d726d]">{info.note}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-[#5f645f]">
                Color de la camiseta
              </div>
              <div className="mt-2.5 flex gap-2">
                {SHIRT_COLORS.map((c, k) => (
                  <div
                    key={c}
                    onClick={() => setShirtColorIndex(k)}
                    className="h-[34px] w-[34px] cursor-pointer"
                    style={{
                      background: c,
                      boxShadow: k === shirtColorIndex ? '0 0 0 1px #0b0c0d, 0 0 0 3px #4ade80' : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-[404px] flex-none flex-col items-center border-l border-[#1a1c1a] bg-[#050605] px-[34px] py-10">
          <div className="self-start text-[11px] font-semibold uppercase tracking-[.13em] text-[#5f645f]">
            Vista previa
          </div>
          <div
            className="mt-[34px] grid h-[190px] w-[190px] place-items-center rounded-full border border-[rgba(74,222,128,.3)]"
            style={{ animation: 'agenteOrbPulse 4s ease-in-out infinite' }}
          >
            <div
              className="flex h-[110px] w-[110px] flex-col items-center justify-center rounded-full"
              style={{ background: info.headColor }}
            >
              <div className="flex gap-4">
                <div className="h-[7px] w-[7px] rounded-full bg-[#0b0c0d]" />
                <div className="h-[7px] w-[7px] rounded-full bg-[#0b0c0d]" />
              </div>
              <div className="mt-3 h-[3px] w-[26px] rounded bg-[#0b0c0d]" />
            </div>
          </div>
          <div
            className="mt-[-6px] grid h-[78px] w-[170px] place-items-center"
            style={{ background: shirt, clipPath: 'polygon(22% 0, 78% 0, 100% 100%, 0 100%)' }}
          >
            <div className="grid h-11 w-11 place-items-center border border-dashed border-white/45 text-center text-[9px] leading-[1.3] tracking-[.08em] text-white/75">
              LOGO
            </div>
          </div>
          <div className="mt-[26px] text-center">
            <div className="text-[19px] font-medium text-white">{name}</div>
            <div className="mt-1.5 text-[13px] text-[#8a8f8a]">{info.label} · Aurelia</div>
          </div>
          <div className="mt-[26px] border border-[#1c1f1c] bg-[#0a0b0a] px-[18px] py-4 text-[13.5px] leading-[1.6] text-[#c9cec9]">
            «{info.greeting}»
          </div>
          <div className="flex-1" />
          <div className="text-left text-[11.5px] leading-[1.55] text-[#5f645f]">
            La cara es un marcador de posición. La ilustración final se sube por tenant, junto con el logo y la
            paleta.
          </div>
        </div>
      </div>
      <div className="flex gap-3.5 px-[52px] pb-8">
        <div
          onClick={next}
          className="cursor-pointer bg-[#4ade80] px-7 py-3.5 text-[15px] font-semibold text-[#04140a] hover:bg-[#86efac]"
        >
          Empezar a enseñarle
        </div>
        <div className="cursor-pointer border border-[#232623] px-6 py-3.5 text-[15px] text-[#9aa09a] hover:border-[#3f5a45] hover:text-[#d5d8d5]">
          Subir logo y colores
        </div>
      </div>
    </div>
  )
}
