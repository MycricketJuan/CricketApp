import Anthropic from '@anthropic-ai/sdk'

export interface VehicleDocumentData {
  placa: string | null
  propietario: string | null
  cedula_propietario: string | null
  entidad_prendaria: string | null
}

// Descarga el adjunto (Twilio requiere Basic Auth con las credenciales
// de la cuenta) y lo envía a Claude como imagen para extraer los datos
// de la tarjeta de propiedad. No se re-hospeda el archivo — se lee al
// vuelo, igual que Twilio lo sirve.
export async function extractVehicleDocument(
  attachmentUrl: string,
  client: Anthropic,
): Promise<VehicleDocumentData> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  const headers: Record<string, string> = {}
  if (accountSid && authToken) {
    headers.Authorization = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
  }

  const mediaResponse = await fetch(attachmentUrl, { headers })
  if (!mediaResponse.ok) {
    throw new Error(`No se pudo descargar el adjunto: ${mediaResponse.status}`)
  }

  const contentType = mediaResponse.headers.get('content-type') ?? 'image/jpeg'
  const buffer = Buffer.from(await mediaResponse.arrayBuffer())
  const base64 = buffer.toString('base64')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: contentType as 'image/jpeg', data: base64 },
          },
          {
            type: 'text',
            text: 'Esta es la tarjeta de propiedad de un vehículo. Extrae en JSON exacto (sin texto adicional): {"placa": "...", "propietario": "...", "cedula_propietario": "...", "entidad_prendaria": "..."}. Usa null en los campos que no puedas leer con certeza.',
          },
        ],
      },
    ],
  })

  const raw = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')

  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) {
    return { placa: null, propietario: null, cedula_propietario: null, entidad_prendaria: null }
  }

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<VehicleDocumentData>
    return {
      placa: parsed.placa ?? null,
      propietario: parsed.propietario ?? null,
      cedula_propietario: parsed.cedula_propietario ?? null,
      entidad_prendaria: parsed.entidad_prendaria ?? null,
    }
  } catch {
    return { placa: null, propietario: null, cedula_propietario: null, entidad_prendaria: null }
  }
}

export const EXTRACT_DOCUMENT_TOOL = {
  name: 'extract_document_data',
  description:
    'Lee y extrae los datos de la tarjeta de propiedad que el cliente adjuntó (placa, propietario, cédula, entidad prendaria). Llamar solo cuando el cliente haya adjuntado una imagen del documento.',
  input_schema: {
    type: 'object' as const,
    properties: {},
  },
}
