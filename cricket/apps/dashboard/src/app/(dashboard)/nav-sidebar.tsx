'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ProfileSwitcher, type UserProfile } from './profile-switcher'

interface NavItem {
  label: string
  href: string
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  superadmin: [
    { label: 'Visión general',  href: '/platform' },
    { label: 'Nuevo tenant',    href: '/onboarding' },
    { label: 'Tenants',         href: '/platform/tenants' },
    { label: 'Usuarios',        href: '/platform/users' },
    { label: 'Módulos',         href: '/platform/modules' },
    { label: 'Monitoreo',       href: '/platform/monitoring' },
    { label: 'Agentes IA',      href: '/platform/agents' },
    { label: 'Auditoría',       href: '/platform/audit' },
  ],
  tenant_admin: [
    { label: 'Resumen',         href: '/admin' },
    { label: 'Configuración',   href: '/admin/config' },
    { label: 'Usuarios',        href: '/admin/users' },
    { label: 'Módulos',          href: '/admin/modules' },
    { label: 'Trámites',        href: '/tramites' },
    { label: 'Base de conocimiento', href: '/admin/knowledge' },
    { label: 'Auditoría',       href: '/admin/audit' },
  ],
  supervisor: [
    { label: 'Panel',           href: '/dashboard' },
    { label: 'Cola',            href: '/queue' },
    { label: 'Trámites',        href: '/tramites' },
    { label: 'Análisis',        href: '/analytics' },
  ],
  operator: [
    { label: 'Cola de atención', href: '/queue' },
    { label: 'Trámites',        href: '/tramites' },
  ],
}

function NavItem({ href, label }: NavItem) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/platform' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
        isActive
          ? 'bg-gray-100 font-medium text-gray-900'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {label}
    </Link>
  )
}

interface NavSidebarProps {
  role:       string
  userName:   string
  profiles:   UserProfile[]
  activeSlug: string
}

export function NavSidebar({ role, userName, profiles, activeSlug }: NavSidebarProps) {
  const items = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.operator

  return (
    <aside className="fixed inset-y-0 left-0 flex w-56 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-gray-100 px-4">
        <span className="text-base font-bold tracking-tight text-gray-900">🏏 Cricket</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 p-3 space-y-1">
        <NavItem href="/help" label="Ayuda" />
        <a
          href="/auth/logout"
          className="block rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        >
          Cerrar sesión
        </a>

        {/* Profile switcher */}
        <div className="border-t border-gray-100 pt-2 mt-1">
          <ProfileSwitcher
            profiles={profiles}
            activeSlug={activeSlug}
            userName={userName}
          />
        </div>
      </div>
    </aside>
  )
}
