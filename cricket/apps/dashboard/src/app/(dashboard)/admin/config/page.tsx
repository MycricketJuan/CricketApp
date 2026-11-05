export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'

const SECTOR_LABELS: Record<string, string> = {
  banking:    'Banca',
  retail:     'Retail',
  health:     'Salud',
  telecom:    'Telecom',
  government: 'Gobierno',
}

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-ink-subtle">{title}</h2>
      <div className="rounded-xl border border-border-soft bg-surface-100 shadow-sm">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between px-5 py-3 border-b border-border-soft last:border-0">
      <span className="text-sm text-ink-subtle w-64 shrink-0">{label}</span>
      <span className="text-sm text-ink text-right">{value}</span>
    </div>
  )
}

export default async function AdminConfigPage() {
  const headersList = await headers()
  const tenantSlug  = headersList.get('x-tenant-slug') ?? ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any     = getSupabaseAdmin()

  const { data: tenant } = await db
    .from('tenants')
    .select('id, name, slug, sector, claude_config, ih_policies, is_active')
    .eq('slug', tenantSlug)
    .single() as {
      data: {
        id: string
        name: string
        slug: string
        sector: string
        claude_config: Record<string, unknown>
        ih_policies: Record<string, unknown>
        is_active: boolean
      } | null
    }

  if (!tenant) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-ink-subtle">Tenant no encontrado: {tenantSlug}</p>
      </div>
    )
  }

  const { data: modules } = await db
    .from('tenant_modules')
    .select('id, module_type, is_active, fallback_type')
    .eq('tenant_id', tenant.id)
    .order('module_type') as {
      data: Array<{
        id: string
        module_type: string
        is_active: boolean
        fallback_type: string
      }> | null
    }

  const cc = tenant.claude_config
  const ih = tenant.ih_policies

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-ink">Configuración</h1>
        <p className="text-sm text-ink-subtle">{tenant.name}</p>
      </div>

      <Section title="Información general">
        <Row label="Nombre" value={tenant.name} />
        <Row label="Subdominio (slug)" value={<code className="text-xs bg-surface-200 px-1.5 py-0.5 rounded">{tenant.slug}</code>} />
        <Row label="Sector" value={
          <span className="inline-flex rounded-full bg-primary-tint px-2 py-0.5 text-xs font-medium text-primary">
            {SECTOR_LABELS[tenant.sector] ?? tenant.sector}
          </span>
        } />
        <Row label="Estado" value={
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            tenant.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-200 text-ink-subtle'
          }`}>
            {tenant.is_active ? 'Activo' : 'Inactivo'}
          </span>
        } />
      </Section>

      <Section title="Configuración de IA">
        {cc.model     !== undefined && <Row label="Modelo" value={String(cc.model)} />}
        {cc.max_tokens !== undefined && <Row label="Tokens máximos" value={Number(cc.max_tokens).toLocaleString('es')} />}
        {cc.temperature !== undefined && <Row label="Temperatura" value={String(cc.temperature)} />}
        {Object.keys(cc).filter(k => !['model','max_tokens','temperature'].includes(k)).map(k => (
          <Row key={k} label={k} value={String(cc[k])} />
        ))}
      </Section>

      <Section title="Políticas de supervisión humana">
        {ih.require_2fa !== undefined && (
          <Row label="Requiere 2FA" value={ih.require_2fa ? 'Sí' : 'No'} />
        )}
        {ih.auto_escalate_below_confidence !== undefined && (
          <Row label="Escalar si confianza IA menor a" value={`${Number(ih.auto_escalate_below_confidence) * 100}%`} />
        )}
        {ih.max_session_duration_mins !== undefined && (
          <Row label="Duración máx. de sesión" value={`${ih.max_session_duration_mins} min`} />
        )}
        {ih.require_human_approval_for_payments !== undefined && (
          <Row label="Aprobación humana en pagos" value={ih.require_human_approval_for_payments ? 'Sí' : 'No'} />
        )}
        {Object.keys(ih).filter(k => !['require_2fa','auto_escalate_below_confidence','max_session_duration_mins','require_human_approval_for_payments'].includes(k)).map(k => (
          <Row key={k} label={k} value={String(ih[k])} />
        ))}
      </Section>

      <Section title="Módulos contratados">
        <table className="w-full text-sm">
          <thead className="border-b border-border-soft bg-surface-000">
            <tr>
              {['Módulo', 'Estado', 'Fallback'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-subtle">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {(!modules || modules.length === 0) && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-ink-subtle">
                  Sin módulos configurados
                </td>
              </tr>
            )}
            {(modules ?? []).map(m => (
              <tr key={m.id} className="hover:bg-surface-000">
                <td className="px-4 py-3 font-medium text-ink">
                  {MODULE_LABELS[m.module_type] ?? m.module_type}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    m.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-200 text-ink-subtle'
                  }`}>
                    {m.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-ink-subtle">
                  {FALLBACK_LABELS[m.fallback_type] ?? m.fallback_type}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  )
}
