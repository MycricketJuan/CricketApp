import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { QueueRealtime } from './queue-realtime'
import type { EscalationRow, CheckpointRow } from './queue-realtime'

export default async function QueuePage() {
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

  const [{ data: escalations }, { data: checkpoints }] = await Promise.all([
    supabaseAdmin
      .from('escalations')
      .select(`
        id, trigger_reason, customer_sentiment, context_summary, created_at,
        sessions!inner(id, current_stage, actor_control, channel,
          end_users!inner(channel_ids))
      `)
      .eq('tenant_id', tenant.id)
      .is('outcome', null)
      .order('created_at', { ascending: true }),

    supabaseAdmin
      .from('cognitive_checkpoints')
      .select(`
        id, trigger_reason, ai_recommendation, confidence_at_trigger,
        status, created_at, expires_at,
        sessions!inner(id, current_stage)
      `)
      .eq('tenant_id', tenant.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  ])

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-gray-900">Cola de atención</h1>
        <span className="rounded-full bg-gray-100 px-3 py-0.5 text-sm text-gray-600">
          {escalations?.length ?? 0} escalaciones · {checkpoints?.length ?? 0} checkpoints
        </span>
      </div>
      <QueueRealtime
        escalations={(escalations ?? []) as unknown as EscalationRow[]}
        checkpoints={(checkpoints ?? []) as unknown as CheckpointRow[]}
      />
    </div>
  )
}
