-- ============================================================
-- Cricket — Retail Demo Seed
-- Tenant: Moda XYZ  |  Sector: retail
-- ============================================================

-- ── 0. UUIDs fijos ───────────────────────────────────────────
-- Tenant
\set tenant_id       '''b2c00000-0000-0000-0000-000000000001'''
-- Módulos
\set mod_consultation '''b2c00000-0001-0000-0000-000000000001'''
\set mod_sales        '''b2c00000-0001-0000-0000-000000000002'''
\set mod_transactions '''b2c00000-0001-0000-0000-000000000003'''
\set mod_feedback     '''b2c00000-0001-0000-0000-000000000004'''
-- Journey template
\set template_id     '''b2c00000-0002-0000-0000-000000000001'''
-- End user
\set end_user_id     '''b2c00000-0003-0000-0000-000000000001'''

-- ── 1. Tenant ────────────────────────────────────────────────
INSERT INTO tenants (id, name, slug, sector, ih_policies, status)
VALUES (
  :tenant_id,
  'Moda XYZ',
  'moda-xyz',
  'retail',
  '{
    "require_2fa_for_operators": false,
    "auto_escalate_below_confidence": 0.55,
    "max_session_duration_hours": 2,
    "human_approval_required_for_payments": true,
    "auto_escalate_on_sentiment": ["angry", "frustrated", "very_negative"]
  }'::jsonb,
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Módulos ───────────────────────────────────────────────
INSERT INTO tenant_modules
  (id, tenant_id, module_type, is_active, fallback_type, config)
VALUES
  (
    :mod_consultation, :tenant_id, 'consultation', true, 'ih_handoff',
    '{
      "max_turns": 10,
      "confidence_threshold": 0.55
    }'::jsonb
  ),
  (
    :mod_sales, :tenant_id, 'sales', true, 'ih_handoff',
    '{
      "max_turns": 8,
      "confidence_threshold": 0.60
    }'::jsonb
  ),
  (
    :mod_transactions, :tenant_id, 'transactions', true, 'ih_handoff',
    '{
      "max_turns": 6,
      "confidence_threshold": 0.65
    }'::jsonb
  ),
  (
    :mod_feedback, :tenant_id, 'feedback', true, 'skip',
    '{
      "max_turns": 4,
      "confidence_threshold": 0.50
    }'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ── 3. Journey Template ──────────────────────────────────────
INSERT INTO journey_templates (id, tenant_id, name, stages_config, ih_checkpoints, is_default)
VALUES (
  :template_id,
  :tenant_id,
  'Journey Retail Estándar',
  '[
    {
      "order": 1,
      "stage_type": "consultation",
      "is_active": true,
      "agent": "consultation_agent",
      "fallback": null,
      "ih_checkpoint": false,
      "description": "Consultas sobre productos, tallas, envíos y políticas de devolución"
    },
    {
      "order": 2,
      "stage_type": "sales",
      "is_active": true,
      "agent": "sales_agent",
      "fallback": null,
      "ih_checkpoint": false,
      "description": "Upsell, cross-sell, recuperación de carrito y promociones activas"
    },
    {
      "order": 3,
      "stage_type": "transactions",
      "is_active": true,
      "agent": "transactions_agent",
      "fallback": "ih_handoff",
      "ih_checkpoint": false,
      "description": "Devoluciones, cambios, reembolsos y modificaciones de pedido"
    },
    {
      "order": 4,
      "stage_type": "feedback",
      "is_active": true,
      "agent": "feedback_agent",
      "fallback": "skip",
      "ih_checkpoint": false,
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
  true
)
ON CONFLICT (id) DO NOTHING;

-- ── 4. Knowledge Base ────────────────────────────────────────
-- Tabla: knowledge_base (tenant_id, title, content, category, tags)
INSERT INTO knowledge_base (tenant_id, title, content, category, tags)
VALUES

-- Tallas
(
  :tenant_id,
  'Guía de tallas — Pantalones',
  'Talla XS: cintura 60-64 cm, cadera 86-90 cm. '
  'Talla S: cintura 64-68 cm, cadera 90-94 cm. '
  'Talla M: cintura 68-72 cm, cadera 94-98 cm. '
  'Talla L: cintura 72-76 cm, cadera 98-102 cm. '
  'Talla XL: cintura 76-80 cm, cadera 102-106 cm. '
  'Talla XXL: cintura 80-86 cm, cadera 106-112 cm. '
  'Si estás entre dos tallas, elige la más grande para mayor comodidad.',
  'tallas',
  ARRAY['tallas', 'pantalones', 'guia', 'medidas']
),

-- Devoluciones
(
  :tenant_id,
  'Política de devoluciones',
  'Aceptamos devoluciones hasta 30 días calendario desde la fecha de compra. '
  'Condiciones: producto sin usar, con todas las etiquetas originales, en empaque original. '
  'Excepciones: ropa interior, trajes de baño y artículos en liquidación no tienen devolución. '
  'Para iniciar una devolución, el cliente debe proporcionar el número de orden. '
  'El reembolso se procesa a la tarjeta original en 5-10 días hábiles.',
  'devoluciones',
  ARRAY['devoluciones', 'reembolso', 'politica', 'retorno']
),

-- Envíos
(
  :tenant_id,
  'Tiempos y costos de envío',
  'Envío estándar: 3-5 días hábiles, gratis en compras desde $150.000 COP, $12.000 COP en compras menores. '
  'Envío express: 1-2 días hábiles, $25.000 COP sin mínimo de compra. '
  'Envío a domicilio mismo día (Bogotá, Medellín, Cali): disponible para pedidos antes de las 12pm, $18.000 COP. '
  'El seguimiento del pedido se puede consultar con el número de orden en la sección "Mis pedidos".',
  'envios',
  ARRAY['envio', 'entrega', 'tiempos', 'costos', 'tracking']
),

-- Pagos
(
  :tenant_id,
  'Métodos de pago aceptados',
  'Tarjetas débito y crédito: Visa, Mastercard, American Express. '
  'PSE — débito directo a cuenta bancaria. '
  'Efecty y Baloto — pago en efectivo en puntos autorizados (válido 24 horas). '
  'Contraentrega — disponible solo para pedidos hasta $300.000 COP en ciudades principales. '
  'Cuotas sin interés: disponible con tarjetas Visa y Mastercard en compras desde $200.000 COP (3, 6 o 12 cuotas según el banco).',
  'pagos',
  ARRAY['pago', 'tarjeta', 'PSE', 'efecty', 'cuotas']
),

-- Lealtad
(
  :tenant_id,
  'Programa de lealtad Moda XYZ Puntos',
  'Acumulas 1 punto por cada $1.000 COP en compras. '
  '500 puntos = $5.000 COP de descuento en tu próxima compra. '
  'Los puntos vencen a los 12 meses sin actividad. '
  'Bonus de bienvenida: 200 puntos al registrarte. '
  'Bonus de cumpleaños: 100 puntos adicionales en el mes de tu cumpleaños. '
  'Los puntos no aplican en productos con descuento mayor al 50%.',
  'lealtad',
  ARRAY['lealtad', 'puntos', 'descuento', 'beneficios', 'recompensas']
),

-- Cuidado de prendas
(
  :tenant_id,
  'Guía de cuidado de prendas de algodón',
  'Lavado: máquina a 30°C en ciclo delicado, o a mano con agua fría. '
  'Detergente: suave, sin blanqueador a menos que la etiqueta lo indique. '
  'Secado: extender horizontalmente o colgar. Evitar secadora para preservar la forma. '
  'Planchado: temperatura media (símbolo de dos puntos). Planchar al revés para colores oscuros. '
  'Almacenamiento: doblar y guardar en lugar fresco y seco. Evitar colgado prolongado para prendas pesadas.',
  'cuidado',
  ARRAY['cuidado', 'lavado', 'mantenimiento', 'algodon', 'instrucciones']
),

-- Cambio de talla
(
  :tenant_id,
  'Proceso de cambio de talla',
  'Puedes solicitar un cambio de talla dentro de los 30 días de compra. '
  'Condiciones: prenda sin uso, con etiquetas originales. '
  'Disponibilidad: el cambio depende del stock de la talla solicitada. '
  'Si no hay stock disponible, ofrecemos reembolso completo o crédito a favor. '
  'Sin costo adicional por el cambio si el precio es igual. '
  'Si la nueva talla tiene mayor precio, se cobra la diferencia.',
  'cambios',
  ARRAY['cambio', 'talla', 'intercambio', 'stock', 'disponibilidad']
),

-- Promociones
(
  :tenant_id,
  'Promociones y descuentos vigentes',
  'Black Weekend (último viernes de noviembre): hasta 50% en toda la tienda. '
  'Temporada de liquidación (enero y julio): descuentos del 30-70% en colecciones anteriores. '
  'Martes de descuento: 15% adicional en compras con tarjeta de crédito. '
  'Descuento de cumpleaños: 10% en el mes de tu cumpleaños (registrar fecha en perfil). '
  'Compra 2 lleva 3: aplica en camisetas básicas y calcetines durante todo el año. '
  'Los descuentos no son acumulables entre sí salvo indicación expresa.',
  'promociones',
  ARRAY['promociones', 'descuentos', 'ofertas', 'temporada', 'black friday']
),

-- Tracking de pedido
(
  :tenant_id,
  'Seguimiento de pedidos',
  'Estado "Procesando": el pago fue confirmado y el pedido está en preparación (1-2 horas). '
  'Estado "Empacado": listo para salir del almacén. '
  'Estado "En camino": el courier recogió el paquete. Incluye enlace de tracking. '
  'Estado "En ciudad": el paquete está en la ciudad destino. '
  'Estado "Entregado": confirmación de entrega con firma o foto. '
  'En caso de no estar en casa, el courier dejará aviso y reintentará al día siguiente.',
  'tracking',
  ARRAY['tracking', 'pedido', 'seguimiento', 'estado', 'entrega', 'courier']
),

-- Garantía
(
  :tenant_id,
  'Garantía por defectos de fabricación',
  'Todos nuestros productos tienen garantía de 90 días por defectos de fabricación. '
  'Cubre: costuras rotas, cremalleras defectuosas, decoloración prematura (sin mal uso). '
  'No cubre: daños por mal uso, lavado incorrecto, o desgaste normal. '
  'Para reclamar: contactar soporte con foto del defecto y número de orden. '
  'Solución: reparación, reemplazo del producto o reembolso (a criterio de Moda XYZ). '
  'Tiempo de resolución: 5-10 días hábiles desde la aprobación del reclamo.',
  'garantia',
  ARRAY['garantia', 'defecto', 'fabricacion', 'reclamo', 'calidad']
);

-- ── 5. Productos ─────────────────────────────────────────────
-- Tabla: products (tenant_id, name, description, price_cop, category, metadata)
INSERT INTO products (tenant_id, name, description, price_cop, category, metadata)
VALUES

(
  :tenant_id,
  'Jeans Slim Fit Premium',
  'Jean de corte slim en denim 100% algodón de 12 oz. '
  'Disponible en índigo clásico, negro y azul oscuro. '
  'Tallas XS a XXL. '
  'Diseño versátil para uso diario y ocasiones casuales formales.',
  129900,
  'pantalones',
  '{
    "material": "100% algodón denim 12 oz",
    "colores": ["indigo", "negro", "azul oscuro"],
    "tallas": ["XS", "S", "M", "L", "XL", "XXL"],
    "cuidado": "Lavar a 30°C al revés",
    "origen": "Colombia",
    "sku_prefix": "JE-SLIM"
  }'::jsonb
),

(
  :tenant_id,
  'Camisa Oxford Regular Fit',
  'Camisa oxford en algodón peinado 100%. '
  'Cuello button-down, puños ajustables. '
  'Disponible en blanco, azul cielo y verde oliva. '
  'Ideal para oficina o look smart casual.',
  89900,
  'camisas',
  '{
    "material": "100% algodón peinado",
    "colores": ["blanco", "azul cielo", "verde oliva"],
    "tallas": ["XS", "S", "M", "L", "XL", "XXL"],
    "cuidado": "Planchar temperatura media",
    "origen": "Colombia",
    "sku_prefix": "CA-OXF"
  }'::jsonb
),

(
  :tenant_id,
  'Bundle Verano — Jean + Camisa',
  'Combinación perfecta para el verano: Jeans Slim Fit Premium + Camisa Oxford Regular Fit. '
  'Ahorra $30.000 COP vs compra individual. '
  'Elige talla para cada prenda al momento de la compra.',
  189900,
  'bundles',
  '{
    "incluye": ["Jeans Slim Fit Premium", "Camisa Oxford Regular Fit"],
    "ahorro_cop": 30000,
    "tallas": ["XS", "S", "M", "L", "XL", "XXL"],
    "disponibilidad": "sujeto a stock de ambas prendas",
    "sku_prefix": "BU-VER"
  }'::jsonb
);

-- ── 6. End User de prueba ────────────────────────────────────
INSERT INTO end_users (
  id, tenant_id, channel, channel_identifier,
  consent_given, metadata
)
VALUES (
  :end_user_id,
  :tenant_id,
  'web_chat',
  'moda-xyz-web-001',
  true,
  '{
    "name": "Valentina Ríos",
    "talla_pantalon": "M",
    "talla_camisa": "S",
    "loyalty_points": 1250,
    "last_order": "ORD-2024-98765",
    "last_order_date": "2024-11-15",
    "account_status": "active",
    "identity_verified": true,
    "risk_level": "standard",
    "products": ["jeans", "camisa"]
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ── 7. Verificación ──────────────────────────────────────────
DO $$
DECLARE
  v_tenant_count     int;
  v_modules_count    int;
  v_template_count   int;
  v_kb_count         int;
  v_products_count   int;
  v_users_count      int;
BEGIN
  SELECT COUNT(*) INTO v_tenant_count     FROM tenants          WHERE slug = 'moda-xyz';
  SELECT COUNT(*) INTO v_modules_count    FROM tenant_modules    WHERE tenant_id = 'b2c00000-0000-0000-0000-000000000001'::uuid;
  SELECT COUNT(*) INTO v_template_count   FROM journey_templates WHERE tenant_id = 'b2c00000-0000-0000-0000-000000000001'::uuid;
  SELECT COUNT(*) INTO v_kb_count         FROM knowledge_base    WHERE tenant_id = 'b2c00000-0000-0000-0000-000000000001'::uuid;
  SELECT COUNT(*) INTO v_products_count   FROM products          WHERE tenant_id = 'b2c00000-0000-0000-0000-000000000001'::uuid;
  SELECT COUNT(*) INTO v_users_count      FROM end_users         WHERE tenant_id = 'b2c00000-0000-0000-0000-000000000001'::uuid;

  RAISE NOTICE '=== Retail Demo Seed Verification ===';
  RAISE NOTICE 'Tenant Moda XYZ:    %/1', v_tenant_count;
  RAISE NOTICE 'Módulos:            %/4', v_modules_count;
  RAISE NOTICE 'Journey template:   %/1', v_template_count;
  RAISE NOTICE 'Knowledge base:     %/10', v_kb_count;
  RAISE NOTICE 'Products:           %/3', v_products_count;
  RAISE NOTICE 'End users:          %/1', v_users_count;
END $$;
