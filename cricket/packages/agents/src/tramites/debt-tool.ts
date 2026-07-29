import { createClient } from '@supabase/supabase-js'

export interface CheckDebtStatusParams {
  tenantId: string
  documentNumber: string
  supabaseUrl: string
  supabaseKey: string
}

// Simula la consulta de deuda del cliente contra mock_client_debts.
// Si no hay fila registrada, se asume que el cliente está al día
// (no hay integración con el core bancario real todavía).
export async function checkDebtStatus(params: CheckDebtStatusParams): Promise<string> {
  const { tenantId, documentNumber, supabaseUrl, supabaseKey } = params
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data } = await supabase
    .from('mock_client_debts')
    .select('has_debt, debt_amount, debt_detail')
    .eq('tenant_id', tenantId)
    .eq('document_number', documentNumber)
    .maybeSingle()

  if (!data) {
    return JSON.stringify({ has_debt: false })
  }

  return JSON.stringify({
    has_debt: data.has_debt,
    debt_amount: data.debt_amount,
    debt_detail: data.debt_detail,
  })
}

export const CHECK_DEBT_TOOL = {
  name: 'check_debt_status',
  description:
    'Consulta si el cliente tiene deudas pendientes con el banco a partir de su número de documento. Llamar SIEMPRE antes de radicar un paz y salvo, una vez recopilado numero_documento.',
  input_schema: {
    type: 'object' as const,
    properties: {
      document_number: {
        type: 'string',
        description: 'Número de documento de identidad del cliente',
      },
    },
    required: ['document_number'],
  },
}
