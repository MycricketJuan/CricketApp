// Configuración de los tipos de trámite bancario.
// Cada template define los campos que el agente recopila
// conversacionalmente (con la pregunta exacta a usar), los
// documentos que el cliente deberá aportar, y el SLA estándar.

export const TRAMITE_TEMPLATES = {
  apertura_cuenta: {
    label: 'Apertura de cuenta de ahorros',
    description: 'Crear una nueva cuenta de ahorros',
    required_fields: [
      { key: 'tipo_cuenta', label: 'Tipo de cuenta', question: '¿Qué tipo de cuenta deseas abrir? (digital, clásica, premium)' },
      { key: 'ingreso_mensual', label: 'Ingreso mensual', question: '¿Cuál es tu ingreso mensual aproximado?' },
      { key: 'uso_previsto', label: 'Uso previsto', question: '¿Para qué usarás principalmente la cuenta? (ahorro, nómina, negocios)' },
    ],
    documents_required: [
      { name: 'cedula', description: 'Cédula de ciudadanía vigente' },
      { name: 'comprobante_ingresos', description: 'Último comprobante de pago o extracto' },
    ],
    sla_hours: 24,
    confirmation_message: 'Tu solicitud de apertura de cuenta fue radicada exitosamente. Un asesor la revisará en máximo 24 horas hábiles y te notificaremos por este mismo canal.',
  },

  solicitud_credito: {
    label: 'Solicitud de crédito personal',
    description: 'Solicitar un crédito personal o de consumo',
    required_fields: [
      { key: 'monto_solicitado', label: 'Monto solicitado', question: '¿Qué monto necesitas? (en pesos COP)' },
      { key: 'plazo_meses', label: 'Plazo en meses', question: '¿En cuántos meses deseas pagarlo? (12, 24, 36, 48 o 60 meses)' },
      { key: 'destino_credito', label: 'Destino del crédito', question: '¿Para qué destinarás el crédito? (viaje, educación, vehículo, libre inversión, otro)' },
      { key: 'ingreso_mensual', label: 'Ingreso mensual', question: '¿Cuál es tu ingreso mensual?' },
      { key: 'tipo_contrato', label: 'Tipo de contrato', question: '¿Cuál es tu tipo de vinculación laboral? (término indefinido, término fijo, independiente)' },
    ],
    documents_required: [
      { name: 'cedula', description: 'Cédula de ciudadanía vigente' },
      { name: 'comprobante_ingresos', description: 'Últimas 3 colillas de pago o declaración de renta' },
      { name: 'extractos_bancarios', description: 'Extractos de los últimos 3 meses' },
    ],
    sla_hours: 72,
    confirmation_message: 'Tu solicitud de crédito fue radicada. Nuestros analistas la evaluarán en hasta 3 días hábiles. Te informaremos la respuesta por este canal.',
  },

  tarjeta_credito: {
    label: 'Solicitud de tarjeta de crédito',
    description: 'Solicitar una nueva tarjeta de crédito',
    required_fields: [
      { key: 'tipo_tarjeta', label: 'Tipo de tarjeta', question: '¿Qué tarjeta te interesa? (Clásica, Oro, Platinum)' },
      { key: 'cupo_solicitado', label: 'Cupo solicitado', question: '¿Qué cupo deseas solicitar?' },
      { key: 'ingreso_mensual', label: 'Ingreso mensual', question: '¿Cuál es tu ingreso mensual?' },
    ],
    documents_required: [
      { name: 'cedula', description: 'Cédula de ciudadanía vigente' },
      { name: 'comprobante_ingresos', description: 'Último comprobante de pago' },
    ],
    sla_hours: 120,
    confirmation_message: 'Tu solicitud de tarjeta de crédito fue radicada. La respuesta llega en máximo 5 días hábiles.',
  },

  actualizacion_datos: {
    label: 'Actualización de datos personales',
    description: 'Actualizar dirección, teléfono, email u otros datos',
    required_fields: [
      { key: 'tipo_actualizacion', label: 'Qué deseas actualizar', question: '¿Qué información deseas actualizar? (dirección, teléfono, email, estado civil, actividad económica)' },
      { key: 'nuevos_datos', label: 'Nuevos datos', question: 'Por favor comparte los nuevos datos que deseas registrar.' },
    ],
    documents_required: [],
    sla_hours: 24,
    confirmation_message: 'Tus nuevos datos fueron radicados para actualización. El cambio se verá reflejado en máximo 1 día hábil.',
  },

  cdt: {
    label: 'Apertura de CDT',
    description: 'Abrir un Certificado de Depósito a Término',
    required_fields: [
      { key: 'monto', label: 'Monto a invertir', question: '¿Cuánto deseas invertir? (mínimo $1.000.000 COP)' },
      { key: 'plazo_dias', label: 'Plazo', question: '¿A qué plazo? (90, 180, 365, 540 o 720 días)' },
      { key: 'forma_pago_rendimientos', label: 'Pago de rendimientos', question: '¿Cómo deseas recibir los rendimientos? (al vencimiento o mensual)' },
      { key: 'cuenta_debito', label: 'Cuenta para débito', question: '¿De qué cuenta debemos tomar el dinero?' },
    ],
    documents_required: [
      { name: 'cedula', description: 'Cédula de ciudadanía vigente' },
    ],
    sla_hours: 8,
    confirmation_message: 'Tu solicitud de CDT fue radicada. Un asesor la procesará en menos de 8 horas hábiles y recibirás el certificado por email.',
  },

  reclamacion: {
    label: 'Radicación de reclamación',
    description: 'Radicar una queja o reclamación formal',
    required_fields: [
      { key: 'tipo_reclamacion', label: 'Tipo de reclamación', question: '¿Cuál es el motivo de tu reclamación? (transacción no reconocida, cobro incorrecto, falla en servicio, otro)' },
      { key: 'fecha_incidente', label: 'Fecha del incidente', question: '¿Cuándo ocurrió? (fecha aproximada)' },
      { key: 'descripcion', label: 'Descripción', question: 'Por favor describe con detalle qué pasó.' },
      { key: 'monto_afectado', label: 'Monto afectado', question: '¿Hay un monto económico afectado? Si es así, ¿cuánto?' },
    ],
    documents_required: [],
    sla_hours: 360,
    confirmation_message: 'Tu reclamación fue radicada con número de referencia. El banco tiene hasta 15 días hábiles para responderte. Te notificaremos por este canal.',
  },

  paz_y_salvo: {
    label: 'Certificado de paz y salvo',
    description: 'Solicitar certificado de paz y salvo de productos',
    required_fields: [
      { key: 'producto', label: 'Producto', question: '¿Para qué producto necesitas el paz y salvo? (crédito, tarjeta, cuenta)' },
      { key: 'destino_certificado', label: 'Destino del certificado', question: '¿Para qué lo necesitas? (traspaso de vehículo, notaría, visa, libre destinación)' },
    ],
    documents_required: [],
    sla_hours: 72,
    confirmation_message: 'Tu solicitud de paz y salvo fue radicada. Lo recibirás por email en máximo 3 días hábiles.',
  },
} as const

export type TramiteType = keyof typeof TRAMITE_TEMPLATES

export interface TramiteTemplate {
  label: string
  description: string
  required_fields: ReadonlyArray<{ key: string; label: string; question: string }>
  documents_required: ReadonlyArray<{ name: string; description: string }>
  sla_hours: number
  confirmation_message: string
}

export function getTramiteTemplate(type: string): TramiteTemplate | null {
  return (TRAMITE_TEMPLATES as Record<string, TramiteTemplate>)[type] ?? null
}

// Frases típicas del cliente → tipo de trámite (para clasificación rápida)
export const TRAMITE_INTENT_MAPPING: Record<string, TramiteType> = {
  'abrir cuenta':            'apertura_cuenta',
  'nueva cuenta':            'apertura_cuenta',
  'solicitar credito':       'solicitud_credito',
  'prestamo personal':       'solicitud_credito',
  'solicitar tarjeta':       'tarjeta_credito',
  'nueva tarjeta':           'tarjeta_credito',
  'actualizar datos':        'actualizacion_datos',
  'cambiar direccion':       'actualizacion_datos',
  'abrir cdt':               'cdt',
  'invertir cdt':            'cdt',
  'radicar queja':           'reclamacion',
  'reclamacion':             'reclamacion',
  'paz y salvo':             'paz_y_salvo',
  'certificado paz':         'paz_y_salvo',
}
