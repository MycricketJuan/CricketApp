-- ============================================================
-- Cricket — Seed data: Banco XYZ (demo bancario)
-- Aplicar en: Supabase SQL Editor → Run
-- Orden: ejecutar después de cricket_001_initial_schema.sql
-- ============================================================
--
-- UUIDs fijos para referenciar entre tablas:
-- TENANT_ID:   'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- TEMPLATE_ID: 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
-- MODULE_CONSULTA_ID:      'c3d4e5f6-a7b8-9012-cdef-123456789012'
-- MODULE_VENTAS_ID:        'd4e5f6a7-b8c9-0123-defa-234567890123'
-- MODULE_TRANSACCIONES_ID: 'e5f6a7b8-c9d0-1234-efab-345678901234'
-- MODULE_FEEDBACK_ID:      'f6a7b8c9-d0e1-2345-fabc-456789012345'


-- ============================================================
-- SECCIÓN 1 — Tablas auxiliares (knowledge_base, products)
-- ============================================================

CREATE TABLE IF NOT EXISTS knowledge_base (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kb_tenant ON knowledge_base(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kb_fts
  ON knowledge_base USING gin(to_tsvector('spanish', content));
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant users ven su knowledge base" ON knowledge_base;
CREATE POLICY "tenant users ven su knowledge base"
  ON knowledge_base FOR SELECT
  USING (tenant_id = auth_tenant_id() OR is_superadmin());

CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  features    JSONB NOT NULL DEFAULT '[]',
  price       NUMERIC(12,2),
  segments    JSONB NOT NULL DEFAULT '["all"]',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_fts
  ON products USING gin(to_tsvector('spanish', description));
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant users ven sus productos" ON products;
CREATE POLICY "tenant users ven sus productos"
  ON products FOR SELECT
  USING (tenant_id = auth_tenant_id() OR is_superadmin());


-- ============================================================
-- SECCIÓN 2 — Tenant: Banco XYZ
-- ============================================================

INSERT INTO tenants (id, name, slug, sector, claude_config, ih_policies)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Banco XYZ',
  'banco-xyz',
  'banking',
  '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1000,
    "temperature": 0.7
  }',
  '{
    "require_2fa_for_operators": true,
    "auto_escalate_below_confidence": 0.65,
    "max_session_duration_hours": 8,
    "human_approval_required_for_payments": true,
    "auto_escalate_on_sentiment": ["frustrated", "angry"],
    "compliance": {
      "sarlaft_threshold_cop": 10000000,
      "require_identity_check_for_transactions": true,
      "audit_all_data_changes": true
    }
  }'
)
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  claude_config = EXCLUDED.claude_config,
  ih_policies   = EXCLUDED.ih_policies,
  updated_at    = NOW();


-- ============================================================
-- SECCIÓN 3 — Módulos del tenant
-- ============================================================

-- Módulo 1: consultation
INSERT INTO tenant_modules (id, tenant_id, module_type, is_active, fallback_type, fallback_config, config)
VALUES (
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'consultation',
  true,
  'ih_handoff',
  '{"message": "Un asesor te atenderá en breve."}',
  '{
    "confidence_threshold": 0.65,
    "max_turns": 20,
    "knowledge_base_enabled": true,
    "custom_system_prompt_suffix": "Eres el asistente de Banco XYZ. Habla siempre en español formal."
  }'
)
ON CONFLICT (tenant_id, module_type) DO UPDATE SET
  is_active       = EXCLUDED.is_active,
  fallback_type   = EXCLUDED.fallback_type,
  fallback_config = EXCLUDED.fallback_config,
  config          = EXCLUDED.config;

-- Módulo 2: sales
INSERT INTO tenant_modules (id, tenant_id, module_type, is_active, fallback_type, fallback_config, config)
VALUES (
  'd4e5f6a7-b8c9-0123-defa-234567890123',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'sales',
  true,
  'ih_handoff',
  '{"message": "Un asesor comercial te contactará."}',
  '{
    "confidence_threshold": 0.70,
    "max_turns": 15,
    "product_catalog_enabled": true,
    "max_products_to_show": 3
  }'
)
ON CONFLICT (tenant_id, module_type) DO UPDATE SET
  is_active       = EXCLUDED.is_active,
  fallback_type   = EXCLUDED.fallback_type,
  fallback_config = EXCLUDED.fallback_config,
  config          = EXCLUDED.config;

-- Módulo 3: transactions
INSERT INTO tenant_modules (id, tenant_id, module_type, is_active, fallback_type, fallback_config, config)
VALUES (
  'e5f6a7b8-c9d0-1234-efab-345678901234',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'transactions',
  true,
  'ih_handoff',
  '{"message": "Conectando con el equipo de operaciones."}',
  '{
    "confidence_threshold": 0.80,
    "max_turns": 10,
    "always_require_ih_approval": true,
    "sarlaft_enabled": true
  }'
)
ON CONFLICT (tenant_id, module_type) DO UPDATE SET
  is_active       = EXCLUDED.is_active,
  fallback_type   = EXCLUDED.fallback_type,
  fallback_config = EXCLUDED.fallback_config,
  config          = EXCLUDED.config;

-- Módulo 4: feedback
INSERT INTO tenant_modules (id, tenant_id, module_type, is_active, fallback_type, fallback_config, config)
VALUES (
  'f6a7b8c9-d0e1-2345-fabc-456789012345',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'feedback',
  true,
  'skip',
  '{}',
  '{
    "confidence_threshold": 0.60,
    "nps_scale": 10,
    "collect_csat": true,
    "auto_close_after_feedback": true
  }'
)
ON CONFLICT (tenant_id, module_type) DO UPDATE SET
  is_active       = EXCLUDED.is_active,
  fallback_type   = EXCLUDED.fallback_type,
  fallback_config = EXCLUDED.fallback_config,
  config          = EXCLUDED.config;


-- ============================================================
-- SECCIÓN 4 — Journey template bancario
-- ============================================================

INSERT INTO journey_templates (id, tenant_id, sector, name, stages_config, ih_checkpoints, is_active, is_default)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'banking',
  'Journey bancario estándar',
  '[
    {
      "order": 1,
      "stage_type": "consultation",
      "is_active": true,
      "agent": "consultation_agent",
      "fallback": null,
      "ih_checkpoint": false,
      "description": "Atención de consultas, FAQs y orientación general"
    },
    {
      "order": 2,
      "stage_type": "sales",
      "is_active": true,
      "agent": "sales_agent",
      "fallback": null,
      "ih_checkpoint": false,
      "description": "Oferta de productos según perfil del cliente"
    },
    {
      "order": 3,
      "stage_type": "transactions",
      "is_active": true,
      "agent": "transactions_agent",
      "fallback": "ih_handoff",
      "ih_checkpoint": true,
      "description": "Gestión de operaciones con aprobación IH obligatoria"
    },
    {
      "order": 4,
      "stage_type": "feedback",
      "is_active": true,
      "agent": "feedback_agent",
      "fallback": "skip",
      "ih_checkpoint": false,
      "description": "Cierre del journey con recopilación de NPS y CSAT"
    }
  ]',
  '[
    {
      "trigger": "payment_above_threshold",
      "threshold_cop": 5000000,
      "action": "require_supervisor_approval",
      "description": "Pagos sobre 5M COP requieren aprobación de supervisor"
    },
    {
      "trigger": "identity_not_verified",
      "action": "block_transactions",
      "description": "Bloquear operaciones si identidad no está verificada"
    },
    {
      "trigger": "sarlaft_threshold",
      "threshold_cop": 10000000,
      "action": "require_compliance_review",
      "description": "Operaciones sobre 10M COP activan revisión SARLAFT"
    }
  ]',
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  stages_config  = EXCLUDED.stages_config,
  ih_checkpoints = EXCLUDED.ih_checkpoints,
  updated_at     = NOW();


-- ============================================================
-- SECCIÓN 5 — Knowledge base (10 entradas bancarias)
-- ============================================================

DELETE FROM knowledge_base WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

INSERT INTO knowledge_base (tenant_id, title, content, metadata) VALUES

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Tarifas de transferencias nacionales',
  'Las transferencias nacionales entre cuentas Banco XYZ no tienen costo.
Transferencias a otros bancos por PSE tienen un costo de $4.350 COP por transacción.
Transferencias interbancarias por SPEI tienen un costo de $6.800 COP.
El límite diario para transferencias es de $50.000.000 COP.
El límite mensual acumulado es de $200.000.000 COP.',
  '{"category": "tarifas", "tags": ["transferencias", "costos", "limites"]}'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Tarifas de transferencias internacionales',
  'Las transferencias internacionales (SWIFT) tienen un costo fijo de $150.000 COP
más el 0.4% del monto enviado. El monto mínimo de transferencia internacional es USD 100.
El plazo de acreditación es de 2 a 5 días hábiles dependiendo del banco corresponsal.
Se requiere verificación de identidad adicional para montos superiores a USD 5.000.',
  '{"category": "tarifas", "tags": ["internacional", "swift", "divisas"]}'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Apertura de cuenta de ahorros',
  'Para abrir una cuenta de ahorros en Banco XYZ se requiere:
cédula de ciudadanía vigente, constancia de ingresos (últimas 3 colillas de pago
o declaración de renta), y un depósito inicial mínimo de $50.000 COP.
El proceso puede completarse completamente en línea en menos de 10 minutos.
La cuenta queda activa en máximo 1 día hábil.',
  '{"category": "productos", "tags": ["cuenta ahorros", "apertura", "requisitos"]}'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Tarjeta de crédito — requisitos y límites',
  'Para solicitar una tarjeta de crédito Banco XYZ Clásica se requieren
ingresos mínimos de $1.500.000 COP. Para la tarjeta Oro, ingresos mínimos de
$3.000.000 COP. Para la tarjeta Platinum, ingresos mínimos de $6.000.000 COP.
El cupo inicial se asigna entre 1 y 5 veces el ingreso mensual según el perfil crediticio.
La tasa de interés efectiva anual vigente para tarjetas de crédito es del 27.68%.',
  '{"category": "productos", "tags": ["tarjeta credito", "cupo", "requisitos"]}'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Bloqueo y desbloqueo de tarjeta',
  'Para bloquear una tarjeta de forma inmediata puede hacerlo desde la app móvil
en Tarjetas → Bloquear, por esta línea de atención, o marcando *600 desde cualquier
celular. El bloqueo es inmediato y gratuito. Para desbloquear la tarjeta debe
comunicarse con el equipo de seguridad con su número de cédula y código de verificación.
En caso de pérdida o robo, el bloqueo es definitivo y se emite una nueva tarjeta
en 5 días hábiles sin costo.',
  '{"category": "seguridad", "tags": ["bloqueo", "tarjeta", "seguridad"]}'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'CDT — Tasas y plazos vigentes',
  'Los CDT (Certificados de Depósito a Término) de Banco XYZ tienen
las siguientes tasas efectivas anuales vigentes:
- 90 días: 11.2% EA
- 180 días: 12.1% EA
- 365 días: 12.8% EA
- 540 días: 13.2% EA
- 720 días (2 años): 13.5% EA
El monto mínimo para abrir un CDT es de $1.000.000 COP.
Los rendimientos se pueden recibir al vencimiento o de forma periódica mensual.',
  '{"category": "inversiones", "tags": ["cdt", "tasas", "plazo"]}'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Crédito de libranza — condiciones',
  'El crédito de libranza está disponible para empleados de entidades públicas
y empresas aliadas. Tasas desde el 1.2% mensual (15.39% EA). Plazo hasta 72 meses.
El descuento se hace directamente del nómina. No requiere codeudor.
El monto máximo es hasta el 50% del salario mensual neto multiplicado por el plazo.
Desembolso en 48 horas hábiles una vez aprobado.',
  '{"category": "creditos", "tags": ["libranza", "nomina", "credito"]}'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Reclamaciones y tiempos de respuesta',
  'Banco XYZ responde todas las reclamaciones en los siguientes plazos:
- Transacciones no reconocidas: 15 días hábiles
- Cobros incorrectos: 5 días hábiles
- Problemas con créditos: 10 días hábiles
- Solicitudes generales: 5 días hábiles
Para interponer una reclamación formal puede hacerlo por este canal, en sucursal
o escribiendo a reclamaciones@bancoxyz.com. Le asignaremos un número de radicado
que puede usar para hacer seguimiento.',
  '{"category": "servicio", "tags": ["reclamaciones", "quejas", "plazos"]}'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Límites de retiro en cajeros',
  'Los límites de retiro en cajeros automáticos Banco XYZ son:
- Cuenta de ahorros: $2.000.000 COP por transacción, máximo $4.000.000 COP diarios
- Cuenta corriente: $3.000.000 COP por transacción, máximo $6.000.000 COP diarios
- Retiro en cajeros de otras redes: costo de $4.350 COP por retiro
Los límites pueden aumentarse temporalmente contactando al equipo de atención.
Para montos mayores puede hacer un retiro en ventanilla con cédula.',
  '{"category": "cajeros", "tags": ["retiro", "cajero", "limites"]}'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Certificados bancarios y extractos',
  'Los certificados bancarios tienen los siguientes tiempos de entrega:
- Certificado de cuenta: inmediato por app o correo electrónico, gratuito
- Certificado de saldo: inmediato, gratuito
- Extractos históricos (más de 3 meses): 1 día hábil, $5.000 COP
- Certificado de deuda para créditos: 1 día hábil, gratuito
- Paz y salvo: 3 días hábiles, gratuito
Todos los documentos se envían al correo registrado o pueden descargarse
desde la app en Documentos → Mis certificados.',
  '{"category": "documentos", "tags": ["certificados", "extractos", "tramites"]}'
);


-- ============================================================
-- SECCIÓN 6 — Productos bancarios (3 productos)
-- ============================================================

DELETE FROM products WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

INSERT INTO products (tenant_id, name, description, features, price, segments, metadata) VALUES

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Cuenta Digital XYZ',
  'Cuenta de ahorros digital sin cuota de manejo, con tarjeta débito
Mastercard incluida. Transferencias gratis ilimitadas entre cuentas Banco XYZ.
Apertura 100% en línea en menos de 10 minutos. Rendimiento del 4% EA sobre el saldo.',
  '["Sin cuota de manejo", "Tarjeta débito Mastercard", "Transferencias gratis",
    "4% EA de rendimiento", "App con notificaciones en tiempo real"]',
  0,
  '["basic", "digital", "all"]',
  '{"product_code": "CAH-001", "min_income_cop": 0, "opening_deposit_cop": 50000}'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'CDT Digital 365 días',
  'Certificado de depósito a término a 365 días con tasa del 12.8% EA.
Monto mínimo $1.000.000 COP. Sin comisiones. Renovación automática opcional.
Ideal para ahorro e inversión a mediano plazo con rendimiento garantizado.',
  '["12.8% EA garantizado", "Sin comisiones", "Renovación automática",
    "Monto desde $1.000.000 COP", "Certificado digital inmediato"]',
  null,
  '["basic", "premium", "all"]',
  '{"product_code": "CDT-365", "min_amount_cop": 1000000, "term_days": 365, "rate_ea": 0.128}'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Tarjeta de crédito Oro XYZ',
  'Tarjeta de crédito Mastercard Oro con cupo desde $3.000.000 COP.
Acumula millas Latam Pass por cada compra. Sin cuota de manejo el primer año.
Tasa del 27.68% EA. Avances de efectivo disponibles. Cuotas sin interés en
comercios aliados. Seguro de compras incluido.',
  '["Acumula millas Latam Pass", "Sin cuota el primer año",
    "Cuotas sin interés en aliados", "Seguro de compras incluido",
    "Cupo hasta 5x el ingreso mensual"]',
  28900,
  '["premium", "gold"]',
  '{"product_code": "TC-ORO-001", "min_income_cop": 3000000, "annual_fee_cop": 346800, "rate_ea": 0.2768}'
);


-- ============================================================
-- SECCIÓN 7 — End user de prueba
-- ============================================================

INSERT INTO end_users (id, tenant_id, external_id, channel_ids, profile, consent_given)
VALUES (
  'a9b8c7d6-e5f4-3210-abcd-ef0987654321',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'CLI-TEST-001',
  '{"whatsapp": "+573001234567", "email": "cliente.prueba@email.com"}',
  '{
    "name": "Carlos Prueba",
    "segment": "premium",
    "account_status": "active",
    "risk_level": "standard",
    "identity_verified": true,
    "products": ["Cuenta Digital XYZ", "CDT Digital 365 días"],
    "income_cop": 5500000
  }',
  true
)
ON CONFLICT (tenant_id, external_id) DO UPDATE SET
  profile     = EXCLUDED.profile,
  channel_ids = EXCLUDED.channel_ids;


-- ============================================================
-- PASO MANUAL REQUERIDO — Crear superadmin de Cricket
-- ============================================================
-- El superadmin necesita primero un usuario en Supabase Auth.
-- No se puede crear directamente con SQL sin conocer el UUID del usuario.
--
-- Pasos:
-- 1. Ir a Supabase Dashboard → Authentication → Users → Add user
-- 2. Email: admin@mycricket.ai | Password: (segura)
-- 3. Copiar el UUID del usuario creado
-- 4. Ejecutar este SQL reemplazando TU_UUID:
--
--    INSERT INTO superadmins (id, email, full_name)
--    VALUES ('TU_UUID', 'admin@mycricket.ai', 'Admin Cricket')
--    ON CONFLICT (id) DO NOTHING;
--
-- ============================================================
-- Para verificar que el seed se aplicó correctamente:
-- SELECT name, slug, sector FROM tenants WHERE slug = 'banco-xyz';
-- SELECT module_type, is_active FROM tenant_modules
--   WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
-- SELECT COUNT(*) FROM knowledge_base
--   WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
-- ============================================================


-- ============================================================
-- VERIFICACIÓN — Ejecutar para confirmar el seed
-- ============================================================

SELECT name, slug, sector FROM tenants WHERE slug = 'banco-xyz';

SELECT module_type, is_active FROM tenant_modules
  WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  ORDER BY module_type;

SELECT COUNT(*) AS knowledge_base_entries FROM knowledge_base
  WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

SELECT COUNT(*) AS products FROM products
  WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
