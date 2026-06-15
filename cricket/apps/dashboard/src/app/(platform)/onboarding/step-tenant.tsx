'use client'

import { useTransition, useState, useEffect } from 'react'
import { createTenant } from './actions'

const SLUG_RE = /^[a-z0-9-]*$/

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

const fieldStyle: React.CSSProperties = {
  marginBottom: 20,
}

export function StepTenant() {
  const [isPending, startTransition] = useTransition()
  const [name, setName]                 = useState('')
  const [slug, setSlug]                 = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [slugError, setSlugError]       = useState('')

  useEffect(() => {
    if (!slugManuallyEdited) {
      const generated = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      setSlug(generated)
    }
  }, [name, slugManuallyEdited])

  function handleSlugChange(value: string) {
    setSlug(value)
    setSlugManuallyEdited(true)
    if (value && !SLUG_RE.test(value)) {
      setSlugError('Solo letras minúsculas, números y guiones')
    } else {
      setSlugError('')
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 6px', color: 'var(--color-text-primary)' }}>
        Nueva organización
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>
        Configura el tenant. El slug define el subdominio de acceso.
      </p>

      <form
        action={createTenant}
        onSubmit={() => startTransition(() => {})}
      >
        {/* Nombre */}
        <div style={fieldStyle}>
          <label htmlFor="name" style={labelStyle}>
            Nombre de la organización
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Banco XYZ"
            style={inputStyle}
          />
        </div>

        {/* Slug */}
        <div style={fieldStyle}>
          <label htmlFor="slug" style={labelStyle}>
            Identificador URL
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="banco-xyz"
            style={{
              ...inputStyle,
              borderColor: slugError ? '#D85A30' : undefined,
            }}
          />
          {slugError ? (
            <p style={{ fontSize: 12, color: '#D85A30', marginTop: 4 }}>{slugError}</p>
          ) : slug ? (
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
              {slug}.mycricket.ai
            </p>
          ) : null}
        </div>

        {/* Sector */}
        <div style={fieldStyle}>
          <label htmlFor="sector" style={labelStyle}>
            Sector
          </label>
          <select
            id="sector"
            name="sector"
            required
            defaultValue=""
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="" disabled>Seleccionar sector...</option>
            <option value="banking">Banca y servicios financieros</option>
            <option value="retail">Retail y e-commerce</option>
            <option value="health">Salud y seguros</option>
            <option value="telecom">Telecomunicaciones</option>
            <option value="government">Gobierno y sector público</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isPending || !!slugError}
          style={{
            width: '100%',
            padding: '10px',
            background: isPending || slugError ? 'var(--color-border-secondary)' : 'var(--color-text-primary)',
            color: 'var(--color-background-primary)',
            border: 'none',
            borderRadius: 'var(--border-radius-md, 8px)',
            fontSize: 14,
            fontWeight: 500,
            cursor: isPending || slugError ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Creando organización...' : 'Continuar →'}
        </button>
      </form>
    </div>
  )
}
