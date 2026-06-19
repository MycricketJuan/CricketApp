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
  banking:    'bg-blue-100 text-blue-700',
  retail:     'bg-purple-100 text-purple-700',
  health:     'bg-green-100 text-green-700',
  telecom:    'bg-orange-100 text-orange-700',
  government: 'bg-gray-100 text-gray-600',
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
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white shrink-0">
          {initials(userName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-gray-900">{userName}</p>
          <p className="text-xs text-gray-400">Cricket Platform</p>
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
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
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
                    isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                    isActive ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {isLoading ? '…' : initials(p.tenantName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-900">{p.tenantName}</p>
                    <p className="text-xs text-gray-400">{ROLE_LABELS[p.role] ?? p.role}</p>
                  </div>
                  {isActive && (
                    <span className="text-gray-400 text-xs">✓</span>
                  )}
                </button>
              )
            })}
          </div>

          {profiles.length > 1 && (
            <div className="border-t border-gray-100 px-3 py-2">
              <p className="text-xs text-gray-400">{profiles.length} perfiles disponibles</p>
            </div>
          )}
        </div>
      )}

      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white shrink-0">
          {initials(activeProfile?.tenantName ?? userName)}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-xs font-medium text-gray-900">
            {activeProfile?.tenantName ?? userName}
          </p>
          <p className="text-xs text-gray-400">
            {ROLE_LABELS[activeProfile?.role ?? ''] ?? activeProfile?.role ?? ''}
          </p>
        </div>
        {profiles.length > 1 && (
          <span className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>
            ▲
          </span>
        )}
      </button>
    </div>
  )
}
