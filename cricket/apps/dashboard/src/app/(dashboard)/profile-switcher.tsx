'use client'

import { useState } from 'react'
import { switchProfile } from './switch-profile-action'

export interface UserProfile {
  tenantId:   string
  tenantName: string
  tenantSlug: string
  role:       string
}

interface Props {
  profiles:    UserProfile[]
  activeSlug:  string
  userName:    string
}

const ROLE_LABELS: Record<string, string> = {
  superadmin:   'Superadmin',
  tenant_admin: 'Admin',
  supervisor:   'Supervisor',
  operator:     'Operador',
}

const SECTOR_COLORS: Record<string, string> = {
  banking:    'bg-primary-tint text-primary',
  retail:     'bg-purple-100 text-purple-700',
  health:     'bg-green-100 text-green-700',
  telecom:    'bg-orange-100 text-orange-700',
  government: 'bg-surface-200 text-ink-muted',
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export function ProfileSwitcher({ profiles, activeSlug, userName }: Props) {
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)

  const activeProfile = profiles.find(p => p.tenantSlug === activeSlug) ?? profiles[0]

  if (!activeProfile && profiles.length === 0) {
    // Superadmin sin perfiles de tenant — solo muestra nombre
    return (
      <div className="flex items-center gap-2 rounded-lg px-3 py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shrink-0">
          {initials(userName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-ink">{userName}</p>
          <p className="text-xs text-ink-subtle">ZEREZ Platform</p>
        </div>
      </div>
    )
  }

  const handleSwitch = async (slug: string) => {
    if (slug === activeSlug) { setOpen(false); return }
    setSwitching(slug)
    await switchProfile(slug)
  }

  return (
    <div className="relative">
      {/* Dropdown hacia arriba */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-border-soft bg-surface-100 shadow-lg overflow-hidden">
          <div className="p-1.5 space-y-0.5">
            {profiles.map(p => {
              const isActive  = p.tenantSlug === activeSlug
              const isLoading = switching === p.tenantSlug
              return (
                <button
                  key={p.tenantId}
                  onClick={() => handleSwitch(p.tenantSlug)}
                  disabled={isLoading}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                    isActive ? 'bg-surface-200' : 'hover:bg-surface-000'
                  }`}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                    isActive ? 'bg-primary text-white' : 'bg-wash-strong text-ink-muted'
                  }`}>
                    {isLoading ? '…' : initials(p.tenantName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-ink">{p.tenantName}</p>
                    <p className="text-xs text-ink-subtle">{ROLE_LABELS[p.role] ?? p.role}</p>
                  </div>
                  {isActive && (
                    <span className="text-ink-subtle text-xs">✓</span>
                  )}
                </button>
              )
            })}
          </div>

          {profiles.length > 1 && (
            <div className="border-t border-border-soft px-3 py-2">
              <p className="text-xs text-ink-subtle">{profiles.length} perfiles disponibles</p>
            </div>
          )}
        </div>
      )}

      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-surface-000 transition-colors"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shrink-0">
          {initials(activeProfile?.tenantName ?? userName)}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-xs font-medium text-ink">
            {activeProfile?.tenantName ?? userName}
          </p>
          <p className="text-xs text-ink-subtle">
            {ROLE_LABELS[activeProfile?.role ?? ''] ?? activeProfile?.role ?? ''}
          </p>
        </div>
        {profiles.length > 1 && (
          <span className={`text-ink-subtle text-xs transition-transform ${open ? 'rotate-180' : ''}`}>
            ▲
          </span>
        )}
      </button>
    </div>
  )
}
