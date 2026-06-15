'use client'

import { useState } from 'react'

interface TenantInfo {
  id: string
  name: string
  slug: string
  sector: string
}

interface Props {
  tenant: TenantInfo
}

const cardStyle: React.CSSProperties = {
  border: '0.5px solid var(--color-border-tertiary)',
  borderRadius: 'var(--border-radius-md, 8px)',
  padding: 20,
  marginBottom: 16,
  background: 'var(--color-background-primary)',
}

const monoInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--color-background-secondary)',
  border: '0.5px solid var(--color-border-tertiary)',
  borderRadius: 'var(--border-radius-md, 8px)',
  padding: '9px 12px',
  fontSize: 13,
  fontFamily: 'var(--font-mono, monospace)',
  color: 'var(--color-text-primary)',
  outline: 'none',
}

const copyBtnStyle: React.CSSProperties = {
  padding: '9px 14px',
  border: '0.5px solid var(--color-border-secondary)',
  borderRadius: 'var(--border-radius-md, 8px)',
  fontSize: 12,
  background: 'var(--color-background-primary)',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  flexShrink: 0,
}

export function StepComplete({ tenant }: Props) {
  const loginUrl = `https://${tenant.slug}.mycricket.ai/login`
  const [copiedUrl, setCopiedUrl]   = useState(false)
  const [copiedSlug, setCopiedSlug] = useState(false)

  function copy(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setter(true)
      setTimeout(() => setter(false), 2000)
    })
  }

  const sectorLabel = tenant.sector.charAt(0).toUpperCase() + tenant.sector.slice(1)

  return (
    <div>
      {/* Success header */}
      <div style={{ textAlign: 'center', padding: '24px 0 32px' }}>
        <div style={{ fontSize: 48, lineHeight: 1 }}>✓</div>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: '12px 0 4px', color: 'var(--color-text-primary)' }}>
          {tenant.name} creado
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
          El tenant está listo. Comparte el link de acceso con el equipo.
        </p>
      </div>

      {/* Access card */}
      <div style={cardStyle}>
        <p
          style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            margin: '0 0 8px',
          }}
        >
          URL de acceso
        </p>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input readOnly value={loginUrl} style={monoInputStyle} />
          <button
            onClick={() => copy(loginUrl, setCopiedUrl)}
            style={copyBtnStyle}
          >
            {copiedUrl ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>

        <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', margin: '16px 0' }} />

        <p
          style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            margin: '0 0 10px',
          }}
        >
          Credenciales de la plataforma
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span
            style={{
              background: 'var(--color-background-secondary)',
              color: 'var(--color-text-secondary)',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 12,
              border: '0.5px solid var(--color-border-secondary)',
            }}
          >
            {sectorLabel}
          </span>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, minWidth: 0 }}>
            <input
              readOnly
              value={tenant.slug}
              style={{ ...monoInputStyle, flex: 1, minWidth: 0 }}
            />
            <button onClick={() => copy(tenant.slug, setCopiedSlug)} style={copyBtnStyle}>
              {copiedSlug ? '✓' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>

      {/* Invitation status card */}
      <div
        style={{
          ...cardStyle,
          borderRadius: 'var(--border-radius-md, 8px)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 18, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>✉</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            Invitación enviada
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            El administrador recibirá el acceso por email. El link expira en 7 días.
            Si <code style={{ fontFamily: 'var(--font-mono, monospace)' }}>RESEND_API_KEY</code> no
            está configurada, agrégala a <code style={{ fontFamily: 'var(--font-mono, monospace)' }}>.env.local</code>
            {' '}para habilitar el envío real.
          </div>
        </div>
      </div>

      {/* Final actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <a
          href="/onboarding"
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '10px',
            border: '0.5px solid var(--color-border-secondary)',
            borderRadius: 'var(--border-radius-md, 8px)',
            fontSize: 14,
            textDecoration: 'none',
            color: 'var(--color-text-primary)',
          }}
        >
          Crear otro tenant
        </a>
        <a
          href="/platform"
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '10px',
            background: 'var(--color-text-primary)',
            color: 'var(--color-background-primary)',
            borderRadius: 'var(--border-radius-md, 8px)',
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Ir al panel →
        </a>
      </div>
    </div>
  )
}
