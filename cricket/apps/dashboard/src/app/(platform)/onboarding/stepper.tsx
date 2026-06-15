'use client'

interface StepMeta {
  n: number
  label: string
}

const STEPS: StepMeta[] = [
  { n: 1, label: 'Organización' },
  { n: 2, label: 'Módulos' },
  { n: 3, label: 'Invitación' },
  { n: 4, label: 'Listo' },
]

export function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
      {STEPS.map((step, idx) => {
        const done    = step.n < currentStep
        const active  = step.n === currentStep
        const pending = step.n > currentStep
        const isLast  = idx === STEPS.length - 1

        const circleStyle: React.CSSProperties = done
          ? { background: '#1D9E75', color: '#fff', border: 'none' }
          : active
            ? {
                background: 'var(--color-text-primary)',
                color: 'var(--color-background-primary)',
                border: 'none',
              }
            : {
                background: 'var(--color-background-secondary)',
                color: 'var(--color-text-tertiary)',
                border: '0.5px solid var(--color-border-secondary)',
              }

        const labelStyle: React.CSSProperties = active
          ? {
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              marginTop: 6,
              textAlign: 'center' as const,
              whiteSpace: 'nowrap' as const,
            }
          : done
            ? {
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                marginTop: 6,
                textAlign: 'center' as const,
                whiteSpace: 'nowrap' as const,
              }
            : {
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
                marginTop: 6,
                textAlign: 'center' as const,
                whiteSpace: 'nowrap' as const,
              }

        return (
          <div key={step.n} style={{ display: 'flex', alignItems: 'center', flex: isLast ? 0 : 1 }}>
            {/* Step bubble + label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 500,
                  ...circleStyle,
                }}
              >
                {done ? '✓' : step.n}
              </div>
              <span style={labelStyle}>{step.label}</span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                style={{
                  flex: 1,
                  height: 1.5,
                  marginBottom: 18,
                  marginLeft: 6,
                  marginRight: 6,
                  background: done ? '#1D9E75' : 'var(--color-border-tertiary)',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
