'use client'

import { useTransition, useState } from 'react'
import { updateModules } from './actions'

interface ModuleRow {
  id: string
  module_type: 'consultation' | 'sales' | 'transactions' | 'feedback'
  is_active: boolean
  fallback_type: string
}

interface Props {
  tenantId: string
  modules: ModuleRow[]
}

interface ModuleState {
  active: boolean
  fallback: string
  redirectUrl: string
}

const MODULE_META: Record<string, { label: string; desc: string }> = {
  consultation: { label: 'Consulta',    desc: 'Atención y FAQs 24/7' },
  sales:        { label: 'Ventas',      desc: 'Captación y cierre' },
  transactions: { label: 'Transacc.',  desc: 'Gestión operativa con IH' },
  feedback:     { label: 'Feedback',   desc: 'NPS y CSAT al cierre' },
}

const MODULE_ORDER: Array<'consultation' | 'sales' | 'transactions' | 'feedback'> = [
  'consultation', 'sales', 'transactions', 'feedback',
]

function Toggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <div
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: active ? '#1D9E75' : 'var(--color-border-secondary)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background .2s',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          background: '#fff',
          position: 'absolute',
          top: 1,
          transform: active ? 'translateX(16px)' : 'translateX(2px)',
          transition: 'transform .2s',
        }}
      />
    </div>
  )
}

export function StepModules({ tenantId, modules }: Props) {
  const [isPending, startTransition] = useTransition()

  const initialState: Record<string, ModuleState> = {}
  for (const m of modules) {
    initialState[m.module_type] = {
      active: m.is_active,
      fallback: m.fallback_type ?? 'ih_handoff',
      redirectUrl: '',
    }
  }
  for (const key of MODULE_ORDER) {
    if (!initialState[key]) {
      initialState[key] = { active: true, fallback: 'ih_handoff', redirectUrl: '' }
    }
  }

  const [state, setState] = useState<Record<string, ModuleState>>(initialState)

  function toggleModule(mod: string) {
    setState((prev) => ({
      ...prev,
      [mod]: { ...prev[mod], active: !prev[mod].active },
    }))
  }

  function setFallback(mod: string, fallback: string) {
    setState((prev) => ({ ...prev, [mod]: { ...prev[mod], fallback } }))
  }

  function setRedirectUrl(mod: string, url: string) {
    setState((prev) => ({ ...prev, [mod]: { ...prev[mod], redirectUrl: url } }))
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '0.5px solid var(--color-border-secondary)',
    borderRadius: 'var(--border-radius-md, 8px)',
    fontSize: 13,
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)',
    boxSizing: 'border-box',
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 6px', color: 'var(--color-text-primary)' }}>
        Configura los módulos
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>
        Activa o desactiva cada etapa del journey y define el comportamiento de fallback.
      </p>

      <form action={updateModules} onSubmit={() => startTransition(() => {})}>
        <input type="hidden" name="tenantId" value={tenantId} />

        {MODULE_ORDER.map((mod) => {
          const s = state[mod]
          const meta = MODULE_META[mod]

          return (
            <div
              key={mod}
              style={{
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-md, 8px)',
                padding: 16,
                marginBottom: 12,
                background: 'var(--color-background-primary)',
              }}
            >
              {/* Hidden input for active state */}
              <input type="hidden" name={`${mod}_active`} value={s.active ? 'on' : 'off'} />

              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {meta.label}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginLeft: 8 }}>
                    {meta.desc}
                  </span>
                </div>
                <Toggle active={s.active} onToggle={() => toggleModule(mod)} />
              </div>

              {/* Transactions warning */}
              {mod === 'transactions' && !s.active && (
                <p style={{ fontSize: 12, color: 'var(--color-text-warning, #BA7517)', marginTop: 10 }}>
                  El agente de Transacciones siempre requiere aprobación IH cuando está activo.
                  Si lo desactivas, las solicitudes de operaciones se derivarán al fallback elegido.
                </p>
              )}

              {/* Fallback config (shown when inactive) */}
              {!s.active && (
                <div style={{ marginTop: 14 }}>
                  <label
                    htmlFor={`${mod}_fallback`}
                    style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}
                  >
                    Comportamiento cuando este módulo está inactivo
                  </label>
                  <select
                    id={`${mod}_fallback`}
                    name={`${mod}_fallback`}
                    value={s.fallback}
                    onChange={(e) => setFallback(mod, e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="ih_handoff">Escalar a operador humano</option>
                    <option value="redirect_url">Redirigir a URL externa</option>
                    <option value="skip">Omitir etapa</option>
                  </select>

                  {s.fallback === 'redirect_url' && (
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="text"
                        name={`${mod}_redirect_url`}
                        value={s.redirectUrl}
                        onChange={(e) => setRedirectUrl(mod, e.target.value)}
                        placeholder="https://..."
                        style={inputStyle}
                      />
                      <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                        URL a la que redirigir al cliente
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        <button
          type="submit"
          disabled={isPending}
          style={{
            width: '100%',
            padding: '10px',
            marginTop: 8,
            background: isPending ? 'var(--color-border-secondary)' : 'var(--color-text-primary)',
            color: 'var(--color-background-primary)',
            border: 'none',
            borderRadius: 'var(--border-radius-md, 8px)',
            fontSize: 14,
            fontWeight: 500,
            cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Guardando...' : 'Guardar y continuar →'}
        </button>
      </form>
    </div>
  )
}
