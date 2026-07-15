-- ============================================================
-- Cricket — Módulo de trámites bancarios
-- Trámite = proceso formal multi-etapa con SLA. La IA recopila
-- y radica; un especialista humano gestiona y resuelve (IA+IH).
-- ============================================================

-- Agregar 'tramites' al enum module_type (idempotente).
-- NOTA: el valor nuevo NO puede usarse en esta misma transacción
-- (restricción de PostgreSQL) — el INSERT en tenant_modules vive
-- en supabase/seed/banking-demo.sql.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'tramites'
    AND enumtypid = 'module_type'::regtype) THEN
    ALTER TYPE module_type ADD VALUE 'tramites';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tramite_status') THEN
    CREATE TYPE tramite_status AS ENUM (
      'draft',           -- en proceso de recopilación de datos por el agente
      'submitted',       -- cliente completó todos los campos requeridos
      'in_review',       -- operador/especialista lo tomó
      'pending_docs',    -- esperando documentos del cliente
      'approved',        -- aprobado
      'rejected',        -- rechazado
      'cancelled',       -- cancelado por cliente o banco
      'completed'        -- resuelto y notificado
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tramites (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id         UUID REFERENCES sessions(id) ON DELETE SET NULL,
  end_user_id        UUID NOT NULL REFERENCES end_users(id) ON DELETE CASCADE,
  tramite_type       TEXT NOT NULL,
  status             tramite_status NOT NULL DEFAULT 'draft',
  label              TEXT NOT NULL,

  -- Datos recopilados conversacionalmente por el agente
  collected_data     JSONB NOT NULL DEFAULT '{}',

  -- Campos que aún faltan para poder radicar (del template)
  pending_fields     JSONB NOT NULL DEFAULT '[]',

  -- Documentos requeridos: [{name, description, provided: bool}]
  documents_required JSONB NOT NULL DEFAULT '[]',

  -- Gestión interna
  assigned_to        UUID REFERENCES tenant_users(id) ON DELETE SET NULL,
  internal_notes     TEXT,
  customer_message   TEXT,    -- mensaje final al cliente al resolver
  resolution         TEXT,    -- 'approved' | 'rejected' | 'more_info_needed'

  -- SLA
  sla_hours          INTEGER NOT NULL DEFAULT 24,
  sla_deadline       TIMESTAMPTZ,   -- calculado: submitted_at + sla_hours

  -- Timestamps de estado
  submitted_at       TIMESTAMPTZ,
  assigned_at        TIMESTAMPTZ,
  resolved_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tramites IS 'Trámites bancarios formales. La IA los radica (status draft/submitted); un humano SIEMPRE los gestiona hasta resolverlos.';

CREATE INDEX IF NOT EXISTS idx_tramites_tenant_status
  ON tramites(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tramites_assigned
  ON tramites(assigned_to) WHERE status IN ('submitted', 'in_review', 'pending_docs');
CREATE INDEX IF NOT EXISTS idx_tramites_sla
  ON tramites(sla_deadline) WHERE status NOT IN ('completed', 'cancelled', 'rejected');
CREATE INDEX IF NOT EXISTS idx_tramites_end_user
  ON tramites(end_user_id, created_at DESC);

ALTER TABLE tramites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant users ven sus tramites" ON tramites;
CREATE POLICY "tenant users ven sus tramites"
  ON tramites FOR SELECT
  USING (tenant_id = auth_tenant_id() OR is_superadmin());

DROP POLICY IF EXISTS "operadores gestionan tramites de su tenant" ON tramites;
CREATE POLICY "operadores gestionan tramites de su tenant"
  ON tramites FOR UPDATE
  USING (tenant_id = auth_tenant_id() AND
         auth_user_role() IN ('tenant_admin', 'supervisor', 'operator'))
  WITH CHECK (tenant_id = auth_tenant_id());

DROP POLICY IF EXISTS "service role crea tramites" ON tramites;
CREATE POLICY "service role crea tramites"
  ON tramites FOR INSERT
  WITH CHECK (true);

DROP TRIGGER IF EXISTS tramites_updated_at ON tramites;
CREATE TRIGGER tramites_updated_at
  BEFORE UPDATE ON tramites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tramites'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tramites;
  END IF;
END $$;
