import { createHmac, timingSafeEqual } from 'crypto'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { handleWhatsAppMessage } from '../handlers/message-handler'

// ── Twilio signature validation ───────────────────────────────
// Ref: https://www.twilio.com/docs/usage/security#validating-signatures-from-twilio
// Twilio computa HMAC-SHA1 sobre: URL completa + parámetros POST ordenados alfabéticamente.

function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  const sortedParams = Object.keys(params).sort()
    .map(k => k + params[k])
    .join('')
  const expected = createHmac('sha1', authToken)
    .update(url + sortedParams)
    .digest('base64')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// ── TwiML helpers ─────────────────────────────────────────────

function twimlMessage(body: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`
}

const TWIML_EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response/>'

// ── Payload de Twilio WhatsApp (form-urlencoded) ──────────────

interface TwilioWhatsAppPayload {
  From?: string     // "whatsapp:+573001234567"
  Body?: string
  To?: string
  MessageSid?: string
  AccountSid?: string
  [key: string]: string | undefined
}

export async function whatsappRoutes(fastify: FastifyInstance) {
  // Registrar parser de form-urlencoded
  await fastify.register(import('@fastify/formbody'))

  fastify.post<{ Body: TwilioWhatsAppPayload }>(
    '/whatsapp',
    async (request: FastifyRequest<{ Body: TwilioWhatsAppPayload }>, reply) => {
      // SIEMPRE devolver 200 a Twilio — errores internos se loggean, no se propagan
      try {
        const authToken = process.env.TWILIO_AUTH_TOKEN

        // ── Validar firma Twilio ───────────────────────────
        if (authToken) {
          const signature = (request.headers['x-twilio-signature'] as string) ?? ''
          const url = `${request.protocol}://${request.hostname}${request.url}`
          const params = request.body as Record<string, string>

          if (!validateTwilioSignature(authToken, signature, url, params)) {
            reply.code(401).send('Unauthorized')
            return
          }
        }

        // ── Extraer campos del payload ─────────────────────
        const from = request.body.From ?? ''
        const messageText = request.body.Body ?? ''
        const tenantSlug = (request.headers['x-tenant-slug'] as string) || (process.env.DEV_TENANT_SLUG ?? 'moda-xyz')

        // Limpiar prefijo "whatsapp:" del número remitente
        const senderId = from.replace(/^whatsapp:/i, '')

        if (!senderId || !messageText || !tenantSlug) {
          fastify.log.warn({ from, tenantSlug }, 'Missing required fields in Twilio payload')
          return reply.type('text/xml').send(TWIML_EMPTY)
        }

        // Solo procesar mensajes de texto
        if (!request.body.Body) {
          return reply.type('text/xml').send(TWIML_EMPTY)
        }

        // ── Orquestar el flujo completo ────────────────────
        const responseText = await handleWhatsAppMessage(senderId, messageText, tenantSlug)

        const twiml = responseText ? twimlMessage(responseText) : TWIML_EMPTY
        return reply.type('text/xml').send(twiml)

      } catch (err) {
        fastify.log.error(err, 'Error processing WhatsApp webhook')
        return reply.type('text/xml').send(TWIML_EMPTY)
      }
    },
  )
}
