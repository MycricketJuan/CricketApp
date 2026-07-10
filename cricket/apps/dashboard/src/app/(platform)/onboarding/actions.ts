'use server'

import { redirect } from 'next/navigation'
import { getAuth0 } from '@/lib/auth0'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'

const USER_ROLE_CLAIM = 'https://mycricket.ai/user_role'

async function assertSuperadmin(): Promise<string> {
  const session = await getAuth0().getSession()
  if (!session) redirect('/auth/login')
  const role = (session.user[USER_ROLE_CLAIM] ?? '') as string
  if (role !== 'superadmin') redirect('/')
  return session.user.sub as string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function defaultIhPolicies(sector: string): Record<string, unknown> {
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

function defaultStagesConfig() {
  return [
    {
      order: 1, stage_type: 'consultation', is_active: true,
      agent: 'consultation_agent', fallback: null, ih_checkpoint: false,
    },
    {
      order: 2, stage_type: 'sales', is_active: true,
      agent: 'sales_agent', fallback: null, ih_checkpoint: false,
    },
    {
      order: 3, stage_type: 'transactions', is_active: true,
      agent: 'transactions_agent', fallback: 'ih_handoff', ih_checkpoint: false,
    },
    {
      order: 4, stage_type: 'feedback', is_active: true,
      agent: 'feedback_agent', fallback: 'skip', ih_checkpoint: false,
    },
  ]
}

function defaultIhCheckpoints(sector: string) {
  const base = [
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
    base.push({
      trigger: 'sarlaft_threshold',
      action: 'require_compliance_review',
      description: 'Transacciones ≥ 10.000.000 COP requieren revisión SARLAFT',
    })
  }
  return base
}

function buildInvitationEmail(
  tenantName: string,
  slug: string,
  token: string,
  fullName?: string,
): string {
  const name = fullName ?? 'Hola'
  const link = `https://${slug}.mycricket.ai/invite?token=${token}`
  return `
<p>${name}, fuiste invitado como administrador de <strong>${tenantName}</strong> en la plataforma Cricket.</p>
<p><a href="${link}">${link}</a></p>
<p>Este link expira en 7 días.</p>
`
}

// ── Server Actions ────────────────────────────────────────────────────────────

export async function createTenant(formData: FormData) {
  const userId = await assertSuperadmin()
  const db = getSupabaseAdmin()

  const name   = (formData.get('name') as string ?? '').trim()
  const slug   = (formData.get('slug') as string ?? '').trim().toLowerCase()
  const sector = (formData.get('sector') as string ?? '').trim()

  if (name.length < 2)
    redirect('/onboarding?error=' + encodeURIComponent('El nombre es demasiado corto'))
  if (!/^[a-z0-9-]+$/.test(slug))
    redirect('/onboarding?error=' + encodeURIComponent('El slug solo puede contener letras minúsculas, números y guiones'))
  if (slug.length < 3)
    redirect('/onboarding?error=' + encodeURIComponent('El slug debe tener al menos 3 caracteres'))

  const validSectors = ['banking', 'retail', 'health', 'telecom', 'government']
  if (!validSectors.includes(sector))
    redirect('/onboarding?error=' + encodeURIComponent('Sector no válido'))

  const { data: existing } = await db.from('tenants').select('id').eq('slug', slug).maybeSingle()
  if (existing)
    redirect('/onboarding?error=' + encodeURIComponent(`El slug "${slug}" ya está en uso`))

  const { data: tenant, error: tenantError } = await db
    .from('tenants')
    .insert({
      name,
      slug,
      sector: sector as 'banking' | 'retail' | 'health' | 'telecom' | 'government',
      claude_config: {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        temperature: 0.7,
      },
      ih_policies: defaultIhPolicies(sector) as import('@cricket/core/types').Database['public']['Tables']['tenants']['Insert']['ih_policies'],
    })
    .select('id, name, slug')
    .single()

  if (tenantError || !tenant)
    redirect('/onboarding?error=' + encodeURIComponent(tenantError?.message ?? 'Error creando el tenant'))

  await db.from('tenant_modules').insert([
    {
      tenant_id: tenant.id,
      module_type: 'consultation' as const,
      is_active: true,
      fallback_type: 'ih_handoff' as const,
      fallback_config: {},
      config: { confidence_threshold: 0.65, max_turns: 20, knowledge_base_enabled: true },
    },
    {
      tenant_id: tenant.id,
      module_type: 'sales' as const,
      is_active: true,
      fallback_type: 'ih_handoff' as const,
      fallback_config: {},
      config: { confidence_threshold: 0.70, max_turns: 15, product_catalog_enabled: true },
    },
    {
      tenant_id: tenant.id,
      module_type: 'transactions' as const,
      is_active: true,
      fallback_type: 'ih_handoff' as const,
      fallback_config: {},
      config: { confidence_threshold: 0.80, always_require_ih_approval: true },
    },
    {
      tenant_id: tenant.id,
      module_type: 'feedback' as const,
      is_active: true,
      fallback_type: 'skip' as const,
      fallback_config: {},
      config: { nps_scale: 10, collect_csat: true, auto_close_after_feedback: true },
    },
  ])

  await db.from('journey_templates').insert({
    tenant_id: tenant.id,
    sector: sector as 'banking' | 'retail' | 'health' | 'telecom' | 'government',
    name: `Journey ${sector} estándar`,
    stages_config: defaultStagesConfig(),
    ih_checkpoints: defaultIhCheckpoints(sector),
    is_active: true,
    is_default: true,
  })

  await db.from('audit_log').insert({
    tenant_id: tenant.id,
    actor_type: 'HUMAN',
    actor_id: userId,
    event_type: 'tenant.created',
    payload: { name, slug, sector },
  })

  redirect(`/onboarding?step=2&tenantId=${tenant.id}`)
}

export async function updateModules(formData: FormData) {
  await assertSuperadmin()
  const db = getSupabaseAdmin()

  const tenantId = formData.get('tenantId') as string
  if (!tenantId) redirect('/onboarding')

  const modules = ['consultation', 'sales', 'transactions', 'feedback'] as const

  for (const mod of modules) {
    const isActive    = formData.get(`${mod}_active`) === 'on'
    const fallback    = (formData.get(`${mod}_fallback`) as string | null) ?? 'ih_handoff'
    const redirectUrl = (formData.get(`${mod}_redirect_url`) as string | null) ?? ''

    const fallbackConfig =
      fallback === 'redirect_url' && redirectUrl
        ? { url: redirectUrl, message: 'Redirigiendo a nuestro portal.' }
        : {}

    await db
      .from('tenant_modules')
      .update({
        is_active: isActive,
        fallback_type: fallback as 'ih_handoff' | 'redirect_url' | 'skip',
        fallback_config: fallbackConfig,
      })
      .eq('tenant_id', tenantId)
      .eq('module_type', mod)
  }

  redirect(`/onboarding?step=3&tenantId=${tenantId}`)
}

export async function sendInvitation(formData: FormData) {
  const userId = await assertSuperadmin()
  const db = getSupabaseAdmin()

  const tenantId = formData.get('tenantId') as string
  const email    = ((formData.get('email') as string | null) ?? '').trim()
  const fullName = ((formData.get('fullName') as string | null) ?? '').trim() || undefined

  if (!tenantId) redirect('/onboarding')

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    redirect(`/onboarding?step=3&tenantId=${tenantId}&error=` + encodeURIComponent('Email inválido'))

  const { data: existingInvite } = await db
    .from('tenant_invitations')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .eq('email', email)
    .maybeSingle()

  if (existingInvite?.status === 'pending') {
    redirect(
      `/onboarding?step=3&tenantId=${tenantId}&error=` +
        encodeURIComponent('Ya hay una invitación pendiente para ese email'),
    )
  }

  const { data: invitation, error: invError } = await db
    .from('tenant_invitations')
    .insert({ tenant_id: tenantId, email, role: 'tenant_admin' as const })
    .select('id, token, expires_at')
    .single()

  if (invError || !invitation) {
    redirect(
      `/onboarding?step=3&tenantId=${tenantId}&error=` +
        encodeURIComponent(invError?.message ?? 'Error creando la invitación'),
    )
  }

  const { data: tenant } = await db
    .from('tenants')
    .select('slug, name')
    .eq('id', tenantId)
    .single()

  if (tenant && process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? 'noreply@mycricket.ai',
          to: email,
          subject: `Invitación a Cricket — ${tenant.name}`,
          html: buildInvitationEmail(tenant.name, tenant.slug, invitation.token, fullName),
        }),
      })
    } catch {
      // Email failure is non-fatal — invitation already in DB
    }
  }

  await db.from('audit_log').insert({
    tenant_id: tenantId,
    actor_type: 'HUMAN',
    actor_id: userId,
    event_type: 'invitation.sent',
    payload: { email, role: 'tenant_admin', tenant_id: tenantId },
  })

  redirect(`/onboarding?step=done&tenantId=${tenantId}`)
}
