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
    <div className="flex w-[236px] flex-none flex-col border-r border-border-soft bg-surface-000 px-5 pb-5 pt-6">
      <div className="text-[19px] font-bold tracking-tight text-ink">
        ZEREZ<span className="align-super text-[10px] text-ink-muted">®</span>
      </div>
      <div className="mt-[26px] text-[12.5px] text-ink-subtle">Formación del empleado digital</div>

      <div className="mt-5 flex flex-col gap-0.5">
        {NAV_STEPS.map((n, k) => {
          const active = navIndex === k
          const done = navIndex === -1 ? true : navIndex > k
          return (
            <div
              key={n.name}
              onClick={() => goTo(k + 1)}
              className="grid cursor-pointer grid-cols-[28px_1fr] items-start gap-2.5 px-2.5 py-2.5"
              style={{ borderLeft: active ? '2px solid var(--primary)' : '2px solid transparent', background: active ? 'var(--surface-000)' : undefined }}
            >
              <div
                className="grid h-7 w-7 place-items-center rounded-full text-[11.5px] tabular-nums"
                style={
                  active
                    ? { border: '1px solid var(--primary)', color: 'var(--primary)', background: 'var(--primary-tint)', boxShadow: '0 0 14px color-mix(in srgb, var(--primary) 35%, transparent)' }
                    : done
                      ? { border: '1px solid var(--primary-tint)', color: 'var(--primary)', background: 'var(--surface-000)' }
                      : { border: '1px solid var(--border-soft)', color: 'var(--ink-subtle)' }
                }
              >
                {done ? '✓' : k + 1}
              </div>
              <div className="min-w-0">
                <div
                  className="text-[13.5px]"
                  style={{ color: active ? 'var(--ink)' : done ? 'var(--ink-muted)' : 'var(--ink-subtle)', fontWeight: active ? 500 : 400 }}
                >
                  {n.name}
                </div>
                <div className="mt-[3px] text-[11px] leading-[1.4] text-ink-subtle">{n.sub}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex-1" />

      <Semaforo screenIndex={i} />

      <div
        onClick={goWorkshop}
        className="flex cursor-pointer items-center gap-2.5 border border-border-soft bg-surface-000 px-[13px] py-3 text-[12.5px] text-ink hover:border-primary-tint hover:bg-wash"
      >
        <span className="text-xs text-ink-muted">▤</span> Taller del empleado
      </div>

      <div className="mt-3.5 flex items-center gap-2.5 border-t border-border-soft pt-3.5">
        <div className="grid h-[30px] w-[30px] place-items-center rounded-full bg-primary-tint text-[11px] font-semibold text-ink">
          AU
        </div>
        <div className="flex-1">
          <div className="text-[12.5px] text-ink">Aurelia</div>
          <div className="text-[10.5px] text-ink-subtle">Tenant</div>
        </div>
        <span className="text-[11px] text-ink-subtle">⌄</span>
      </div>
    </div>
  )
}
