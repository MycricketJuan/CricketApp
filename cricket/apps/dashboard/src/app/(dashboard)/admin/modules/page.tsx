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
        <p className="text-sm text-gray-500">Tenant no encontrado: {tenantSlug}</p>
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
        <h1 className="text-xl font-semibold text-gray-900">Módulos</h1>
        <p className="text-sm text-gray-500">{tenant.name}</p>
      </div>

      <div className="space-y-4">
        {(!modules || modules.length === 0) && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
            Sin módulos configurados
          </div>
        )}
        {(modules ?? []).map(m => (
          <div key={m.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <p className="font-medium text-gray-900">{MODULE_LABELS[m.module_type] ?? m.module_type}</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {m.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                Fallback: {FALLBACK_LABELS[m.fallback_type] ?? m.fallback_type}
              </span>
            </div>

            {Object.keys(m.config).length > 0 && (
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Configuración del agente</p>
                <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(m.config, null, 2)}
                </pre>
              </div>
            )}

            {Object.keys(m.fallback_config).length > 0 && (
              <div className="px-5 py-3">
                <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Configuración de fallback</p>
                <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto">
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
