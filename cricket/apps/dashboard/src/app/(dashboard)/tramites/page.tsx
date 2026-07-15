export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { TramitesTable, STATUS_LABEL } from './tramites-table'
import type { TramiteRow } from './tramites-table'

const PENDING_STATUSES = ['submitted', 'in_review', 'pending_docs'] as const

export default async function TramitesPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug') ?? ''
  const supabaseAdmin = getSupabaseAdmin()

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">Tenant no encontrado: {tenantSlug}</p>
      </div>
    )
  }

  const { data: tramites } = await supabaseAdmin
    .from('tramites')
    .select(`
      id, tramite_type, label, status, created_at, submitted_at,
      sla_deadline, sla_hours, collected_data, assigned_to,
      end_users!inner(channel_ids, profile),
      tenant_users(full_name)
    `)
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = (tramites ?? []) as unknown as TramiteRow[]

  const countByStatus: Record<string, number> = {}
  for (const t of rows) {
    countByStatus[t.status] = (countByStatus[t.status] ?? 0) + 1
  }
  const pendingCount = PENDING_STATUSES.reduce(
    (acc, s) => acc + (countByStatus[s] ?? 0),
    0,
  )

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Trámites</h1>
          <p className="mt-0.5 text-sm text-gray-500">{pendingCount} por gestionar</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PENDING_STATUSES.map((status) => (
            <span
              key={status}
              className="rounded-full bg-gray-100 px-3 py-0.5 text-sm text-gray-600"
            >
              {countByStatus[status] ?? 0} {STATUS_LABEL[status].toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      <TramitesTable initialData={rows} />
    </main>
  )
}
