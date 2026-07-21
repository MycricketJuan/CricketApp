-- Tenant-owned communication channels.
-- Provider secrets never belong in config; credentials_ref points to an
-- external secret manager or Supabase Vault entry resolved only server-side.

CREATE TABLE tenant_channels (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel             channel_type NOT NULL,
  provider            TEXT         NOT NULL,
  address             TEXT         NOT NULL,
  external_account_id TEXT,
  config               JSONB        NOT NULL DEFAULT '{}'::jsonb,
  credentials_ref      TEXT,
  is_active            BOOLEAN      NOT NULL DEFAULT false,
  verified_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT tenant_channels_provider_not_blank
    CHECK (length(btrim(provider)) > 0 AND provider = btrim(provider)),
  CONSTRAINT tenant_channels_address_not_blank
    CHECK (length(btrim(address)) > 0 AND address = btrim(address)),
  CONSTRAINT tenant_channels_credentials_ref_not_blank
    CHECK (credentials_ref IS NULL OR length(btrim(credentials_ref)) > 0),
  CONSTRAINT tenant_channels_config_is_object
    CHECK (jsonb_typeof(config) = 'object'),
  CONSTRAINT tenant_channels_config_has_no_top_level_secrets
    CHECK (NOT config ?| ARRAY[
      'access_token',
      'api_key',
      'auth_token',
      'client_secret',
      'password',
      'private_key',
      'verify_token'
    ]),
  CONSTRAINT tenant_channels_one_channel_type_per_tenant
    UNIQUE (tenant_id, channel),
  CONSTRAINT tenant_channels_address_unique_per_channel
    UNIQUE (channel, address)
);

COMMENT ON TABLE tenant_channels IS
  'Canales que pertenecen a un tenant. Permiten enrutar mensajes entrantes al cliente Cricket correcto.';
COMMENT ON COLUMN tenant_channels.address IS
  'Identificador público normalizado del canal. Para WhatsApp, el número receptor en formato E.164.';
COMMENT ON COLUMN tenant_channels.config IS
  'Configuración no secreta del proveedor. Las credenciales están prohibidas por constraint.';
COMMENT ON COLUMN tenant_channels.credentials_ref IS
  'Referencia opaca a credenciales almacenadas fuera de esta tabla; nunca contiene el secreto.';

CREATE INDEX tenant_channels_tenant_active_idx
  ON tenant_channels (tenant_id, is_active);
CREATE INDEX tenant_channels_provider_account_idx
  ON tenant_channels (provider, external_account_id)
  WHERE external_account_id IS NOT NULL;

CREATE TRIGGER tenant_channels_updated_at
  BEFORE UPDATE ON tenant_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- No client policies are intentional. Only trusted server code using the
-- service-role client may read credential references or mutate channels.
ALTER TABLE tenant_channels ENABLE ROW LEVEL SECURITY;
