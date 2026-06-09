import { createClient } from '@supabase/supabase-js'

export interface CrmLookupParams {
  tenantId: string
  supabaseUrl: string
  supabaseKey: string
  customerId: string
}

export async function crmLookup(params: CrmLookupParams): Promise<string> {
  const supabase = createClient(params.supabaseUrl, params.supabaseKey)

  const { data } = await supabase
    .from('end_users')
    .select('id, channel_ids, metadata, consent_given')
    .eq('id', params.customerId)
    .eq('tenant_id', params.tenantId)
    .maybeSingle()

  if (!data) {
    return JSON.stringify({
      segment: 'basic',
      profile: null,
      message: 'Cliente nuevo — sin historial en CRM',
    })
  }

  const meta = (data.metadata ?? {}) as Record<string, unknown>
  return JSON.stringify({
    customerId: data.id,
    segment: (meta.segment as string) ?? 'basic',
    riskProfile: (meta.risk_profile as string) ?? 'standard',
    profile: meta,
  })
}

export const CRM_LOOKUP_TOOL = {
  name: 'crm_lookup',
  description:
    'Obtiene el perfil del cliente desde el CRM: segmento, perfil de riesgo y metadata. Llamar siempre al inicio para conocer el segmento antes de buscar productos.',
  input_schema: {
    type: 'object' as const,
    properties: {
      customer_identifier: {
        type: 'string',
        description: 'ID único del cliente (UUID del end_user)',
      },
    },
    required: ['customer_identifier'],
  },
}
