import { SCREENS, SCREEN_COUNT } from './constants'

interface TopBarProps {
  i:    number
  goTo: (n: number) => void
  prev: () => void
  next: () => void
}

export function TopBar({ i, goTo, prev, next }: TopBarProps) {
  const screen = SCREENS[i]

  return (
    <div className="flex h-14 flex-none items-center gap-5 border-b border-[#232527] bg-[#141517] px-5">
      <div className="whitespace-nowrap text-xs font-semibold uppercase tracking-[.14em] text-[#8b9099]">
        Cricket · Diseña tu Empleado Digital
      </div>
      <div className="h-[22px] w-px bg-[#2a2d31]" />
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="text-[11px] font-semibold tabular-nums text-[#4ade80]">
          {String(i + 1).padStart(2, '0')} / {SCREEN_COUNT}
        </span>
        <span className="whitespace-nowrap text-[13px] font-medium text-[#e8e8e8]">{screen.title}</span>
        <span className="whitespace-nowrap text-xs text-[#71767e]">{screen.step}</span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1.5">
        {SCREENS.map((s, n) => (
          <div
            key={n}
            title={`${n + 1}. ${s.title} — ${s.step}`}
            onClick={() => goTo(n)}
            className="h-[7px] w-[7px] cursor-pointer"
            style={{ background: n === i ? '#4ade80' : '#33373b' }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <div
          onClick={prev}
          className="grid h-[34px] w-[34px] cursor-pointer select-none place-items-center border border-[#2a2d31] text-[15px] text-[#c6cad0] hover:border-[#4ade80] hover:text-[#4ade80]"
        >
          ‹
        </div>
        <div
          onClick={next}
          className="grid h-[34px] w-[34px] cursor-pointer select-none place-items-center border border-[#2a2d31] text-[15px] text-[#c6cad0] hover:border-[#4ade80] hover:text-[#4ade80]"
        >
          ›
        </div>
      </div>
    </div>
  )
}
