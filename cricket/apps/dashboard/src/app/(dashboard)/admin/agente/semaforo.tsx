import { getSemaforo } from './constants'

const COLORS = ['#f0603f', '#f5c451', '#4ade80']

function Lamp({ level, tier }: { level: 0 | 1 | 2; tier: 0 | 1 | 2 }) {
  const color = COLORS[tier]
  if (level === tier) {
    return (
      <div
        className="h-[11px] w-[11px] flex-none rounded-full"
        style={{ background: color, boxShadow: `0 0 0 4px ${color}1f, 0 0 11px ${color}99` }}
      />
    )
  }
  if (level > tier) {
    return (
      <div
        className="h-[11px] w-[11px] flex-none rounded-full"
        style={{ background: `${color}38`, border: `1px solid ${color}55` }}
      />
    )
  }
  return <div className="h-[11px] w-[11px] flex-none rounded-full border border-[#232623] bg-[#141614]" />
}

export function Semaforo({ screenIndex }: { screenIndex: number }) {
  const s = getSemaforo(screenIndex)
  const color = COLORS[s.level]

  return (
    <div className="mb-3 border border-[#1a1c1a] bg-[#050605] p-3.5">
      <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#5f645f]">
        Estado del empleado
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <Lamp level={s.level} tier={0} />
        <Lamp level={s.level} tier={1} />
        <Lamp level={s.level} tier={2} />
        <div className="flex-1" />
        <div className="text-xs font-semibold tabular-nums" style={{ color }}>
          {s.pct}
        </div>
      </div>
      <div className="mt-3 text-[13.5px] font-medium tracking-tight" style={{ color }}>
        {s.name}
      </div>
      <div className="mt-1 text-[11px] leading-[1.45] text-[#5f645f]">{s.note}</div>
    </div>
  )
}
