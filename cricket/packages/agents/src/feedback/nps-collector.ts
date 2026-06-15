// SQL para crear la tabla nps_responses:
// Ver supabase/migrations/20240102000000_nps_responses.sql
//
// CREATE TABLE IF NOT EXISTS nps_responses (
//   id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
//   session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
//   end_user_id     UUID NOT NULL REFERENCES end_users(id) ON DELETE CASCADE,
//   nps_score       SMALLINT NOT NULL CHECK (nps_score >= 0 AND nps_score <= 10),
//   csat_score      SMALLINT CHECK (csat_score >= 1 AND csat_score <= 5),
//   nps_category    TEXT GENERATED ALWAYS AS (
//     CASE
//       WHEN nps_score >= 9 THEN 'promoter'
//       WHEN nps_score >= 7 THEN 'passive'
//       ELSE 'detractor'
//     END
//   ) STORED,
//   verbatim        TEXT,
//   channel         TEXT,
//   stage_reached   TEXT,
//   metadata        JSONB NOT NULL DEFAULT '{}',
//   created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//   UNIQUE(session_id)
// );

import { createClient } from '@supabase/supabase-js'

export interface NpsCollectorParams {
  tenantId: string
  sessionId: string
  endUserId: string
  npsScore: number
  csatScore: number | null
  verbatim: string | null
  channel: string
  stageReached: string
  supabaseUrl: string
  supabaseKey: string
}

function npsCategory(score: number): string {
  if (score >= 9) return 'promoter'
  if (score >= 7) return 'passive'
  return 'detractor'
}

export async function npsCollector(params: NpsCollectorParams): Promise<string> {
  const {
    tenantId, sessionId, endUserId,
    npsScore, csatScore, verbatim,
    channel, stageReached,
    supabaseUrl, supabaseKey,
  } = params

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Idempotencia: verificar si ya existe NPS para esta sesión
  const { data: existing } = await supabase
    .from('nps_responses')
    .select('id, nps_score')
    .eq('session_id', sessionId)
    .single()

  if (existing) {
    return JSON.stringify({
      success: true,
      already_recorded: true,
      nps_score: existing.nps_score,
      message: 'El NPS de esta sesión ya fue registrado previamente.',
    })
  }

  // Insertar NPS
  const { error: insertError } = await supabase
    .from('nps_responses')
    .insert({
      tenant_id: tenantId,
      session_id: sessionId,
      end_user_id: endUserId,
      nps_score: npsScore,
      csat_score: csatScore,
      verbatim: verbatim,
      channel: channel,
      stage_reached: stageReached,
      metadata: { collected_by: 'feedback_agent' },
    })

  if (insertError) {
    return JSON.stringify({ success: false, error: insertError.message })
  }

  // Cerrar sesión (solo si no está ya completada)
  await supabase
    .from('sessions')
    .update({
      status: 'completed',
      actor_control: 'AI',
      closed_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .neq('status', 'completed')

  // Registrar en audit_log
  await supabase.from('audit_log').insert({
    tenant_id: tenantId,
    session_id: sessionId,
    actor_type: 'SYSTEM',
    event_type: 'journey.completed',
    payload: {
      nps_score: npsScore,
      nps_category: npsCategory(npsScore),
      csat_score: csatScore,
      stage_reached: stageReached,
    },
  })

  return JSON.stringify({
    success: true,
    already_recorded: false,
    nps_score: npsScore,
    nps_category: npsCategory(npsScore),
    session_closed: true,
  })
}

export const NPS_COLLECTOR_TOOL = {
  name: 'nps_collector',
  description:
    'Persiste el NPS y CSAT del cliente y cierra la sesión. Llamar SOLO cuando tengas el nps_score confirmado. Si el cliente no dio CSAT, pasar null. Esta tool cierra la sesión de forma permanente — llamarla una sola vez.',
  input_schema: {
    type: 'object' as const,
    properties: {
      nps_score: {
        type: 'number',
        description: 'Score NPS 0-10, requerido',
      },
      csat_score: {
        type: 'number',
        description: 'Score CSAT 1-5, null si el cliente no lo dio',
      },
      verbatim: {
        type: 'string',
        description: 'Comentario libre del cliente, null si no dio',
      },
      stage_reached: {
        type: 'string',
        description: 'Última etapa activa del journey',
      },
    },
    required: ['nps_score'],
  },
}
