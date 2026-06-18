import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { JourneyEngine } from '@cricket/core/journey-engine'
import { AgentRegistry } from '@cricket/agents/registry'
import type { ChannelMessage, IHPolicy } from '@cricket/core/types'

// ── Twilio signature validation ───────────────────────────────

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

function xmlResponse(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: { 'Content-Type': 'text/xml' },
  })
}

interface ClaudeConfig { model: string; max_tokens: number }

// ── Handler principal ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  const log = (...args: unknown[]) => console.log('[webhook/whatsapp]', ...args)

  try {
    const formData = await req.formData()
    const params: Record<string, string> = {}
    formData.forEach((value, key) => { params[key] = String(value) })

    log('params recibidos:', JSON.stringify({ From: params['From'], Body: params['Body'] }))

    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (authToken) {
      const signature = req.headers.get('x-twilio-signature') ?? ''
      const url = req.url

      if (!validateTwilioSignature(authToken, signature, url, params)) {
        log('ERROR: firma Twilio inválida')
        return new NextResponse('Unauthorized', { status: 401 })
      }
    } else {
      log('WARN: TWILIO_AUTH_TOKEN no configurado, saltando validación de firma')
    }

    const from        = params['From'] ?? ''
    const messageText = params['Body'] ?? ''

    const tenantSlug =
      req.headers.get('x-tenant-slug') ||
      process.env.DEV_TENANT_SLUG ||
      'moda-xyz'

    log(`tenantSlug=${tenantSlug} from=${from} message="${messageText}"`)

    const senderId = from.replace(/^whatsapp:/i, '')

    if (!senderId || !messageText) {
      log('ERROR: senderId o messageText vacíos')
      return xmlResponse(TWIML_EMPTY)
    }

    // ── 1. Tenant ─────────────────────────────────────────────
    const db = getSupabaseAdmin()
    const { data: tenant, error: tenantErr } = await db
      .from('tenants')
      .select('id, slug, ih_policies, claude_config, is_active')
      .eq('slug', tenantSlug)
      .eq('is_active', true)
      .single()

    if (!tenant) {
      log(`ERROR: tenant no encontrado slug=${tenantSlug}`, tenantErr)
      return xmlResponse(TWIML_EMPTY)
    }
    log(`tenant encontrado id=${tenant.id}`)

    const ihPolicies  = tenant.ih_policies as unknown as IHPolicy
    const claudeConfig = tenant.claude_config as unknown as ClaudeConfig

    // ── 2. End user ───────────────────────────────────────────
    let { data: endUser, error: endUserErr } = await db
      .from('end_users')
      .select('id')
      .eq('tenant_id', tenant.id)
      .filter('channel_ids->>whatsapp', 'eq', senderId)
      .maybeSingle()

    if (!endUser) {
      log('end_user no existe, creando...', endUserErr?.message)
      const { data: created, error: createErr } = await db
        .from('end_users')
        .insert({ tenant_id: tenant.id, channel_ids: { whatsapp: senderId }, consent_given: false })
        .select('id')
        .single()
      if (createErr) log('ERROR creando end_user:', createErr.message)
      endUser = created
    }

    if (!endUser) {
      log('ERROR: no se pudo obtener/crear end_user')
      return xmlResponse(TWIML_EMPTY)
    }
    log(`end_user id=${endUser.id}`)

    // ── 3. Sesión activa ──────────────────────────────────────
    let { data: session, error: sessionErr } = await db
      .from('sessions')
      .select('id, tenant_id, end_user_id, current_stage, actor_control, assigned_operator, template_id')
      .eq('end_user_id', endUser.id)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!session) {
      log('sesión no existe, creando...', sessionErr?.message)
      const { data: created, error: createErr } = await db
        .from('sessions')
        .insert({
          tenant_id: tenant.id,
          end_user_id: endUser.id,
          channel: 'whatsapp',
          status: 'active',
          actor_control: 'AI',
        })
        .select('id, tenant_id, end_user_id, current_stage, actor_control, assigned_operator, template_id')
        .single()
      if (createErr) log('ERROR creando sesión:', createErr.message)
      session = created
    }

    if (!session) {
      log('ERROR: no se pudo obtener/crear sesión')
      return xmlResponse(TWIML_EMPTY)
    }
    log(`sesión id=${session.id} stage=${session.current_stage} control=${session.actor_control}`)

    // ── 4. Journey Engine ─────────────────────────────────────
    const channelMessage: ChannelMessage = {
      channelType: 'whatsapp',
      senderId,
      content: messageText,
      timestamp: new Date().toISOString(),
      raw: {},
    }

    const anthropic   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const agentRunner = new AgentRegistry(anthropic, claudeConfig)
    const engine      = new JourneyEngine(db, anthropic, agentRunner)

    log('ejecutando JourneyEngine...')
    const result = await engine.process(channelMessage, session, {
      id: tenant.id,
      ih_policies: ihPolicies,
      claude_config: claudeConfig,
    })

    log(`engine result type=${result.type} content="${result.content?.slice(0, 80)}"`)

    const responseText = result.type === 'ai_response' ? (result.content ?? null) : null
    if (!responseText) log(`WARN: sin respuesta para el usuario (type=${result.type})`)
    return xmlResponse(responseText ? twimlMessage(responseText) : TWIML_EMPTY)

  } catch (err) {
    console.error('[webhook/whatsapp] ERROR:', err)
    return xmlResponse(TWIML_EMPTY)
  }
}

// Twilio verifica el webhook con GET al configurarlo
export async function GET() {
  return new NextResponse('Cricket WhatsApp Webhook OK', { status: 200 })
}
