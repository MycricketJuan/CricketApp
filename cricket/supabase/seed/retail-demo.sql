-- ============================================================
-- Cricket — Retail Demo Seed
-- Tenant: Moda XYZ  |  Sector: retail
-- Aplicar en: Supabase SQL Editor → Run
-- Ejecutar después de cricket_001_initial_schema.sql
-- ============================================================
--
-- UUIDs fijos:
-- TENANT_ID:   'b2c00000-0000-0000-0000-000000000001'
-- TEMPLATE_ID: 'b2c00000-0002-0000-0000-000000000001'
-- MOD_CONSULTATION: 'b2c00000-0001-0000-0000-000000000001'
-- MOD_SALES:        'b2c00000-0001-0000-0000-000000000002'
-- MOD_TRANSACTIONS: 'b2c00000-0001-0000-0000-000000000003'
-- MOD_FEEDBACK:     'b2c00000-0001-0000-0000-000000000004'
-- END_USER_ID: 'b2c00000-0003-0000-0000-000000000001'

-- ── 1. Tenant ────────────────────────────────────────────────
INSERT INTO tenants (id, name, slug, sector, ih_policies)
VALUES (
  'b2c00000-0000-0000-0000-000000000001',
  'Moda XYZ',
  'moda-xyz',
  'retail',
  '{
    "require_2fa_for_operators": false,
    "auto_escalate_below_confidence": 0.55,
    "max_session_duration_hours": 24,
    "human_approval_required_for_payments": false,
    "auto_escalate_on_sentiment": ["angry"]
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Módulos ───────────────────────────────────────────────
INSERT INTO tenant_modules
  (id, tenant_id, module_type, is_active, fallback_type, config)
VALUES
  (
    'b2c00000-0001-0000-0000-000000000001',
    'b2c00000-0000-0000-0000-000000000001',
    'consultation', true, 'ih_handoff',
    '{"max_turns": 10, "confidence_threshold": 0.55}'::jsonb
  ),
  (
    'b2c00000-0001-0000-0000-000000000002',
    'b2c00000-0000-0000-0000-000000000001',
    'sales', true, 'ih_handoff',
    '{"max_turns": 8, "confidence_threshold": 0.60}'::jsonb
  ),
  (
    'b2c00000-0001-0000-0000-000000000003',
    'b2c00000-0000-0000-0000-000000000001',
    'transactions', true, 'ih_handoff',
    '{"max_turns": 6, "confidence_threshold": 0.65, "autoApproveMaxAmountCop": 500000}'::jsonb
  ),
  (
    'b2c00000-0001-0000-0000-000000000004',
    'b2c00000-0000-0000-0000-000000000001',
    'feedback', true, 'skip',
    '{"max_turns": 4, "confidence_threshold": 0.50}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ── 3. Journey Template ──────────────────────────────────────
INSERT INTO journey_templates
  (id, tenant_id, sector, name, stages_config, ih_checkpoints, is_active, is_default)
VALUES (
  'b2c00000-0002-0000-0000-000000000001',
  'b2c00000-0000-0000-0000-000000000001',
  'retail',
  'Journey Retail Estándar',
  '[
    {
      "order": 1, "stage_type": "consultation", "is_active": true,
      "agent": "consultation_agent", "fallback": null, "ih_checkpoint": false,
      "description": "Consultas sobre productos, tallas, envíos y políticas de devolución"
    },
    {
      "order": 2, "stage_type": "sales", "is_active": true,
      "agent": "sales_agent", "fallback": null, "ih_checkpoint": false,
      "description": "Upsell, cross-sell, recuperación de carrito y promociones activas"
    },
    {
      "order": 3, "stage_type": "transactions", "is_active": true,
      "agent": "transactions_agent", "fallback": "ih_handoff", "ih_checkpoint": false,
      "description": "Devoluciones, cambios, reembolsos y modificaciones de pedido"
    },
    {
      "order": 4, "stage_type": "feedback", "is_active": true,
      "agent": "feedback_agent", "fallback": "skip", "ih_checkpoint": false,
      "description": "NPS y CSAT post-compra o post-resolución"
    }
  ]'::jsonb,
  '[
    {
      "trigger": "refund_above_threshold",
      "action": "require_supervisor_approval",
      "description": "Reembolsos sobre 500.000 COP requieren aprobación del supervisor",
      "amount_cop": 500000
    },
    {
      "trigger": "damaged_goods_claim",
      "action": "require_supervisor_approval",
      "description": "Reclamos por producto dañado siempre requieren revisión humana"
    },
    {
      "trigger": "bulk_return",
      "action": "require_supervisor_approval",
      "description": "Devoluciones de más de 5 unidades requieren validación manual"
    },
    {
      "trigger": "fraud_suspicion",
      "action": "escalate_immediately",
      "description": "Patrones de fraude escalan sin esperar intervención del agente"
    }
  ]'::jsonb,
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

-- ── 4. Knowledge Base ────────────────────────────────────────
INSERT INTO knowledge_base (tenant_id, title, content, metadata)
VALUES

(
  'b2c00000-0000-0000-0000-000000000001',
  'Guía de tallas — Pantalones y camisas',
  'PANTALONES: XS cintura 60-64 cm | S 64-68 cm | M 68-72 cm | L 72-76 cm | XL 76-80 cm | XXL 80-86 cm. '
  'CAMISAS (pecho): XS 80-84 cm | S 84-88 cm | M 88-92 cm | L 92-96 cm | XL 96-100 cm | XXL 100-106 cm. '
  'Si estás entre dos tallas, elige la más grande para mayor comodidad. '
  'Para tallas numéricas de pantalón: talla 28 equivale a S, 30 a M, 32 a L, 34 a XL, 36 a XXL.',
  '{"category": "tallas", "tags": ["tallas", "medidas", "guia"]}'::jsonb
),

(
  'b2c00000-0000-0000-0000-000000000001',
  'Política de devoluciones',
  'Plazo: 30 días calendario desde la fecha de compra. '
  'Condiciones: producto sin usar, con etiquetas originales y en empaque original. '
  'Exclusiones: ropa interior, trajes de baño y artículos en liquidación final no admiten devolución (solo por defecto de fabricación). '
  'Proceso: el cliente genera la etiqueta prepagada en el portal, empaca y entrega en punto Coordinadora o Servientrega. '
  'Reembolso: se procesa en 3-5 días hábiles al método de pago original. '
  'Cambios de talla o color: disponibles durante los mismos 30 días, sujeto a disponibilidad de stock.',
  '{"category": "devoluciones", "tags": ["devolucion", "reembolso", "cambio", "politica"]}'::jsonb
),

(
  'b2c00000-0000-0000-0000-000000000001',
  'Tiempos y costos de envío',
  'Bogotá y área metropolitana: 1-2 días hábiles, gratis en compras desde $150.000 COP. '
  'Nacional (ciudades principales): 3-5 días hábiles, gratis desde $200.000 COP o $12.000 COP en compras menores. '
  'Nacional (municipios): 5-8 días hábiles, $15.000 COP. '
  'Express (solo Bogotá, Medellín, Cali): mismo día para pedidos antes de las 12m, $22.000 COP. '
  'El link de tracking se envía por email al confirmar el despacho. '
  'Si el pedido no llega en el plazo prometido, contactar soporte con el número de orden.',
  '{"category": "envios", "tags": ["envio", "entrega", "tracking", "plazo"]}'::jsonb
),

(
  'b2c00000-0000-0000-0000-000000000001',
  'Métodos de pago aceptados',
  'Tarjetas: Visa, Mastercard, American Express (débito y crédito). '
  'PSE: débito directo desde cuenta bancaria colombiana. '
  'Efectivo: Efecty y Baloto, pago válido por 24 horas. '
  'Contraentrega: disponible en Bogotá, Medellín, Cali y Barranquilla para pedidos hasta $300.000 COP. '
  'Cuotas sin interés: 3, 6 o 12 cuotas con Visa y Mastercard en compras desde $200.000 COP (según banco emisor). '
  'Cupones y crédito de tienda: ingresar en el campo "código de descuento" al finalizar la compra.',
  '{"category": "pagos", "tags": ["pago", "tarjeta", "PSE", "cuotas", "efectivo"]}'::jsonb
),

(
  'b2c00000-0000-0000-0000-000000000001',
  'Programa de lealtad Moda XYZ Puntos',
  'Acumulación: 1 punto por cada $1.000 COP en compras. '
  'Redención: 500 puntos = $5.000 COP de descuento. Mínimo de redención: 500 puntos. '
  'Vigencia: los puntos vencen a los 12 meses sin actividad en la cuenta. '
  'Bonos especiales: 200 puntos al registrarse, 100 puntos en el mes del cumpleaños. '
  'Los puntos no aplican en productos con descuento mayor al 50% ni en gastos de envío. '
  'Consultar saldo: en "Mi cuenta → Mis puntos" en el sitio web o app.',
  '{"category": "lealtad", "tags": ["puntos", "lealtad", "descuento", "beneficios"]}'::jsonb
),

(
  'b2c00000-0000-0000-0000-000000000001',
  'Cuidado y mantenimiento de prendas',
  'ALGODÓN: lavar a máquina 30°C ciclo delicado o a mano con agua fría. Secar extendido. Planchar temperatura media. '
  'DENIM (jeans): lavar al revés en agua fría para preservar el color. Evitar secadora. '
  'LANA Y MEZCLAS: lavado a mano o en bolsa de malla en ciclo lana 20°C. Secar horizontal. '
  'SINTÉTICOS (poliéster, nylon): lavar a 30°C. Evitar altas temperaturas al planchar. '
  'GENERAL: separar colores oscuros y claros en el primer lavado. '
  'Revisar siempre la etiqueta interior de la prenda para instrucciones específicas del fabricante.',
  '{"category": "cuidado", "tags": ["lavado", "cuidado", "mantenimiento", "instrucciones"]}'::jsonb
),

(
  'b2c00000-0000-0000-0000-000000000001',
  'Proceso de cambio de talla paso a paso',
  'Paso 1: Contactar soporte dentro de los 30 días desde la compra con el número de orden. '
  'Paso 2: El agente verifica disponibilidad de la talla deseada. '
  'Paso 3: Si hay stock, se genera etiqueta prepagada de devolución por email. '
  'Paso 4: Empacar la prenda en buen estado con etiquetas intactas y entregar en punto logístico. '
  'Paso 5: Al recibir la devolución (3-5 días hábiles), se despacha la nueva talla. '
  'Sin costo adicional si el precio es el mismo. Si la nueva talla tiene mayor precio, se cobra la diferencia. '
  'Si no hay stock de la talla solicitada, se ofrece reembolso o crédito de tienda.',
  '{"category": "cambios", "tags": ["cambio", "talla", "proceso", "intercambio"]}'::jsonb
),

(
  'b2c00000-0000-0000-0000-000000000001',
  'Promociones y descuentos frecuentes',
  'Descuento de bienvenida: 10% en la primera compra con código BIENVENIDO10 (una sola vez por cuenta). '
  'Martes de descuento: 15% adicional pagando con cualquier tarjeta de crédito los días martes. '
  'Compra 2 lleva 3: aplica en camisetas básicas y calcetines todo el año (el de menor precio es gratis). '
  'Descuento cumpleaños: 10% durante el mes de cumpleaños (registrar fecha en perfil). '
  'Liquidación de temporada: enero y julio, hasta 60% en colecciones anteriores. '
  'Los descuentos no son acumulables entre sí, salvo indicación expresa en la promoción. '
  'Los cupones se ingresan en el carrito antes de finalizar la compra.',
  '{"category": "promociones", "tags": ["descuento", "promocion", "cupon", "oferta"]}'::jsonb
),

(
  'b2c00000-0000-0000-0000-000000000001',
  'Rastreo y seguimiento de pedidos',
  'Al confirmar el despacho, recibirás un email con el link de tracking de la transportadora. '
  'Estados del pedido: Procesando → Empacado → Despachado → En ciudad → Entregado. '
  'Si el link de tracking no muestra movimiento después de 48 horas del despacho, contactar soporte. '
  'Para pedidos con Coordinadora: rastreo en coordinadora.com.co con el número de guía del email. '
  'Para pedidos con Servientrega: rastreo en servientrega.com.co. '
  'Intento de entrega fallido: el courier deja aviso y reintenta al día hábil siguiente. '
  'Después de 2 intentos fallidos, el paquete regresa al almacén y se coordina nueva entrega.',
  '{"category": "tracking", "tags": ["tracking", "pedido", "seguimiento", "entrega", "rastreo"]}'::jsonb
),

(
  'b2c00000-0000-0000-0000-000000000001',
  'Garantía de calidad por defectos de fabricación',
  'Cobertura: 90 días desde la compra para defectos de fabricación (costuras defectuosas, cremalleras, decoloración anormal). '
  'No cubre: daño por mal uso, lavado incorrecto según la etiqueta, desgaste normal por uso. '
  'Cómo reclamar: enviar foto del defecto y número de orden a soporte. El equipo responde en 24-48 horas hábiles. '
  'Solución: según el caso, se ofrece reparación, reemplazo por el mismo producto o reembolso completo. '
  'Si el producto ya no está disponible, se ofrece crédito de tienda por el valor pagado. '
  'Para productos en liquidación: la garantía por defecto de fabricación sigue vigente en los mismos términos.',
  '{"category": "garantia", "tags": ["garantia", "defecto", "calidad", "reclamo"]}'::jsonb
);

-- ── 5. Productos ─────────────────────────────────────────────
INSERT INTO products
  (tenant_id, name, description, price, features, segments, metadata)
VALUES

(
  'b2c00000-0000-0000-0000-000000000001',
  'Jeans Clásico Slim',
  'Jean de corte slim en denim 100% algodón de 12 oz. Disponible en índigo, negro y azul oscuro. Tallas 28-36 (cintura en pulgadas).',
  89900,
  '["Denim 100% algodón", "Corte slim", "5 bolsillos", "Cierre YKK", "Colores: índigo, negro, azul oscuro"]'::jsonb,
  '["all"]'::jsonb,
  '{
    "tallas": ["28", "30", "32", "34", "36"],
    "colores": ["indigo", "negro", "azul oscuro"],
    "cuidado": "Lavar al revés en agua fría",
    "sku_prefix": "JE-SLIM"
  }'::jsonb
),

(
  'b2c00000-0000-0000-0000-000000000001',
  'Camisa Oxford Premium',
  'Camisa oxford en algodón peinado 100%. Cuello button-down, puños con doble botón. Perfecta para look smart casual o formal. Tallas S-XXL.',
  129900,
  '["Algodón peinado 100%", "Cuello button-down", "Puños ajustables", "Colores: blanco, azul cielo, verde oliva"]'::jsonb,
  '["premium"]'::jsonb,
  '{
    "tallas": ["S", "M", "L", "XL", "XXL"],
    "colores": ["blanco", "azul cielo", "verde oliva"],
    "cuidado": "Planchar temperatura media, lavar a 30°C",
    "sku_prefix": "CA-OXF"
  }'::jsonb
),

(
  'b2c00000-0000-0000-0000-000000000001',
  'Bundle Jeans + Camisa Oxford',
  'Combinación perfecta: Jeans Clásico Slim + Camisa Oxford Premium. Ahorra $29.900 COP vs compra individual. Elige talla para cada prenda.',
  189900,
  '["Incluye Jeans Clásico Slim + Camisa Oxford Premium", "Ahorro de $29.900 COP", "Talla independiente por prenda"]'::jsonb,
  '["premium", "bundle"]'::jsonb,
  '{
    "incluye": ["Jeans Clásico Slim", "Camisa Oxford Premium"],
    "ahorro_cop": 29900,
    "disponibilidad": "Sujeto a stock de ambas prendas",
    "sku_prefix": "BU-JC"
  }'::jsonb
);

-- ── 6. End User de prueba ────────────────────────────────────
INSERT INTO end_users
  (id, tenant_id, external_id, channel_ids, profile, consent_given)
VALUES (
  'b2c00000-0003-0000-0000-000000000001',
  'b2c00000-0000-0000-0000-000000000001',
  'moda-xyz-web-001',
  '{"web_chat": "moda-xyz-web-001"}'::jsonb,
  '{
    "name": "Valentina Ríos",
    "talla_pantalon": "M",
    "talla_camisa": "S",
    "loyalty_points": 1250,
    "last_order": "ORD-2024-98765",
    "last_order_status": "entregado",
    "account_status": "active",
    "identity_verified": true,
    "risk_level": "standard",
    "products": ["jeans", "camisa"]
  }'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;

-- ── 7. Verificación ──────────────────────────────────────────
DO $$
DECLARE
  v_tenant   int;
  v_modules  int;
  v_template int;
  v_kb       int;
  v_products int;
  v_users    int;
BEGIN
  SELECT COUNT(*) INTO v_tenant   FROM tenants          WHERE id = 'b2c00000-0000-0000-0000-000000000001';
  SELECT COUNT(*) INTO v_modules  FROM tenant_modules   WHERE tenant_id = 'b2c00000-0000-0000-0000-000000000001';
  SELECT COUNT(*) INTO v_template FROM journey_templates WHERE tenant_id = 'b2c00000-0000-0000-0000-000000000001';
  SELECT COUNT(*) INTO v_kb       FROM knowledge_base   WHERE tenant_id = 'b2c00000-0000-0000-0000-000000000001';
  SELECT COUNT(*) INTO v_products FROM products         WHERE tenant_id = 'b2c00000-0000-0000-0000-000000000001';
  SELECT COUNT(*) INTO v_users    FROM end_users        WHERE tenant_id = 'b2c00000-0000-0000-0000-000000000001';

  RAISE NOTICE '=== Retail Demo Seed — Moda XYZ ===';
  RAISE NOTICE 'Tenant:          %/1', v_tenant;
  RAISE NOTICE 'Módulos:         %/4', v_modules;
  RAISE NOTICE 'Journey template:%/1', v_template;
  RAISE NOTICE 'Knowledge base:  %/10', v_kb;
  RAISE NOTICE 'Productos:       %/3', v_products;
  RAISE NOTICE 'End users:       %/1', v_users;
END $$;
