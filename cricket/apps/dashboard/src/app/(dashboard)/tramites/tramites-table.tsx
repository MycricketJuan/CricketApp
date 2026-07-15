'use client'

import { createClient } from '@cricket/core/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { TRAMITE_TEMPLATES } from '@cricket/agents/tramites/templates'

// ── Tipos exportados para uso en page.tsx ─────────────────────────

export interface TramiteRow {
  id: string
  tramite_type: string
  label: string
  status: string
  created_at: string
  submitted_at: string | null
  sla_deadline: string | null
  sla_hours: number
  collected_data: Record<string, unknown>
  assigned_to: string | null
  end_users: {
    channel_ids: Record<string, string>
    profile: Record<string, unknown>
  } | null
  tenant_users: { full_name: string | null } | null
}

// ── Labels y badges ───────────────────────────────────────────────

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  submitted: 'Radicado',
  in_review: 'En revisión',
  pending_docs: 'Docs pendientes',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-amber-100 text-amber-700',
  in_review: 'bg-blue-100 text-blue-700',
  pending_docs: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

const TYPE_OPTIONS = Object.entries(TRAMITE_TEMPLATES).map(([type, tpl]) => ({
  type,
  label: tpl.label,
}))

function Badge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  )
}

// ── Helpers ───────────────────────────────────────────────────────

function customerName(t: TramiteRow): string {
  const name = t.end_users?.profile?.name
  if (typeof name === 'string' && name) return name
  return t.end_users?.channel_ids?.whatsapp ?? t.end_users?.channel_ids?.email ?? '—'
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SlaIndicator({ deadline, now }: { deadline: string | null; now: number | null }) {
  // now es null hasta el primer render en cliente (evita hydration mismatch)
  if (!deadline || now === null) return <span className="text-xs text-gray-400">—</span>

  const horasRestantes = (new Date(deadline).getTime() - now) / 3600000

  if (horasRestantes < 0) {
    return <span className="text-xs font-bold text-red-600">Vencido</span>
  }
  if (horasRestantes < 4) {
    return <span className="text-xs font-medium text-red-600">Urgente</span>
  }
  if (horasRestantes <= 24) {
    return <span className="text-xs font-medium text-amber-600">Vence hoy</span>
  }
  const dias = Math.floor(horasRestantes / 24)
  return <span className="text-xs font-medium text-green-600">{dias}d restantes</span>
}

// ── Componente principal ──────────────────────────────────────────

export function TramitesTable({ initialData }: { initialData: TramiteRow[] }) {
  const router = useRouter()
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [search, setSearch] = useState('')
  const [now, setNow] = useState<number | null>(null)

  // Reloj en cliente para el SLA (evita hydration mismatch)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Realtime: re-fetch vía router.refresh() en cualquier cambio
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('tramites-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tramites' },
          () => router.refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [router])

  const searchLower = search.toLowerCase()
  const filtered = initialData
    .filter((t) => !filterStatus || t.status === filterStatus)
    .filter((t) => !filterType || t.tramite_type === filterType)
    .filter(
      (t) =>
        !search ||
        t.label.toLowerCase().includes(searchLower) ||
        customerName(t).toLowerCase().includes(searchLower),
    )

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente o trámite…"
          className="w-64 rounded-lg border border-gray-200 px-3 py-1.5 text-sm
                     placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
        >
          <option value="">Todos los tipos</option>
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.type} value={opt.type}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 text-gray-400">
          <p className="text-sm">No hay trámites que coincidan</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Trámite', 'Cliente', 'Estado', 'Asignado', 'SLA', 'Radicado'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => router.push(`/tramites/${t.id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{t.label}</td>
                  <td className="px-4 py-3 text-gray-600">{customerName(t)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      label={STATUS_LABEL[t.status] ?? t.status}
                      className={STATUS_BADGE[t.status]}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {t.tenant_users?.full_name ?? 'Sin asignar'}
                  </td>
                  <td className="px-4 py-3">
                    <SlaIndicator deadline={t.sla_deadline} now={now} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(t.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
