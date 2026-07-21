'use server'

import { redirect } from 'next/navigation'
import { getAuth0 } from '@/lib/auth0'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { provisionTenant, TenantProvisioningError } from '@/lib/tenants/provision'

const USER_ROLE_CLAIM = 'https://mycricket.ai/user_role'

async function assertSuperadmin(): Promise<string> {
  const session = await getAuth0().getSession()
  if (!session) redirect('/auth/login')
  const role = (session.user[USER_ROLE_CLAIM] ?? '') as string
  if (role !== 'superadmin') redirect('/')
  return session.user.sub as string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  let tenant
  try {
    tenant = await provisionTenant({
      name: (formData.get('name') as string | null) ?? '',
      slug: (formData.get('slug') as string | null) ?? '',
      sector: (formData.get('sector') as string | null) ?? '',
      actorSub: userId,
    })
  } catch (error) {
    const message = error instanceof TenantProvisioningError
      ? error.message
      : 'Error inesperado creando el tenant'
    redirect('/onboarding?error=' + encodeURIComponent(message))
  }

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
    event_type: 'invitation.sent',
    payload: { email, role: 'tenant_admin', tenant_id: tenantId, actor_sub: userId },
  })

  redirect(`/onboarding?step=done&tenantId=${tenantId}`)
}
