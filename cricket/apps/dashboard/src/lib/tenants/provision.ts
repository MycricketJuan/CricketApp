import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import type { Database, SectorType } from '@cricket/core/types'

type TenantInsert = Database['public']['Tables']['tenants']['Insert']
type TenantModuleInsert = Database['public']['Tables']['tenant_modules']['Insert']
type JourneyTemplateInsert = Database['public']['Tables']['journey_templates']['Insert']

const VALID_SECTORS: readonly SectorType[] = [
  'banking',
  'retail',
  'health',
  'telecom',
  'government',
]

export interface ProvisionTenantInput {
  name: string
  slug: string
  sector: string
  actorSub: string
  owner?: {
    auth0Sub: string
    email: string
    fullName?: string | null
  }
}

export interface ProvisionedTenant {
  id: string
  name: string
  slug: string
}

export class TenantProvisioningError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'invalid_name'
      | 'invalid_slug'
      | 'invalid_sector'
      | 'slug_taken'
      | 'tenant_create_failed'
      | 'modules_create_failed'
      | 'journey_create_failed'
      | 'owner_create_failed'
      | 'audit_create_failed',
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'TenantProvisioningError'
  }
}

function parseInput(input: ProvisionTenantInput): {
  name: string
  slug: string
  sector: SectorType
  actorSub: string
} {
  const name = input.name.trim()
  const slug = input.slug.trim().toLowerCase()
  const sector = input.sector.trim() as SectorType

  if (name.length < 2) {
    throw new TenantProvisioningError('El nombre es demasiado corto', 'invalid_name')
  }
  if (slug.length < 3 || !/^[a-z0-9-]+$/.test(slug)) {
    throw new TenantProvisioningError(
      'El slug debe tener al menos 3 caracteres y solo puede contener letras minúsculas, números y guiones',
      'invalid_slug',
    )
  }
  if (!VALID_SECTORS.includes(sector)) {
    throw new TenantProvisioningError('Sector no válido', 'invalid_sector')
  }

  return { name, slug, sector, actorSub: input.actorSub }
}

function defaultIhPolicies(sector: SectorType): TenantInsert['ih_policies'] {
  if (sector === 'banking') {
    return {
      require_2fa_for_operators: true,
      auto_escalate_below_confidence: 0.65,
      max_session_duration_hours: 8,
      human_approval_required_for_payments: true,
      auto_escalate_on_sentiment: ['frustrated', 'angry'],
    }
  }
  if (sector === 'retail') {
    return {
      require_2fa_for_operators: false,
      auto_escalate_below_confidence: 0.55,
      max_session_duration_hours: 24,
      human_approval_required_for_payments: false,
      auto_escalate_on_sentiment: ['angry'],
    }
  }
  if (sector === 'health') {
    return {
      require_2fa_for_operators: true,
      auto_escalate_below_confidence: 0.70,
      max_session_duration_hours: 4,
      human_approval_required_for_payments: false,
      auto_escalate_on_sentiment: ['frustrated', 'angry'],
    }
  }
  return {
    require_2fa_for_operators: false,
    auto_escalate_below_confidence: 0.60,
    max_session_duration_hours: 12,
    human_approval_required_for_payments: false,
    auto_escalate_on_sentiment: ['angry'],
  }
}

function defaultModules(tenantId: string): TenantModuleInsert[] {
  return [
    {
      tenant_id: tenantId,
      module_type: 'consultation',
      is_active: true,
      fallback_type: 'ih_handoff',
      fallback_config: {},
      config: { confidence_threshold: 0.65, max_turns: 20, knowledge_base_enabled: true },
    },
    {
      tenant_id: tenantId,
      module_type: 'sales',
      is_active: true,
      fallback_type: 'ih_handoff',
      fallback_config: {},
      config: { confidence_threshold: 0.70, max_turns: 15, product_catalog_enabled: true },
    },
    {
      tenant_id: tenantId,
      module_type: 'transactions',
      is_active: true,
      fallback_type: 'ih_handoff',
      fallback_config: {},
      config: { confidence_threshold: 0.80, always_require_ih_approval: true },
    },
    {
      tenant_id: tenantId,
      module_type: 'feedback',
      is_active: true,
      fallback_type: 'skip',
      fallback_config: {},
      config: { nps_scale: 10, collect_csat: true, auto_close_after_feedback: true },
    },
  ]
}

function defaultJourney(tenantId: string, sector: SectorType): JourneyTemplateInsert {
  const ihCheckpoints = [
    {
      trigger: 'low_confidence',
      action: 'create_checkpoint',
      description: 'La IA no alcanzó el umbral de confianza mínimo',
    },
    {
      trigger: 'payment_approval',
      action: 'require_supervisor_approval',
      description: 'Toda operación de pago requiere aprobación del supervisor',
    },
  ]

  if (sector === 'banking') {
    ihCheckpoints.push({
      trigger: 'sarlaft_threshold',
      action: 'require_compliance_review',
      description: 'Transacciones ≥ 10.000.000 COP requieren revisión SARLAFT',
    })
  }

  return {
    tenant_id: tenantId,
    sector,
    name: `Journey ${sector} estándar`,
    stages_config: [
      { order: 1, stage_type: 'consultation', is_active: true, agent: 'consultation_agent', fallback: null, ih_checkpoint: false },
      { order: 2, stage_type: 'sales', is_active: true, agent: 'sales_agent', fallback: null, ih_checkpoint: false },
      { order: 3, stage_type: 'transactions', is_active: true, agent: 'transactions_agent', fallback: 'ih_handoff', ih_checkpoint: false },
      { order: 4, stage_type: 'feedback', is_active: true, agent: 'feedback_agent', fallback: 'skip', ih_checkpoint: false },
    ],
    ih_checkpoints: ihCheckpoints,
    is_active: true,
    is_default: true,
  }
}

async function removeIncompleteTenant(tenantId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('tenants').delete().eq('id', tenantId)
  if (error) {
    console.error('[tenant-provisioning] No se pudo limpiar el tenant incompleto', {
      tenantId,
      error: error.message,
    })
  }
}

export async function provisionTenant(rawInput: ProvisionTenantInput): Promise<ProvisionedTenant> {
  const input = parseInput(rawInput)
  const db = getSupabaseAdmin()
  const owner = rawInput.owner
    ? {
        auth0Sub: rawInput.owner.auth0Sub.trim(),
        email: rawInput.owner.email.trim().toLowerCase(),
        fullName: rawInput.owner.fullName?.trim() || null,
      }
    : null

  if (owner && (!owner.auth0Sub || !owner.email || !owner.email.includes('@'))) {
    throw new TenantProvisioningError(
      'La identidad del administrador no es válida',
      'owner_create_failed',
    )
  }

  const { data: existing } = await db
    .from('tenants')
    .select('id')
    .eq('slug', input.slug)
    .maybeSingle()

  if (existing) {
    throw new TenantProvisioningError(`El slug "${input.slug}" ya está en uso`, 'slug_taken')
  }

  const { data: tenant, error: tenantError } = await db
    .from('tenants')
    .insert({
      name: input.name,
      slug: input.slug,
      sector: input.sector,
      claude_config: {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        temperature: 0.7,
      },
      ih_policies: defaultIhPolicies(input.sector),
    })
    .select('id, name, slug')
    .single()

  if (tenantError || !tenant) {
    const code = tenantError?.code === '23505' ? 'slug_taken' : 'tenant_create_failed'
    const message = code === 'slug_taken'
      ? `El slug "${input.slug}" ya está en uso`
      : tenantError?.message ?? 'Error creando el tenant'
    throw new TenantProvisioningError(message, code, { cause: tenantError })
  }

  const { error: modulesError } = await db.from('tenant_modules').insert(defaultModules(tenant.id))
  if (modulesError) {
    await removeIncompleteTenant(tenant.id)
    throw new TenantProvisioningError(
      `Error creando los módulos: ${modulesError.message}`,
      'modules_create_failed',
      { cause: modulesError },
    )
  }

  const { error: journeyError } = await db
    .from('journey_templates')
    .insert(defaultJourney(tenant.id, input.sector))
  if (journeyError) {
    await removeIncompleteTenant(tenant.id)
    throw new TenantProvisioningError(
      `Error creando el journey: ${journeyError.message}`,
      'journey_create_failed',
      { cause: journeyError },
    )
  }

  if (owner) {
    const { error: ownerError } = await db.from('tenant_users').insert({
      tenant_id: tenant.id,
      auth0_sub: owner.auth0Sub,
      email: owner.email,
      full_name: owner.fullName,
      role: 'tenant_admin',
      is_active: true,
    })

    if (ownerError) {
      await removeIncompleteTenant(tenant.id)
      throw new TenantProvisioningError(
        `Error vinculando al administrador: ${ownerError.message}`,
        'owner_create_failed',
        { cause: ownerError },
      )
    }
  }

  const { error: auditError } = await db.from('audit_log').insert({
    tenant_id: tenant.id,
    actor_type: 'HUMAN',
    event_type: 'tenant.created',
    payload: {
      name: input.name,
      slug: input.slug,
      sector: input.sector,
      actor_sub: input.actorSub,
      owner_email: owner?.email ?? null,
    },
  })
  if (auditError) {
    await removeIncompleteTenant(tenant.id)
    throw new TenantProvisioningError(
      `Error registrando la auditoría: ${auditError.message}`,
      'audit_create_failed',
      { cause: auditError },
    )
  }

  return tenant
}
