import { redirect } from 'next/navigation'
import { auth0 } from '@/lib/auth0'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { Stepper } from './stepper'
import { StepTenant } from './step-tenant'
import { StepModules } from './step-modules'
import { StepInvite } from './step-invite'
import { StepComplete } from './step-complete'

const USER_ROLE_CLAIM = 'https://mycricket.ai/user_role'

interface SearchParams {
  step?: string
  tenantId?: string
  error?: string
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const session = await auth0.getSession()
  if (!session) redirect('/auth/login')
  const role = (session.user[USER_ROLE_CLAIM] ?? '') as string
  if (role !== 'superadmin') redirect('/')

  const params     = await searchParams
  const step       = params.step ?? '1'
  const tenantId   = params.tenantId
  const errorRaw   = params.error

  // ── Guard: params coherentes ──────────────────────────────────────────────
  if ((step === '2' || step === '3' || step === 'done') && !tenantId) {
    redirect('/onboarding')
  }

  const db = getSupabaseAdmin()

  // ── Fetch tenant (pasos 2, 3, done) ──────────────────────────────────────
  let tenant: { id: string; name: string; slug: string; sector: string } | null = null
  if (tenantId) {
    const { data } = await db
      .from('tenants')
      .select('id, name, slug, sector')
      .eq('id', tenantId)
      .single()

    if (!data) redirect('/onboarding?error=' + encodeURIComponent('Tenant no encontrado'))
    tenant = data
  }

  // ── Fetch modules (paso 2) ────────────────────────────────────────────────
  let modules: Array<{
    id: string
    module_type: 'consultation' | 'sales' | 'transactions' | 'feedback'
    is_active: boolean
    fallback_type: string
  }> = []

  if (step === '2' && tenantId) {
    const { data } = await db
      .from('tenant_modules')
      .select('id, module_type, is_active, fallback_type, config')
      .eq('tenant_id', tenantId)
      .order('module_type')

    modules = (data ?? []) as typeof modules
  }

  // ── Derivar paso visual (done → 4 para el stepper) ───────────────────────
  const currentStepNum = step === 'done' ? 4 : parseInt(step, 10)

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }}>
      <Stepper currentStep={currentStepNum} />

      {errorRaw && (
        <div
          style={{
            background: 'var(--color-background-danger, #FEF2F2)',
            color: 'var(--color-text-danger, #D85A30)',
            borderRadius: 'var(--border-radius-md, 8px)',
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 13,
            border: '0.5px solid var(--color-border-danger, #D85A30)',
          }}
        >
          {decodeURIComponent(errorRaw)}
        </div>
      )}

      {step === '1' && <StepTenant />}

      {step === '2' && tenantId && (
        <StepModules tenantId={tenantId} modules={modules} />
      )}

      {step === '3' && tenantId && tenant && (
        <StepInvite tenantId={tenantId} tenantName={tenant.name} />
      )}

      {step === 'done' && tenant && (
        <StepComplete tenant={tenant} />
      )}
    </main>
  )
}
