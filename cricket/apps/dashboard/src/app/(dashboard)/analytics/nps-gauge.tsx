'use client'

interface Props {
  score: number
  promoterPct: number
  passivePct: number
  detractorPct: number
  totalResponses: number
}

function scoreColor(score: number): string {
  if (score > 50) return '#1D9E75'
  if (score >= 0) return '#BA7517'
  return '#D85A30'
}

export function NpsGauge({ score, promoterPct, passivePct, detractorPct, totalResponses }: Props) {
  const color = scoreColor(score)

  return (
    <div>
      {/* Score central */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        {totalResponses === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>
            Sin respuestas aún
          </div>
        ) : (
          <>
            <div style={{ fontSize: 40, fontWeight: 500, color, lineHeight: 1 }}>
              {score > 0 ? '+' : ''}{score}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
              basado en {totalResponses} respuestas
            </div>
          </>
        )}
      </div>

      {/* Barra apilada */}
      <div
        style={{
          display: 'flex',
          height: 8,
          borderRadius: 4,
          overflow: 'hidden',
          marginBottom: 12,
          background: totalResponses === 0 ? 'var(--color-border-tertiary)' : undefined,
        }}
      >
        {totalResponses > 0 && (
          <>
            {promoterPct > 0 && (
              <div style={{ width: `${promoterPct}%`, background: '#1D9E75' }} />
            )}
            {passivePct > 0 && (
              <div style={{ width: `${passivePct}%`, background: '#BA7517' }} />
            )}
            {detractorPct > 0 && (
              <div style={{ width: `${detractorPct}%`, background: '#D85A30' }} />
            )}
          </>
        )}
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {[
          { label: 'Promotores', pct: promoterPct, col: '#1D9E75' },
          { label: 'Pasivos', pct: passivePct, col: '#BA7517' },
          { label: 'Detractores', pct: detractorPct, col: '#D85A30' },
        ].map((item) => (
          <div key={item.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: item.col }}>{item.pct}%</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
