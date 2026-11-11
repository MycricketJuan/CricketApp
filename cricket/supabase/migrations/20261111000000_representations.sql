-- ============================================================
-- Cricket / ZEREZ — Representaciones (flujo "Crear")
-- Migración: 20261111000000_representations.sql
--
-- Estado persistente del flujo conversacional "Crear representación":
-- perfil, conocimiento por ítem del catálogo (123), fuentes, hilo,
-- menús (caminos) y eventos de auditoría/undo. Costo/tokens por turno
-- y acumulado por representación.
-- ============================================================

-- ── Representación (una por construcción) ─────────────────────
CREATE TABLE representations (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by          TEXT,                           -- auth0_sub o email
  status              TEXT        NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft', 'ready_review', 'menus', 'done')),
  profile             JSONB       NOT NULL DEFAULT '{}'::jsonb,  -- { user, company, color, color_secondary, logo_url, tone }
  understanding       NUMERIC(5,2) NOT NULL DEFAULT 0,          -- cache del cálculo del servidor (0–100)
  catalog_version     TEXT        NOT NULL DEFAULT '2026-11',
  pending             JSONB       NOT NULL DEFAULT '{}'::jsonb,  -- { waiting_for, targets[] }
  total_input_tokens  BIGINT      NOT NULL DEFAULT 0,
  total_output_tokens BIGINT      NOT NULL DEFAULT 0,
  est_cost_usd        NUMERIC(10,4) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX representations_tenant_idx ON representations (tenant_id);

CREATE TRIGGER representations_updated_at
  BEFORE UPDATE ON representations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Conocimiento por ítem del catálogo (123 filas por representación) ──
CREATE TABLE representation_knowledge (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  representation_id UUID        NOT NULL REFERENCES representations(id) ON DELETE CASCADE,
  tenant_id         UUID        NOT NULL,
  item_id           TEXT        NOT NULL,             -- p.ej. 'identidad.01'
  submodule_id      TEXT        NOT NULL,             -- p.ej. 'identidad'
  module_id         TEXT        NOT NULL,             -- p.ej. 'representacion'
  status            TEXT        NOT NULL DEFAULT 'todo'
                                CHECK (status IN ('todo', 'inferred', 'confirmed', 'not_applicable')),
  value             TEXT,
  confidence        NUMERIC(4,3) NOT NULL DEFAULT 0,
  quality           NUMERIC(4,3) NOT NULL DEFAULT 0,
  evidence          JSONB       NOT NULL DEFAULT '[]'::jsonb,  -- [{ kind, source_id|message_id, quote, ref }]
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (representation_id, item_id)
);

CREATE INDEX representation_knowledge_rep_submodule_idx
  ON representation_knowledge (representation_id, submodule_id);
CREATE INDEX representation_knowledge_tenant_idx
  ON representation_knowledge (tenant_id);

CREATE TRIGGER representation_knowledge_updated_at
  BEFORE UPDATE ON representation_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Fuentes (URLs / documentos) ───────────────────────────────
-- La ingesta (chunks + embeddings) reusa knowledge_base_chunks en fase 3.
CREATE TABLE representation_sources (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  representation_id UUID        NOT NULL REFERENCES representations(id) ON DELETE CASCADE,
  tenant_id         UUID        NOT NULL,
  kind              TEXT        NOT NULL CHECK (kind IN ('url', 'file')),
  url               TEXT,
  file_name         TEXT,
  title             TEXT,
  status            TEXT        NOT NULL DEFAULT 'processing'
                                CHECK (status IN ('processing', 'ready', 'error')),
  error_msg         TEXT,
  chunk_count       INT         NOT NULL DEFAULT 0,
  extracted_items   INT         NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX representation_sources_rep_idx ON representation_sources (representation_id);

-- ── Hilo de la conversación (persistente para hidratar al recargar) ──
CREATE TABLE representation_messages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  representation_id UUID        NOT NULL REFERENCES representations(id) ON DELETE CASCADE,
  tenant_id         UUID        NOT NULL,
  role              TEXT        NOT NULL CHECK (role IN ('zerez', 'user', 'system')),
  content           TEXT        NOT NULL DEFAULT '',
  card              JSONB,                            -- tarjeta/atajo mostrado en el turno, si hubo
  input_tokens      INT         NOT NULL DEFAULT 0,
  output_tokens     INT         NOT NULL DEFAULT 0,
  est_cost_usd      NUMERIC(10,4) NOT NULL DEFAULT 0, -- costo estimado del turno (en mensajes de ZEREZ)
  tools_used        JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX representation_messages_rep_idx
  ON representation_messages (representation_id, created_at);

-- ── Menús (los "caminos" de la representación) ────────────────
CREATE TABLE representation_menus (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  representation_id UUID        NOT NULL REFERENCES representations(id) ON DELETE CASCADE,
  tenant_id         UUID        NOT NULL,
  menu_key          TEXT        NOT NULL,
  title             TEXT        NOT NULL,
  description       TEXT,
  icon              TEXT,
  intent            TEXT,
  rationale         TEXT,
  position          INT         NOT NULL DEFAULT 0,
  enabled           BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE INDEX representation_menus_rep_idx ON representation_menus (representation_id, position);

-- ── Eventos (auditoría / undo de cambios de conocimiento y perfil) ──
CREATE TABLE representation_events (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  representation_id UUID        NOT NULL REFERENCES representations(id) ON DELETE CASCADE,
  tenant_id         UUID        NOT NULL,
  type              TEXT        NOT NULL,             -- profile_update | knowledge_upsert | knowledge_confirm | menu_change | …
  payload           JSONB       NOT NULL DEFAULT '{}'::jsonb,  -- { before, after, items }
  source            TEXT        NOT NULL DEFAULT 'user_message',  -- user_message | source_extraction | zerez_proposal
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX representation_events_rep_idx ON representation_events (representation_id, created_at);

-- ── RLS ───────────────────────────────────────────────────────
-- Igual que knowledge_base_*: tenant_users ven solo lo de su tenant.
-- service_role (API routes) bypasea RLS automáticamente.
ALTER TABLE representations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE representation_knowledge   ENABLE ROW LEVEL SECURITY;
ALTER TABLE representation_sources     ENABLE ROW LEVEL SECURITY;
ALTER TABLE representation_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE representation_menus       ENABLE ROW LEVEL SECURITY;
ALTER TABLE representation_events      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_users_see_own_representations"
  ON representations FOR ALL
  USING ( tenant_id = (auth.jwt() ->> 'tenant_id')::uuid );

CREATE POLICY "tenant_users_see_own_rep_knowledge"
  ON representation_knowledge FOR ALL
  USING ( tenant_id = (auth.jwt() ->> 'tenant_id')::uuid );

CREATE POLICY "tenant_users_see_own_rep_sources"
  ON representation_sources FOR ALL
  USING ( tenant_id = (auth.jwt() ->> 'tenant_id')::uuid );

CREATE POLICY "tenant_users_see_own_rep_messages"
  ON representation_messages FOR ALL
  USING ( tenant_id = (auth.jwt() ->> 'tenant_id')::uuid );

CREATE POLICY "tenant_users_see_own_rep_menus"
  ON representation_menus FOR ALL
  USING ( tenant_id = (auth.jwt() ->> 'tenant_id')::uuid );

CREATE POLICY "tenant_users_see_own_rep_events"
  ON representation_events FOR ALL
  USING ( tenant_id = (auth.jwt() ->> 'tenant_id')::uuid );
