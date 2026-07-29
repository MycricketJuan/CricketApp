// Envío de mensajes salientes de WhatsApp vía la API REST de Twilio.
// Distinto del flujo del webhook (apps/dashboard/.../webhook/whatsapp/route.ts),
// que solo responde con TwiML dentro del mismo request. Esto se usa cuando
// hay que notificar al cliente fuera del ciclo pregunta-respuesta (ej. un
// operador avanza el trámite y hay que avisarle que suba el pago).

export interface SendWhatsAppParams {
  to: string
  body: string
}

export async function sendWhatsAppMessage({ to, body }: SendWhatsAppParams): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_NUMBER

  if (!accountSid || !authToken || !from) {
    console.warn('[twilio/send] Credenciales de Twilio no configuradas, mensaje no enviado', { to })
    return
  }

  const normalizedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  const normalizedFrom = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`

  const params = new URLSearchParams({ To: normalizedTo, From: normalizedFrom, Body: body })

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    },
  )

  if (!response.ok) {
    const text = await response.text()
    console.error('[twilio/send] error enviando mensaje:', response.status, text)
  }
}
