-- Migration: desacoplar tenant_users de Supabase Auth y agregar user_grants
-- El proyecto usa Auth0 (subs tipo 'google-oauth2|...'), no Supabase Auth.
-- tenant_users.id ya no puede referenciar auth.users porque esos IDs no existen.

-- 1. Agregar columnas a tenant_users antes de tocar la PK/FK
ALTER TABLE tenant_users
  ADD COLUMN IF NOT EXISTS auth0_sub TEXT,
  ADD COLUMN IF NOT EXISTS email     TEXT;

-- 2. Quitar FK a auth.users (no aplica con Auth0)
ALTER TABLE tenant_users
  DROP CONSTRAINT IF EXISTS tenant_users_id_fkey;

-- 3. Hacer id auto-generado para nuevas filas
ALTER TABLE tenant_users
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. Índice único en auth0_sub para lookup en after-login
CREATE UNIQUE INDEX IF NOT EXISTS tenant_users_auth0_sub_tenant
  ON tenant_users (auth0_sub, tenant_id)
  WHERE auth0_sub IS NOT NULL;

-- 5. Tabla de pre-autorizaciones por email (creadas por superadmin)
--    El registro aquí = "este email tiene este rol en este tenant"
--    Se convierte en tenant_users en el primer login del usuario
CREATE TABLE IF NOT EXISTS user_grants (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL,
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role        user_role   NOT NULL DEFAULT 'operator',
  full_name   TEXT,
  granted_by  TEXT        NOT NULL, -- auth0_sub del superadmin que otorgó el acceso
  provisioned BOOLEAN     NOT NULL DEFAULT false, -- true cuando ya se creó tenant_users
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email, tenant_id)
);

COMMENT ON TABLE user_grants IS
  'Pre-autorizaciones creadas por superadmin. En el primer login del usuario se convierten en tenant_users.';

-- RLS: solo service_role puede leer/escribir (dashboard usa admin client)
ALTER TABLE user_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON user_grants
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 6. Tabla de pre-autorizaciones de superadmin por email
CREATE TABLE IF NOT EXISTS superadmin_grants (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL UNIQUE,
  full_name   TEXT,
  granted_by  TEXT        NOT NULL,
  provisioned BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE superadmin_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON superadmin_grants
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
