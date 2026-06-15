import { createClient } from '@supabase/supabase-js'

export interface AccountCheckParams {
  tenantId: string
  supabaseUrl: string
  supabaseKey: string
  endUserId: string
}

export async function accountCheck(params: AccountCheckParams): Promise<string> {
  const supabase = createClient(params.supabaseUrl, params.supabaseKey)

  const { data, error } = await supabase
    .from('end_users')
    .select('id, consent_given, metadata')
    .eq('id', params.endUserId)
    .eq('tenant_id', params.tenantId)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    return JSON.stringify({ verified: false, reason: 'Cliente no encontrado' })
  }

  const profile = (data.metadata ?? {}) as Record<string, unknown>
  const warnings: string[] = []

  if (!data.consent_given) warnings.push('consent_not_given')
  if (profile.account_status !== 'active') warnings.push('account_not_active')
  if (profile.risk_level === 'high') warnings.push('high_risk_profile')

  return JSON.stringify({
    verified: data.consent_given && profile.account_status === 'active',
    identity_verified: profile.identity_verified ?? false,
    account_status: profile.account_status ?? 'unknown',
    risk_level: profile.risk_level ?? 'standard',
    products: profile.products ?? [],
    warnings,
  })
}

export const ACCOUNT_CHECK_TOOL = {
  name: 'account_check',
  description:
    'Verifica identidad del cliente y estado de cuenta antes de procesar cualquier operación. Llamar siempre como primer paso.',
  input_schema: {
    type: 'object' as const,
    properties: {
      customer_id: {
        type: 'string',
        description: 'UUID del end_user',
      },
    },
    required: ['customer_id'],
  },
}
