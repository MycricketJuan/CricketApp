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
            <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
            <div className="text-[13px] text-ink-muted">Paso 1 · Identidad</div>
          </div>
          <h1 className="mt-[22px] max-w-[20ch] text-[40px] font-normal leading-[1.14] tracking-[-.022em] text-ink text-pretty">
            Antes de enseñarle, démosle cara.
          </h1>
          <p className="mt-4 max-w-[50ch] text-base leading-[1.6] text-ink-muted text-pretty">
            Tu empleado digital se presenta con la imagen de tu empresa. Su apariencia y su tono cambian según el
            sector: un estudio de tatuajes no habla como una firma de abogados.
          </p>

          <div className="mt-8 flex max-w-[460px] flex-col gap-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-ink-subtle">Nombre</div>
              <div className="mt-2.5 border border-border-soft bg-surface-000 px-[15px] py-3.5 text-[15px] text-ink">
                {name}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-ink-subtle">Sector</div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {SECTORS.map((s) => (
                  <div
                    key={s.key}
                    onClick={() => setSector(s.key)}
                    className="cursor-pointer px-4 py-2.5 text-[13.5px]"
                    style={
                      s.key === sector
                        ? { background: 'var(--primary)', color: 'var(--on-primary)', fontWeight: 600 }
                        : { border: '1px solid var(--border-soft)', color: 'var(--ink-muted)', background: 'var(--surface-000)' }
                    }
                  >
                    {s.label}
                  </div>
                ))}
              </div>
              <div className="mt-[11px] text-[12.5px] leading-[1.55] text-ink-subtle">{info.note}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-ink-subtle">
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
                      boxShadow: k === shirtColorIndex ? '0 0 0 1px var(--surface-000), 0 0 0 3px var(--primary)' : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-[404px] flex-none flex-col items-center border-l border-border-soft bg-surface-000 px-[34px] py-10">
          <div className="self-start text-[11px] font-semibold uppercase tracking-[.13em] text-ink-subtle">
            Vista previa
          </div>
          <div
            className="mt-[34px] grid h-[190px] w-[190px] place-items-center rounded-full border border-[color-mix(in_srgb,var(--primary)_30%,transparent)]"
            style={{ animation: 'agenteOrbPulse 4s ease-in-out infinite' }}
          >
            <div
              className="flex h-[110px] w-[110px] flex-col items-center justify-center rounded-full"
              style={{ background: info.headColor }}
            >
              <div className="flex gap-4">
                <div className="h-[7px] w-[7px] rounded-full bg-surface-000" />
                <div className="h-[7px] w-[7px] rounded-full bg-surface-000" />
              </div>
              <div className="mt-3 h-[3px] w-[26px] rounded bg-surface-000" />
            </div>
          </div>
          <div
            className="mt-[-6px] grid h-[78px] w-[170px] place-items-center"
            style={{ background: shirt, clipPath: 'polygon(22% 0, 78% 0, 100% 100%, 0 100%)' }}
          >
            <div className="grid h-11 w-11 place-items-center border border-dashed border-white/45 text-center text-[9px] leading-[1.3] tracking-[.08em] text-ink/75">
              LOGO
            </div>
          </div>
          <div className="mt-[26px] text-center">
            <div className="text-[19px] font-medium text-ink">{name}</div>
            <div className="mt-1.5 text-[13px] text-ink-muted">{info.label} · Aurelia</div>
          </div>
          <div className="mt-[26px] border border-border-soft bg-surface-000 px-[18px] py-4 text-[13.5px] leading-[1.6] text-ink">
            «{info.greeting}»
          </div>
          <div className="flex-1" />
          <div className="text-left text-[11.5px] leading-[1.55] text-ink-subtle">
            La cara es un marcador de posición. La ilustración final se sube por tenant, junto con el logo y la
            paleta.
          </div>
        </div>
      </div>
      <div className="flex gap-3.5 px-[52px] pb-8">
        <div
          onClick={next}
          className="cursor-pointer bg-primary px-7 py-3.5 text-[15px] font-semibold text-on-primary hover:bg-primary"
        >
          Empezar a enseñarle
        </div>
        <div className="cursor-pointer border border-border-soft px-6 py-3.5 text-[15px] text-ink-muted hover:border-primary-tint hover:text-ink">
          Subir logo y colores
        </div>
      </div>
    </div>
  )
}
