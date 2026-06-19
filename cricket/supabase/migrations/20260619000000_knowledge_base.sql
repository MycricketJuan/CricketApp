-- ============================================================
-- Cricket — Knowledge Base con pgvector (RAG)
-- Migración: cricket_002_knowledge_base.sql
-- ============================================================

-- Extensión pgvector (ya disponible en Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Tabla de documentos ──────────────────────────────────────
-- Un registro por fuente cargada (archivo, URL o FAQ)

CREATE TABLE knowledge_base_documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  source_type TEXT        NOT NULL CHECK (source_type IN ('file', 'url', 'faq')),
  source_url  TEXT,
  file_name   TEXT,
  status      TEXT        NOT NULL DEFAULT 'processing'
                          CHECK (status IN ('processing', 'ready', 'error')),
  error_msg   TEXT,
  chunk_count INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX knowledge_base_documents_tenant_idx
  ON knowledge_base_documents (tenant_id);

CREATE TRIGGER knowledge_base_documents_updated_at
  BEFORE UPDATE ON knowledge_base_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Tabla de chunks con embeddings ───────────────────────────
-- Cada documento se parte en fragmentos de ~500 tokens

CREATE TABLE knowledge_base_chunks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID        NOT NULL REFERENCES knowledge_base_documents(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL,
  content     TEXT        NOT NULL,
  embedding   vector(1536),
  chunk_index INT         NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsqueda por similitud coseno (IVFFlat)
-- lists=100 es adecuado para hasta ~1M vectores por tenant
CREATE INDEX knowledge_base_chunks_embedding_idx
  ON knowledge_base_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX knowledge_base_chunks_tenant_idx
  ON knowledge_base_chunks (tenant_id);

-- ── Función de búsqueda semántica ────────────────────────────

CREATE OR REPLACE FUNCTION search_knowledge_base(
  p_tenant_id UUID,
  p_embedding vector(1536),
  p_limit     INT DEFAULT 5
)
RETURNS TABLE (
  chunk_id    UUID,
  document_id UUID,
  content     TEXT,
  similarity  FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id           AS chunk_id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> p_embedding) AS similarity
  FROM knowledge_base_chunks c
  JOIN knowledge_base_documents d ON d.id = c.document_id
  WHERE c.tenant_id  = p_tenant_id
    AND d.status     = 'ready'
    AND c.embedding  IS NOT NULL
  ORDER BY c.embedding <=> p_embedding
  LIMIT p_limit;
$$;

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_chunks    ENABLE ROW LEVEL SECURITY;

-- tenant_users ven solo los documentos de su tenant
CREATE POLICY "tenant_users_see_own_documents"
  ON knowledge_base_documents FOR ALL
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "tenant_users_see_own_chunks"
  ON knowledge_base_chunks FOR ALL
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- service_role (usado en API routes) bypasea RLS automáticamente
