'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendInvitation } from './actions'

interface Props {
  tenantId: string
  tenantName: string
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '0.5px solid var(--color-border-secondary)',
  borderRadius: 'var(--border-radius-md, 8px)',
  fontSize: 14,
  background: 'var(--color-background-primary)',
  color: 'var(--color-text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  marginBottom: 6,
}

export function StepInvite({ tenantId, tenantName }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 6px', color: 'var(--color-text-primary)' }}>
        Invitar administrador
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 20px' }}>
        El administrador del tenant recibirá un email con acceso a {tenantName}.
        Puede invitar a más usuarios desde el panel de administración.
      </p>

      <form action={sendInvitation} onSubmit={() => startTransition(() => {})}>
        <input type="hidden" name="tenantId" value={tenantId} />

        {/* Email */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="email" style={labelStyle}>
            Email del administrador
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="admin@empresa.com"
            style={inputStyle}
          />
        </div>

        {/* Full name */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="fullName" style={labelStyle}>
            Nombre completo (opcional)
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="María García"
            style={inputStyle}
          />
        </div>

        {/* Role preview chip */}
        <div style={{ marginBottom: 24 }}>
          <span
            style={{
              display: 'inline-block',
              background: 'var(--color-background-secondary)',
              color: 'var(--color-text-secondary)',
              border: '0.5px solid var(--color-border-secondary)',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 12,
            }}
          >
            Rol: Tenant admin
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="submit"
            disabled={isPending}
            style={{
              flex: 1,
              padding: '10px',
              background: isPending ? 'var(--color-border-secondary)' : 'var(--color-text-primary)',
              color: 'var(--color-background-primary)',
              border: 'none',
              borderRadius: 'var(--border-radius-md, 8px)',
              fontSize: 14,
              fontWeight: 500,
              cursor: isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {isPending ? 'Enviando...' : 'Enviar invitación →'}
          </button>

          <button
            type="button"
            onClick={() => router.push(`/onboarding?step=done&tenantId=${tenantId}`)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-tertiary)',
              fontSize: 13,
              cursor: 'pointer',
              padding: '10px 4px',
              flexShrink: 0,
            }}
          >
            Saltar por ahora
          </button>
        </div>
      </form>
    </div>
  )
}
