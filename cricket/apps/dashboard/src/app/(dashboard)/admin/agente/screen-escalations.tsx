import { ESCALATIONS_SEED } from './constants'

const LEVEL_COLORS = ['var(--primary)', 'var(--spark-amber)', 'var(--danger)']

export function ScreenEscalations({ goWorkshop }: { goWorkshop: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto px-[52px] pt-11">
      <div className="flex items-center gap-2.5">
        <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
        <div className="text-[13px] text-ink-muted">Paso 5 · Escalamientos</div>
      </div>
      <h1 className="mt-5 text-[36px] font-normal leading-[1.16] tracking-[-.02em] text-ink">
        Temas donde Lucía no decide sola.
      </h1>
      <p className="mt-3.5 max-w-[64ch] text-[15.5px] leading-[1.6] text-ink-muted">
        Son reglas cerradas, no criterio libre. Revisa las que trae por defecto y ajusta los límites.
      </p>

      <div className="mt-[30px] flex flex-col gap-px border border-border-soft bg-surface-200">
        {ESCALATIONS_SEED.map((e) => {
          const color = LEVEL_COLORS[e.level]
          return (
            <div key={e.id} className="grid grid-cols-[186px_1fr_210px] items-center gap-6 bg-surface-000 px-6 py-5">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 flex-none rounded-full" style={{ background: color, boxShadow: `0 0 9px ${color}` }} />
                <span className="text-[14.5px] font-medium text-ink">{e.topic}</span>
              </div>
              <div className="text-[13.5px] leading-[1.6] text-ink-muted">{e.rule}</div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-ink">{e.owner}</span>
                <span className="cursor-pointer text-[12.5px] text-primary">Editar</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-[18px] max-w-[76ch] text-[12.5px] leading-[1.6] text-ink-subtle">
        Cuando escala, Lucía no corta la conversación: resume el caso, avisa al cliente quién lo va a atender y deja
        el hilo abierto para el equipo.
      </div>

      <div className="mb-10 mt-[26px] flex gap-3.5">
        <div
          onClick={goWorkshop}
          className="cursor-pointer bg-primary px-7 py-3.5 text-[15px] font-semibold text-on-primary hover:bg-primary"
        >
          Abrir el taller
        </div>
        <div className="cursor-pointer border border-border-soft px-6 py-3.5 text-[15px] text-ink-muted hover:border-primary-tint hover:text-ink">
          Agregar tema restringido
        </div>
      </div>
    </div>
  )
}
