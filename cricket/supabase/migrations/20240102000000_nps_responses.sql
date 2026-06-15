-- ============================================================
-- Cricket — Migración: tabla nps_responses
-- Orden: ejecutar después de cricket_001_initial_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS nps_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  end_user_id     UUID NOT NULL REFERENCES end_users(id) ON DELETE CASCADE,
  nps_score       SMALLINT NOT NULL CHECK (nps_score >= 0 AND nps_score <= 10),
  csat_score      SMALLINT CHECK (csat_score >= 1 AND csat_score <= 5),
  nps_category    TEXT GENERATED ALWAYS AS (
    CASE
      WHEN nps_score >= 9 THEN 'promoter'
      WHEN nps_score >= 7 THEN 'passive'
      ELSE 'detractor'
    END
  ) STORED,
  verbatim        TEXT,
  channel         TEXT,
  stage_reached   TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id)
);

COMMENT ON COLUMN nps_responses.nps_category IS
  'Calculado automáticamente: promoter(9-10), passive(7-8), detractor(0-6)';

COMMENT ON COLUMN nps_responses.verbatim IS
  'Comentario libre del cliente si lo dio. Null si solo dio score numérico.';

CREATE INDEX IF NOT EXISTS idx_nps_tenant_date
  ON nps_responses(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nps_category
  ON nps_responses(tenant_id, nps_category);

ALTER TABLE nps_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant users ven sus NPS"
  ON nps_responses FOR SELECT
  USING (tenant_id = auth_tenant_id() OR is_superadmin());

CREATE POLICY "service role inserta NPS"
  ON nps_responses FOR INSERT
  WITH CHECK (true);
