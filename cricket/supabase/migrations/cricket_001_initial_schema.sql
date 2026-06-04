-- ============================================================
-- CRICKET AI PLATFORM — Supabase Migration 001
-- Initial schema: multi-tenant SaaS con principio IA + IH
-- ============================================================
-- Ejecutar en: Supabase SQL Editor → Run
-- Orden: este archivo es autocontenido y se ejecuta de una vez
-- ============================================================


-- ============================================================
-- 0. EXTENSIONES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_bytes para tokens
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- búsqueda full-text sobre jsonb/text


-- ============================================================
-- 1. ENUMERACIONES
-- ============================================================

CREATE TYPE sector_type AS ENUM (
  'banking',
  'retail',
  'health',
  'telecom',
  'government'
);

CREATE TYPE module_type AS ENUM (
  'consultation',
  'sales',
  'transactions',
  'feedback'
);

CREATE TYPE channel_type AS ENUM (
  'whatsapp',
  'web_chat',
  'email'
);

CREATE TYPE actor_type AS ENUM (
  'AI',        -- Claude actuó
  'HUMAN',     -- Operador actuó
  'SYSTEM'     -- Automatización (stage transitions, notificaciones)
);

CREATE TYPE actor_control AS ENUM (
  'AI',        -- Modo autónomo
  'HUMAN',     -- Takeover manual
  'MIXED'      -- Supervisión activa
);

CREATE TYPE session_status AS ENUM (
  'active',
  'escalated',
  'human_takeover',
  'completed',
  'abandoned'
);

CREATE TYPE checkpoint_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'overridden',
  'expired'
);

CREATE TYPE escalation_outcome AS ENUM (
  'resolved_by_human',
  'returned_to_ai',
  'closed',
  'transferred'
);

CREATE TYPE user_role AS ENUM (
  'superadmin',     -- Cricket internal team (acceso total)
  'tenant_admin',   -- Admin del cliente (config completa de su tenant)
  'supervisor',     -- Líder de equipo (cola + analytics + intervención)
  'operator'        -- Agente IH (cola asignada + handoffs)
);

CREATE TYPE fallback_type AS ENUM (
  'ih_handoff',    -- Escalar a operador humano
  'redirect_url',  -- Redirigir a URL externa
  'skip'           -- Omitir etapa y continuar
);

CREATE TYPE invitation_status AS ENUM (
  'pending',
  'accepted',
  'expired',
  'revoked'
);


-- ============================================================
-- 2. FUNCIÓN UTILITARIA: updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 3. TABLAS — CAPA MULTI-TENANCY
-- ============================================================

-- 3.1 SUPERADMINS (equipo Cricket — acceso total a la plataforma)
CREATE TABLE superadmins (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE superadmins IS 'Equipo interno Cricket. Acceso total, no están ligados a ningún tenant.';


-- 3.2 TENANTS (clientes de Cricket: bancos, retailers, etc.)
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,     -- banco-xyz → banco-xyz.mycricket.ai
  sector        sector_type NOT NULL,
  -- Configuración del modelo LLM (editable por superadmin)
  claude_config JSONB NOT NULL DEFAULT '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1000,
    "temperature": 0.7
  }'::jsonb,
  -- Políticas de soberanía humana (IH) configurables por tenant
  ih_policies   JSONB NOT NULL DEFAULT '{
    "require_2fa_for_operators": false,
    "auto_escalate_below_confidence": 0.6,
    "max_session_duration_hours": 24,
    "human_approval_required_for_payments": true
  }'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE tenants IS 'Clientes de Cricket. Cada tenant tiene su propio subdominio y configuración.';
COMMENT ON COLUMN tenants.slug IS 'Identificador URL-safe. Ej: banco-xyz genera banco-xyz.mycricket.ai';
COMMENT ON COLUMN tenants.ih_policies IS 'Políticas del principio IA+IH: umbrales de confianza, aprobaciones requeridas, etc.';

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- 3.3 TENANT_USERS (operadores humanos del tenant, ligados a Supabase Auth)
CREATE TABLE tenant_users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role         user_role NOT NULL DEFAULT 'operator',
  full_name    TEXT,
  permissions  JSONB NOT NULL DEFAULT '[]'::jsonb,  -- permisos granulares adicionales
  is_active    BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE tenant_users IS 'Operadores, supervisores y admins del tenant. Rol determina acceso en dashboard y RLS.';


-- 3.4 TENANT_INVITATIONS (invitaciones por email para onboarding de operadores)
CREATE TABLE tenant_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         user_role NOT NULL DEFAULT 'operator',
  -- Token seguro de 32 bytes (hex = 64 chars) — se envía en el email
  token        TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status       invitation_status NOT NULL DEFAULT 'pending',
  invited_by   UUID REFERENCES tenant_users(id) ON DELETE SET NULL,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un email no puede tener dos invitaciones pendientes al mismo tenant
  UNIQUE(tenant_id, email)
);
COMMENT ON TABLE tenant_invitations IS 'Invitaciones para agregar operadores a un tenant sin que pasen por Cricket directamente.';


-- 3.5 TENANT_MODULES (qué módulos contrató cada cliente y su comportamiento)
CREATE TABLE tenant_modules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_type      module_type NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  -- Qué hace el Journey Engine cuando este módulo no está activo
  fallback_type    fallback_type NOT NULL DEFAULT 'ih_handoff',
  fallback_config  JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {url, message, operator_pool_id}
  config           JSONB NOT NULL DEFAULT '{}'::jsonb,  -- config específica del agente
  activated_at     TIMESTAMPTZ DEFAULT NOW(),
  deactivated_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, module_type)
);
COMMENT ON TABLE tenant_modules IS 'Suscripción por módulo. El Journey Engine consulta esta tabla para saber qué agente activar o qué fallback aplicar.';


-- ============================================================
-- 4. TABLAS — CUSTOMER JOURNEY
-- ============================================================

-- 4.1 END_USERS (clientes finales del tenant — no tienen login en Cricket)
CREATE TABLE end_users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  external_id    TEXT,        -- ID del CRM del tenant (opcional)
  -- Identificadores por canal: {"whatsapp": "+573001234567", "email": "...", "web": "session_abc"}
  channel_ids    JSONB NOT NULL DEFAULT '{}'::jsonb,
  profile        JSONB NOT NULL DEFAULT '{}'::jsonb,  -- datos del CRM (nombre, segmento, etc.)
  consent_given  BOOLEAN NOT NULL DEFAULT false,
  last_seen_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, external_id)
);
COMMENT ON TABLE end_users IS 'Clientes finales de los tenants. Se identifican por canal (WhatsApp number, email, session ID). No tienen login.';
COMMENT ON COLUMN end_users.channel_ids IS 'Mapa de identificadores por canal. Ej: {"whatsapp": "+573001234567"}';


-- 4.2 JOURNEY_TEMPLATES (blueprints del journey, configurables por tenant)
CREATE TABLE journey_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sector          sector_type NOT NULL,
  name            TEXT NOT NULL,
  -- Array de etapas: [{order, stage_type, is_active, agent, fallback, ih_checkpoint}]
  stages_config   JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Checkpoints IH obligatorios por etapa o por tipo de operación
  ih_checkpoints  JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  version         INTEGER NOT NULL DEFAULT 1,
  created_by      UUID REFERENCES tenant_users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE journey_templates IS 'Blueprints de customer journey por sector. El Journey Engine instancia estos templates en cada sesión.';
COMMENT ON COLUMN journey_templates.stages_config IS 'Configuración de etapas: [{order:1, stage_type:"consultation", is_active:true, agent:"consultation_agent", fallback:null}]';
COMMENT ON COLUMN journey_templates.ih_checkpoints IS 'Reglas de checkpoint IH obligatorio. Ej: [{trigger:"payment_above_5000", action:"require_supervisor_approval"}]';

CREATE TRIGGER journey_templates_updated_at
  BEFORE UPDATE ON journey_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- 4.3 SESSIONS (instancia activa del journey para un end_user)
CREATE TABLE sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  end_user_id       UUID NOT NULL REFERENCES end_users(id) ON DELETE CASCADE,
  template_id       UUID REFERENCES journey_templates(id) ON DELETE SET NULL,
  current_stage     module_type,
  channel           channel_type NOT NULL,
  status            session_status NOT NULL DEFAULT 'active',
  -- Quién tiene el control del diálogo en este momento
  actor_control     actor_control NOT NULL DEFAULT 'AI',
  -- Operador IH asignado (cuando status = escalated | human_takeover)
  assigned_operator UUID REFERENCES tenant_users(id) ON DELETE SET NULL,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at         TIMESTAMPTZ,
  CONSTRAINT valid_session_dates CHECK (
    closed_at IS NULL OR closed_at >= started_at
  )
);
COMMENT ON TABLE sessions IS 'Instancia activa del customer journey. actor_control refleja el principio IA+IH: quién tiene el control en tiempo real.';
COMMENT ON COLUMN sessions.actor_control IS 'AI = modo autónomo. HUMAN = takeover manual. MIXED = supervisión activa con IA asistiendo.';


-- ============================================================
-- 5. TABLAS — CAPA IA (Claude)
-- ============================================================

-- 5.1 INTERACTIONS (cada mensaje o acción en la sesión)
CREATE TABLE interactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_type  actor_type NOT NULL,
  actor_id    UUID,            -- tenant_user.id si HUMAN, null si AI/SYSTEM
  content     TEXT NOT NULL,
  stage       module_type,
  channel     channel_type,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE interactions IS 'Cada touchpoint del journey: mensajes del cliente, respuestas del AI, acciones del operador. actor_type es el campo central del principio IA+IH.';
COMMENT ON COLUMN interactions.actor_type IS 'AI|HUMAN|SYSTEM. Nunca hay una interacción sin atribución — principio de auditoría completa.';


-- 5.2 AI_DECISIONS (decisiones de Claude: razonamiento, confianza, acción)
CREATE TABLE ai_decisions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id      UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_type          TEXT NOT NULL,  -- 'consultation_agent', 'sales_agent', etc.
  model               TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  -- Score 0.000 a 1.000. Si cae bajo ih_policies.auto_escalate_below_confidence → checkpoint
  confidence          NUMERIC(4,3) CHECK (confidence >= 0 AND confidence <= 1),
  reasoning           TEXT,           -- cadena de pensamiento del agente
  action_taken        TEXT,           -- tool o acción ejecutada
  tools_used          JSONB DEFAULT '[]'::jsonb,
  prompt_tokens       INTEGER,
  completion_tokens   INTEGER,
  latency_ms          INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE ai_decisions IS 'Capa IA: registra el razonamiento, confianza y acciones de cada agente Claude. Base para auditoría y mejora continua.';
COMMENT ON COLUMN ai_decisions.confidence IS 'Score de confianza 0-1. Bajo el umbral del tenant dispara COGNITIVE_CHECKPOINT automáticamente.';
COMMENT ON COLUMN ai_decisions.reasoning IS 'Chain-of-thought del agente. Permite al operador IH entender por qué la IA tomó esa decisión.';


-- ============================================================
-- 6. TABLAS — CAPA IH (Soberanía Humana)
-- ============================================================

-- 6.1 COGNITIVE_CHECKPOINTS (momentos obligatorios de decisión humana)
CREATE TABLE cognitive_checkpoints (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_to           UUID REFERENCES tenant_users(id) ON DELETE SET NULL,
  -- Razón del checkpoint: LOW_CONFIDENCE | POLICY | CUSTOMER_REQUEST | COMPLIANCE
  trigger_reason        TEXT NOT NULL,
  status                checkpoint_status NOT NULL DEFAULT 'pending',
  -- Qué recomendó la IA antes de pausar
  ai_recommendation     TEXT,
  confidence_at_trigger NUMERIC(4,3),
  -- Qué decidió el humano
  ih_decision           TEXT,
  -- Por qué el humano decidió diferente a la IA (alimenta reentrenamiento)
  ih_override_reason    TEXT,
  resolved_at           TIMESTAMPTZ,
  -- Expiración: si no se resuelve, escala al supervisor
  expires_at            TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE cognitive_checkpoints IS 'Puente IA+IH: momentos donde el humano DEBE decidir. La IA pausa y espera. ih_override_reason alimenta el ciclo de mejora.';
COMMENT ON COLUMN cognitive_checkpoints.trigger_reason IS 'low_confidence | policy | customer_request | compliance';
COMMENT ON COLUMN cognitive_checkpoints.ih_override_reason IS 'Si el humano decidió diferente a la IA, aquí explica por qué. Dato de entrenamiento valioso.';


-- 6.2 ESCALATIONS (handoffs completos AI → Humano)
CREATE TABLE escalations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_to           UUID REFERENCES tenant_users(id) ON DELETE SET NULL,
  trigger_reason        TEXT NOT NULL,
  confidence_at_trigger NUMERIC(4,3),
  -- Estado emocional detectado: positive | neutral | negative | frustrated
  customer_sentiment    TEXT,
  -- Resumen generado por session_summarizer skill (para el operador)
  context_summary       TEXT,
  outcome               escalation_outcome,
  resolved_by           UUID REFERENCES tenant_users(id) ON DELETE SET NULL,
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE escalations IS 'Handoff completo AI→Humano. context_summary es el briefing que genera Cricket para que el operador entienda la situación en segundos.';
COMMENT ON COLUMN escalations.context_summary IS 'Generado por el skill session_summarizer. El operador no necesita leer la conversación completa.';


-- ============================================================
-- 7. TABLA — AUDIT LOG (inmutable, append-only)
-- ============================================================

CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE SET NULL,
  session_id  UUID REFERENCES sessions(id) ON DELETE SET NULL,
  actor_type  actor_type NOT NULL,
  actor_id    UUID,
  event_type  TEXT NOT NULL,   -- 'session.created', 'control.transferred', 'checkpoint.resolved', etc.
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE audit_log IS 'Registro inmutable de eventos. Requerido para cumplimiento regulatorio en banca. NUNCA se actualiza ni elimina.';


-- ============================================================
-- 8. TRIGGERS DE AUDITORÍA AUTOMÁTICA
-- ============================================================

-- Audita cambios críticos en sesiones (control, status)
CREATE OR REPLACE FUNCTION audit_session_changes()
RETURNS TRIGGER AS $$
DECLARE
  evt TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    evt := 'session.created';
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    evt := 'session.status_changed';
  ELSIF OLD.actor_control IS DISTINCT FROM NEW.actor_control THEN
    evt := 'session.control_transferred';
  ELSE
    evt := 'session.updated';
  END IF;

  INSERT INTO audit_log (tenant_id, session_id, actor_type, event_type, payload)
  VALUES (
    NEW.tenant_id,
    NEW.id,
    'SYSTEM',
    evt,
    jsonb_build_object(
      'old_status',        OLD.status,
      'new_status',        NEW.status,
      'old_actor_control', OLD.actor_control,
      'new_actor_control', NEW.actor_control,
      'assigned_operator', NEW.assigned_operator
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sessions_audit
  AFTER INSERT OR UPDATE OF status, actor_control, assigned_operator ON sessions
  FOR EACH ROW EXECUTE FUNCTION audit_session_changes();


-- Audita resolución de cognitive_checkpoints
CREATE OR REPLACE FUNCTION audit_checkpoint_resolution()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status <> 'pending' THEN
    INSERT INTO audit_log (tenant_id, session_id, actor_type, actor_id, event_type, payload)
    VALUES (
      NEW.tenant_id,
      NEW.session_id,
      'HUMAN',
      NEW.assigned_to,
      'checkpoint.resolved',
      jsonb_build_object(
        'checkpoint_id',     NEW.id,
        'status',            NEW.status,
        'ih_decision',       NEW.ih_decision,
        'override_reason',   NEW.ih_override_reason,
        'trigger_reason',    NEW.trigger_reason,
        'ai_recommendation', NEW.ai_recommendation
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER checkpoints_audit
  AFTER UPDATE OF status ON cognitive_checkpoints
  FOR EACH ROW EXECUTE FUNCTION audit_checkpoint_resolution();


-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE tenants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE superadmins           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decisions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log             ENABLE ROW LEVEL SECURITY;


-- Helpers que leen el JWT enriquecido (ver sección 11)
CREATE OR REPLACE FUNCTION auth_tenant_id() RETURNS UUID AS $$
  SELECT NULLIF(auth.jwt() ->> 'tenant_id', '')::UUID;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_role() RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'user_role';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_superadmin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM superadmins WHERE id = auth.uid()
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_tenant_admin() RETURNS BOOLEAN AS $$
  SELECT auth_user_role() IN ('tenant_admin', 'superadmin') OR is_superadmin();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;


-- ── TENANTS ──────────────────────────────────────────────────
CREATE POLICY "superadmin ve todos los tenants"
  ON tenants FOR SELECT USING (is_superadmin());

CREATE POLICY "tenant users ven su propio tenant"
  ON tenants FOR SELECT USING (id = auth_tenant_id());

CREATE POLICY "solo superadmin gestiona tenants"
  ON tenants FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());


-- ── SUPERADMINS ───────────────────────────────────────────────
CREATE POLICY "superadmins se ven entre sí"
  ON superadmins FOR SELECT USING (is_superadmin());


-- ── TENANT_USERS ──────────────────────────────────────────────
CREATE POLICY "usuarios ven compañeros de su tenant"
  ON tenant_users FOR SELECT
  USING (tenant_id = auth_tenant_id() OR is_superadmin());

CREATE POLICY "admins gestionan usuarios de su tenant"
  ON tenant_users FOR ALL
  USING (tenant_id = auth_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = auth_tenant_id() AND is_tenant_admin());


-- ── TENANT_INVITATIONS ────────────────────────────────────────
CREATE POLICY "admins ven invitaciones de su tenant"
  ON tenant_invitations FOR SELECT
  USING (tenant_id = auth_tenant_id() AND is_tenant_admin() OR is_superadmin());

CREATE POLICY "admins crean invitaciones"
  ON tenant_invitations FOR INSERT
  WITH CHECK (tenant_id = auth_tenant_id() AND is_tenant_admin());

CREATE POLICY "admins revocan invitaciones"
  ON tenant_invitations FOR UPDATE
  USING (tenant_id = auth_tenant_id() AND is_tenant_admin());


-- ── TENANT_MODULES ────────────────────────────────────────────
CREATE POLICY "usuarios ven módulos de su tenant"
  ON tenant_modules FOR SELECT
  USING (tenant_id = auth_tenant_id() OR is_superadmin());

CREATE POLICY "admins gestionan módulos"
  ON tenant_modules FOR ALL
  USING (tenant_id = auth_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = auth_tenant_id() AND is_tenant_admin());


-- ── END_USERS ─────────────────────────────────────────────────
CREATE POLICY "tenant users ven end_users de su tenant"
  ON end_users FOR SELECT
  USING (tenant_id = auth_tenant_id() OR is_superadmin());

CREATE POLICY "service role puede insertar end_users"
  ON end_users FOR INSERT
  WITH CHECK (tenant_id = auth_tenant_id() OR is_superadmin());


-- ── JOURNEY_TEMPLATES ─────────────────────────────────────────
CREATE POLICY "usuarios ven templates de su tenant"
  ON journey_templates FOR SELECT
  USING (tenant_id = auth_tenant_id() OR is_superadmin());

CREATE POLICY "admins gestionan templates"
  ON journey_templates FOR ALL
  USING (tenant_id = auth_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = auth_tenant_id() AND is_tenant_admin());


-- ── SESSIONS ──────────────────────────────────────────────────
CREATE POLICY "admins y supervisores ven todas las sesiones del tenant"
  ON sessions FOR SELECT
  USING (
    (tenant_id = auth_tenant_id() AND auth_user_role() IN ('tenant_admin', 'supervisor'))
    OR is_superadmin()
  );

CREATE POLICY "operadores ven solo sesiones asignadas"
  ON sessions FOR SELECT
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() = 'operator'
    AND assigned_operator = auth.uid()
  );

CREATE POLICY "service role actualiza sesiones"
  ON sessions FOR UPDATE
  USING (tenant_id = auth_tenant_id() OR is_superadmin());


-- ── INTERACTIONS ──────────────────────────────────────────────
CREATE POLICY "usuarios ven interacciones de sesiones visibles"
  ON interactions FOR SELECT
  USING (tenant_id = auth_tenant_id() OR is_superadmin());

CREATE POLICY "operadores insertan interacciones en sesiones asignadas"
  ON interactions FOR INSERT
  WITH CHECK (tenant_id = auth_tenant_id());


-- ── AI_DECISIONS ──────────────────────────────────────────────
CREATE POLICY "usuarios ven decisiones IA de su tenant"
  ON ai_decisions FOR SELECT
  USING (tenant_id = auth_tenant_id() OR is_superadmin());


-- ── COGNITIVE_CHECKPOINTS ─────────────────────────────────────
CREATE POLICY "supervisores y admins ven todos los checkpoints del tenant"
  ON cognitive_checkpoints FOR SELECT
  USING (
    (tenant_id = auth_tenant_id() AND auth_user_role() IN ('tenant_admin', 'supervisor'))
    OR is_superadmin()
  );

CREATE POLICY "operadores ven checkpoints asignados"
  ON cognitive_checkpoints FOR SELECT
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() = 'operator'
    AND assigned_to = auth.uid()
  );

CREATE POLICY "operadores resuelven sus checkpoints"
  ON cognitive_checkpoints FOR UPDATE
  USING (
    tenant_id = auth_tenant_id()
    AND (assigned_to = auth.uid() OR auth_user_role() IN ('supervisor', 'tenant_admin'))
  )
  WITH CHECK (tenant_id = auth_tenant_id());


-- ── ESCALATIONS ───────────────────────────────────────────────
CREATE POLICY "supervisores y admins ven todas las escaladas"
  ON escalations FOR SELECT
  USING (
    (tenant_id = auth_tenant_id() AND auth_user_role() IN ('tenant_admin', 'supervisor'))
    OR is_superadmin()
  );

CREATE POLICY "operadores ven escaladas asignadas"
  ON escalations FOR SELECT
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() = 'operator'
    AND assigned_to = auth.uid()
  );

CREATE POLICY "operadores y supervisores actualizan escaladas asignadas"
  ON escalations FOR UPDATE
  USING (
    tenant_id = auth_tenant_id()
    AND (assigned_to = auth.uid() OR auth_user_role() IN ('supervisor', 'tenant_admin'))
  );


-- ── AUDIT_LOG (solo lectura para admins, insert para service role) ──
CREATE POLICY "admins leen su audit log"
  ON audit_log FOR SELECT
  USING (
    (tenant_id = auth_tenant_id() AND is_tenant_admin())
    OR is_superadmin()
  );

CREATE POLICY "service role inserta en audit log"
  ON audit_log FOR INSERT WITH CHECK (true);


-- ============================================================
-- 10. ÍNDICES DE RENDIMIENTO
-- ============================================================

-- Sesiones
CREATE INDEX idx_sessions_tenant_status        ON sessions(tenant_id, status);
CREATE INDEX idx_sessions_end_user             ON sessions(end_user_id);
CREATE INDEX idx_sessions_assigned             ON sessions(assigned_operator) WHERE assigned_operator IS NOT NULL;
CREATE INDEX idx_sessions_last_activity        ON sessions(tenant_id, last_activity_at DESC);

-- Interacciones
CREATE INDEX idx_interactions_session_time     ON interactions(session_id, created_at DESC);
CREATE INDEX idx_interactions_tenant_time      ON interactions(tenant_id, created_at DESC);
CREATE INDEX idx_interactions_actor            ON interactions(actor_type, tenant_id);

-- AI decisions
CREATE INDEX idx_ai_decisions_interaction      ON ai_decisions(interaction_id);
CREATE INDEX idx_ai_decisions_confidence       ON ai_decisions(tenant_id, confidence) WHERE confidence < 0.7;

-- Cognitive checkpoints (operaciones frecuentes: buscar pendientes por operador)
CREATE INDEX idx_checkpoints_pending           ON cognitive_checkpoints(tenant_id, status) WHERE status = 'pending';
CREATE INDEX idx_checkpoints_assigned_pending  ON cognitive_checkpoints(assigned_to, status) WHERE status = 'pending';
CREATE INDEX idx_checkpoints_expiry            ON cognitive_checkpoints(expires_at) WHERE status = 'pending';

-- Escalations (cola del dashboard IH)
CREATE INDEX idx_escalations_open              ON escalations(tenant_id, outcome) WHERE outcome IS NULL;
CREATE INDEX idx_escalations_assigned          ON escalations(assigned_to) WHERE outcome IS NULL;

-- End users
CREATE INDEX idx_end_users_tenant              ON end_users(tenant_id);
CREATE INDEX idx_end_users_channel_whatsapp    ON end_users((channel_ids ->> 'whatsapp')) WHERE channel_ids ? 'whatsapp';
CREATE INDEX idx_end_users_channel_email       ON end_users((channel_ids ->> 'email')) WHERE channel_ids ? 'email';

-- Audit log
CREATE INDEX idx_audit_log_tenant_time         ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_session             ON audit_log(session_id, created_at DESC);

-- Invitaciones
CREATE INDEX idx_invitations_token_pending     ON tenant_invitations(token) WHERE status = 'pending';
CREATE INDEX idx_invitations_email             ON tenant_invitations(tenant_id, email);

-- Tenant modules
CREATE INDEX idx_tenant_modules_active         ON tenant_modules(tenant_id) WHERE is_active = true;


-- ============================================================
-- 11. JWT CUSTOM CLAIMS HOOK
-- Agrega tenant_id y user_role al JWT de Supabase Auth.
-- Registrar en: Supabase Dashboard → Auth → Hooks → Custom Access Token
-- ============================================================

CREATE OR REPLACE FUNCTION public.cricket_custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  claims         JSONB;
  v_tenant_id    UUID;
  v_role         TEXT;
  v_is_super     BOOLEAN;
BEGIN
  claims := event -> 'claims';

  -- ¿Es superadmin?
  SELECT EXISTS (
    SELECT 1 FROM public.superadmins WHERE id = (event ->> 'user_id')::UUID
  ) INTO v_is_super;

  IF v_is_super THEN
    claims := jsonb_set(claims, '{user_role}', '"superadmin"');
    claims := jsonb_set(claims, '{tenant_id}', 'null');
  ELSE
    -- Buscar tenant y role del usuario
    SELECT tenant_id, role::TEXT
    INTO v_tenant_id, v_role
    FROM public.tenant_users
    WHERE id = (event ->> 'user_id')::UUID
      AND is_active = true;

    IF v_tenant_id IS NOT NULL THEN
      claims := jsonb_set(claims, '{tenant_id}', to_jsonb(v_tenant_id::TEXT));
      claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role));
    END IF;
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Permiso necesario para que Supabase Auth ejecute el hook
GRANT EXECUTE ON FUNCTION public.cricket_custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.cricket_custom_access_token_hook FROM PUBLIC;


-- ============================================================
-- 12. REALTIME (actualizaciones en vivo para el dashboard IH)
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE cognitive_checkpoints;
ALTER PUBLICATION supabase_realtime ADD TABLE escalations;


-- ============================================================
-- 13. FUNCIÓN UTILITARIA: módulos activos de un tenant
-- ============================================================

CREATE OR REPLACE FUNCTION get_tenant_stages(p_tenant_id UUID)
RETURNS TABLE (
  module_type    module_type,
  is_active      BOOLEAN,
  fallback_type  fallback_type,
  fallback_config JSONB,
  config         JSONB
)
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT
    tm.module_type,
    tm.is_active,
    tm.fallback_type,
    tm.fallback_config,
    tm.config
  FROM tenant_modules tm
  WHERE tm.tenant_id = p_tenant_id
  ORDER BY
    CASE tm.module_type
      WHEN 'consultation'  THEN 1
      WHEN 'sales'         THEN 2
      WHEN 'transactions'  THEN 3
      WHEN 'feedback'      THEN 4
    END;
$$;
COMMENT ON FUNCTION get_tenant_stages IS 'Devuelve los 4 módulos del tenant en orden del journey. El Journey Engine llama esto al iniciar cada sesión.';


-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
-- Próximo paso: cricket_002_seed_banking.sql
--   → Tenant de prueba (Banco XYZ)
--   → journey_template bancario por defecto
--   → módulos de prueba con configuración base
-- ============================================================
