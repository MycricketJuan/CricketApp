const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

export interface TransactionPreviewInput {
  operation_type: 'transfer' | 'payment' | 'update_data'
  amount?: number
  destination?: string
  description?: string
}

export interface TransactionPreview {
  operation_type: string
  amount_raw: number
  amount_formatted: string
  fee_formatted: string
  total_formatted: string
  compliance_flags: string[]
  risk_level: 'low' | 'medium' | 'high'
  summary: string
}

export function buildTransactionPreview(input: TransactionPreviewInput): TransactionPreview {
  const amount = input.amount ?? 0

  let fee = 0
  if (input.operation_type === 'transfer') {
    fee = Math.min(Math.max(amount * 0.004, 5_000), 50_000)
  }

  const compliance_flags: string[] = []
  if (amount >= 10_000_000) compliance_flags.push('SARLAFT_threshold')
  if (input.destination && !/^\d{6,20}$/.test(input.destination))
    compliance_flags.push('destination_format_unverified')
  if (input.operation_type === 'update_data') compliance_flags.push('sensitive_data_change')

  const risk_level: 'low' | 'medium' | 'high' =
    compliance_flags.includes('SARLAFT_threshold') || compliance_flags.includes('sensitive_data_change')
      ? 'high'
      : compliance_flags.length > 0
        ? 'medium'
        : 'low'

  return {
    operation_type: input.operation_type,
    amount_raw: amount,
    amount_formatted: fmt(amount),
    fee_formatted: fmt(fee),
    total_formatted: fmt(amount + fee),
    compliance_flags,
    risk_level,
    summary: `${input.operation_type} por ${fmt(amount)} + comisión ${fmt(fee)} = total ${fmt(amount + fee)}`,
  }
}

export const TRANSACTION_PREVIEW_TOOL = {
  name: 'transaction_preview',
  description:
    'Calcula fees, flags de cumplimiento normativo y genera el preview formateado de la operación. Llamar solo después de account_check exitoso y antes de solicitar confirmación al cliente.',
  input_schema: {
    type: 'object' as const,
    properties: {
      operation_type: {
        type: 'string',
        enum: ['transfer', 'payment', 'update_data'],
        description: 'Tipo de operación',
      },
      amount: {
        type: 'number',
        description: 'Monto en COP. Omitir para update_data.',
      },
      destination: {
        type: 'string',
        description: 'Número de cuenta o identificador destino',
      },
      description: {
        type: 'string',
        description: 'Descripción o concepto de la operación',
      },
    },
    required: ['operation_type'],
  },
}
