export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { getTramitesAdmin } from '@/lib/tramites/db'
import { getTramiteTemplate } from '@cricket/agents/tramites/templates'
import { TramiteDetail } from '../tramite-detail'
import type { TramiteDetailRow, OperatorRow } from '../tramite-detail'
import { STATUS_LABEL } from '../status'

interface AuditEntry {
  event_type: string
  payload: Record<string, unknown>
  created_at: string
  actor_id: string | null
  actor_type: string
}

interface DocumentRequired {
  name: string
  description: string
  provided: boolean
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const EVENT_LABEL: Record<string, string> = {
  'tramite.created': 'Trámite creado por el agente (borrador)',
  'tramite.submitted': 'Trámite radicado con todos los datos',
  'tramite.status_changed': 'Cambio de estado',
}

export default async function TramiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug') ?? ''
  const supabaseAdmin = getSupabaseAdmin()

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const { data: tramite } = await getTramitesAdmin()
    .from('tramites')
    .select(`
      *,
      end_users(channel_ids, profile),
      tenant_users(id, full_name, email)
    `)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!tramite) notFound()

  const [{ data: operators }, { data: history }] = await Promise.all([
    supabaseAdmin
      .from('tenant_users')
      .select('id, full_name, role')
      .eq('tenant_id', tenant.id)
      .in('role', ['supervisor', 'operator'])
      .eq('is_active', true),

    supabaseAdmin
      .from('audit_log')
      .select('event_type, payload, created_at, actor_id, actor_type')
      .eq('tenant_id', tenant.id)
      .eq('payload->>tramite_id', id)
      .order('created_at', { ascending: true }),
  ])

  const row = tramite as unknown as TramiteDetailRow
  const template = getTramiteTemplate(row.tramite_type)
  const fieldLabel: Record<string, string> = {}
  for (const f of template?.required_fields ?? []) {
    fieldLabel[f.key] = f.label
  }

  const collectedEntries = Object.entries(row.collected_data ?? {})
  const documents = (row.documents_required ?? []) as DocumentRequired[]
  const auditEntries = (history ?? []) as unknown as AuditEntry[]

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400">Trámite</p>
        <h1 className="text-xl font-semibold text-gray-900">{row.label}</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {STATUS_LABEL[row.status] ?? row.status} · Creado {formatDateTime(row.created_at)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Datos recopilados */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
              Datos recopilados por el agente
            </h2>
            {collectedEntries.length === 0 ? (
              <p className="text-sm text-gray-400">Aún no hay datos recopilados</p>
            ) : (
              <dl className="divide-y divide-gray-100">
                {collectedEntries.map(([key, value]) => (
                  <div key={key} className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="text-sm text-gray-500">{fieldLabel[key] ?? key}</dt>
                    <dd className="text-sm font-medium text-gray-900">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          {/* Documentos requeridos */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
              Documentos requeridos
            </h2>
            {documents.length === 0 ? (
              <p className="text-sm text-gray-400">Este trámite no requiere documentos</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li key={doc.name} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-700">{doc.description}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        doc.provided
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {doc.provided ? 'Entregado' : 'Pendiente'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Historial */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
              Historial
            </h2>
            {auditEntries.length === 0 ? (
              <p className="text-sm text-gray-400">Sin eventos registrados</p>
            ) : (
              <ol className="space-y-3">
                {auditEntries.map((entry, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-300" />
                    <div>
                      <p className="text-sm text-gray-700">
                        {EVENT_LABEL[entry.event_type] ?? entry.event_type}
                        {entry.event_type === 'tramite.status_changed' && (
                          <span className="text-gray-500">
                            {' '}
                            ({STATUS_LABEL[String(entry.payload.from_status)] ?? entry.payload.from_status as string}
                            {' → '}
                            {STATUS_LABEL[String(entry.payload.to_status)] ?? entry.payload.to_status as string})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDateTime(entry.created_at)} · {entry.actor_type}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Columna lateral — panel de gestión */}
        <div>
          <TramiteDetail
            tramite={row}
            operators={(operators ?? []) as unknown as OperatorRow[]}
          />
        </div>
      </div>
    </main>
  )
}
