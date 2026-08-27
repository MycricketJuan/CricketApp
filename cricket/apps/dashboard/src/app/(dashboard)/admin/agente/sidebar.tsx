import { NAV_STEPS, SCREEN_TO_NAV } from './constants'
import { Semaforo } from './semaforo'

interface SidebarProps {
  i:           number
  goTo:        (n: number) => void
  goWorkshop:  () => void
}

export function Sidebar({ i, goTo, goWorkshop }: SidebarProps) {
  const navIndex = SCREEN_TO_NAV[i]

  return (
    <div className="flex w-[236px] flex-none flex-col border-r border-[#1a1c1a] bg-black px-5 pb-5 pt-6">
      <div className="text-[19px] font-bold tracking-tight text-white">
        CRICKET<span className="align-super text-[10px] text-[#8a8f8a]">®</span>
      </div>
      <div className="mt-[26px] text-[12.5px] text-[#6f746f]">Formación del empleado digital</div>

      <div className="mt-5 flex flex-col gap-0.5">
        {NAV_STEPS.map((n, k) => {
          const active = navIndex === k
          const done = navIndex === -1 ? true : navIndex > k
          return (
            <div
              key={n.name}
              onClick={() => goTo(k + 1)}
              className="grid cursor-pointer grid-cols-[28px_1fr] items-start gap-2.5 px-2.5 py-2.5"
              style={{ borderLeft: active ? '2px solid #4ade80' : '2px solid transparent', background: active ? '#0c110d' : undefined }}
            >
              <div
                className="grid h-7 w-7 place-items-center rounded-full text-[11.5px] tabular-nums"
                style={
                  active
                    ? { border: '1px solid #4ade80', color: '#4ade80', background: '#0a1a0f', boxShadow: '0 0 14px rgba(74,222,128,.35)' }
                    : done
                      ? { border: '1px solid #2c4a35', color: '#4ade80', background: '#0a0f0b' }
                      : { border: '1px solid #232623', color: '#5f645f' }
                }
              >
                {done ? '✓' : k + 1}
              </div>
              <div className="min-w-0">
                <div
                  className="text-[13.5px]"
                  style={{ color: active ? '#fff' : done ? '#b6bbb6' : '#7a7f7a', fontWeight: active ? 500 : 400 }}
                >
                  {n.name}
                </div>
                <div className="mt-[3px] text-[11px] leading-[1.4] text-[#5f645f]">{n.sub}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex-1" />

      <Semaforo screenIndex={i} />

      <div
        onClick={goWorkshop}
        className="flex cursor-pointer items-center gap-2.5 border border-[#232623] bg-[#0a0b0a] px-[13px] py-3 text-[12.5px] text-[#d5d8d5] hover:border-[#3f5a45] hover:bg-[#0e120f]"
      >
        <span className="text-xs text-[#8a8f8a]">▤</span> Taller del empleado
      </div>

      <div className="mt-3.5 flex items-center gap-2.5 border-t border-[#1a1c1a] pt-3.5">
        <div className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[#2f7f52] text-[11px] font-semibold text-[#e8ffe8]">
          AU
        </div>
        <div className="flex-1">
          <div className="text-[12.5px] text-[#e8e8e8]">Aurelia</div>
          <div className="text-[10.5px] text-[#5f645f]">Tenant</div>
        </div>
        <span className="text-[11px] text-[#5f645f]">⌄</span>
      </div>
    </div>
  )
}
