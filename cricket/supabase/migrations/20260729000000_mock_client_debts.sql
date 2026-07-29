-- ============================================================
-- Cricket — Deudas simuladas para el trámite de paz y salvo
-- Tabla de datos de prueba: permite simular clientes al día y
-- clientes con deuda pendiente sin integrar el core bancario real.
-- ============================================================

CREATE TABLE IF NOT EXISTS mock_client_debts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_number TEXT NOT NULL,
  has_debt       BOOLEAN NOT NULL DEFAULT false,
  debt_amount    NUMERIC,
  debt_detail    TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE mock_client_debts IS 'Datos simulados de deuda por número de documento, usados por el trámite paz_y_salvo mientras no exista integración con el core bancario real.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_mock_client_debts_tenant_doc
  ON mock_client_debts(tenant_id, document_number);

ALTER TABLE mock_client_debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant users ven deudas simuladas" ON mock_client_debts;
CREATE POLICY "tenant users ven deudas simuladas"
  ON mock_client_debts FOR SELECT
  USING (tenant_id = auth_tenant_id() OR is_superadmin());

DROP TRIGGER IF EXISTS mock_client_debts_updated_at ON mock_client_debts;
CREATE TRIGGER mock_client_debts_updated_at
  BEFORE UPDATE ON mock_client_debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
