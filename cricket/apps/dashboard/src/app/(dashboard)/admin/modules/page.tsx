export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'

const MODULE_LABELS: Record<string, string> = {
  consultation:  'Consultas',
  sales:         'Ventas',
  transactions:  'Transacciones',
  feedback:      'Retroalimentación',
}

const FALLBACK_LABELS: Record<string, string> = {
  ih_handoff:   'Transferir a agente',
  redirect_url: 'Redirigir URL',
  skip:         'Ignorar',
}

export default async function AdminModulesPage() {
  const headersList = await headers()
  const tenantSlug  = headersList.get('x-tenant-slug') ?? ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any     = getSupabaseAdmin()

  const { data: tenant } = await db
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .single() as { data: { id: string; name: string } | null }

  if (!tenant) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-ink-subtle">Tenant no encontrado: {tenantSlug}</p>
      </div>
    )
  }

  const { data: modules } = await db
    .from('tenant_modules')
    .select('id, module_type, is_active, fallback_type, fallback_config, config, activated_at')
    .eq('tenant_id', tenant.id)
    .order('module_type') as {
      data: Array<{
        id: string
        module_type: string
        is_active: boolean
        fallback_type: string
        fallback_config: Record<string, unknown>
        config: Record<string, unknown>
        activated_at: string | null
      }> | null
    }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-ink">Módulos</h1>
        <p className="text-sm text-ink-subtle">{tenant.name}</p>
      </div>

      <div className="space-y-4">
        {(!modules || modules.length === 0) && (
          <div className="rounded-xl border border-border-soft bg-surface-100 p-8 text-center text-sm text-ink-subtle shadow-sm">
            Sin módulos configurados
          </div>
        )}
        {(modules ?? []).map(m => (
          <div key={m.id} className="rounded-xl border border-border-soft bg-surface-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
              <div className="flex items-center gap-3">
                <p className="font-medium text-ink">{MODULE_LABELS[m.module_type] ?? m.module_type}</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  m.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-200 text-ink-subtle'
                }`}>
                  {m.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <span className="text-xs text-ink-subtle">
                Fallback: {FALLBACK_LABELS[m.fallback_type] ?? m.fallback_type}
              </span>
            </div>

            {Object.keys(m.config).length > 0 && (
              <div className="px-5 py-3 border-b border-border-soft">
                <p className="text-xs font-medium text-ink-subtle mb-2 uppercase tracking-wide">Configuración del agente</p>
                <pre className="text-xs text-ink-muted bg-surface-000 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(m.config, null, 2)}
                </pre>
              </div>
            )}

            {Object.keys(m.fallback_config).length > 0 && (
              <div className="px-5 py-3">
                <p className="text-xs font-medium text-ink-subtle mb-2 uppercase tracking-wide">Configuración de fallback</p>
                <pre className="text-xs text-ink-muted bg-surface-000 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(m.fallback_config, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
