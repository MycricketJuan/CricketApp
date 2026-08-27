import { ESCALATIONS_SEED } from './constants'

const LEVEL_COLORS = ['#4ade80', '#f5c451', '#f0603f']

export function ScreenEscalations({ goWorkshop }: { goWorkshop: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto px-[52px] pt-11">
      <div className="flex items-center gap-2.5">
        <div className="h-2 w-2 rounded-full bg-[#4ade80] shadow-[0_0_10px_#4ade80]" />
        <div className="text-[13px] text-[#9aa09a]">Paso 5 · Escalamientos</div>
      </div>
      <h1 className="mt-5 text-[36px] font-normal leading-[1.16] tracking-[-.02em] text-white">
        Temas donde Lucía no decide sola.
      </h1>
      <p className="mt-3.5 max-w-[64ch] text-[15.5px] leading-[1.6] text-[#9aa09a]">
        Son reglas cerradas, no criterio libre. Revisa las que trae por defecto y ajusta los límites.
      </p>

      <div className="mt-[30px] flex flex-col gap-px border border-[#1c1f1c] bg-[#1c1f1c]">
        {ESCALATIONS_SEED.map((e) => {
          const color = LEVEL_COLORS[e.level]
          return (
            <div key={e.id} className="grid grid-cols-[186px_1fr_210px] items-center gap-6 bg-[#0a0b0a] px-6 py-5">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 flex-none rounded-full" style={{ background: color, boxShadow: `0 0 9px ${color}` }} />
                <span className="text-[14.5px] font-medium text-white">{e.topic}</span>
              </div>
              <div className="text-[13.5px] leading-[1.6] text-[#8a8f8a]">{e.rule}</div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-[#c9cec9]">{e.owner}</span>
                <span className="cursor-pointer text-[12.5px] text-[#4ade80]">Editar</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-[18px] max-w-[76ch] text-[12.5px] leading-[1.6] text-[#5f645f]">
        Cuando escala, Lucía no corta la conversación: resume el caso, avisa al cliente quién lo va a atender y deja
        el hilo abierto para el equipo.
      </div>

      <div className="mb-10 mt-[26px] flex gap-3.5">
        <div
          onClick={goWorkshop}
          className="cursor-pointer bg-[#4ade80] px-7 py-3.5 text-[15px] font-semibold text-[#04140a] hover:bg-[#86efac]"
        >
          Abrir el taller
        </div>
        <div className="cursor-pointer border border-[#232623] px-6 py-3.5 text-[15px] text-[#9aa09a] hover:border-[#3f5a45] hover:text-[#d5d8d5]">
          Agregar tema restringido
        </div>
      </div>
    </div>
  )
}
