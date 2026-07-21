---
spec: true
title: "Cricket — Fase 1: IA + IH para PYMES"
version: "1.0"
status: "draft"
date: "2026-01-01"
author: "Juan (founder)"
segments: ["banking", "retail", "health"]
timeline: "3 meses"
---

# Cricket — Fase 1: IA + IH para PYMES
**Versión 1.0 · Estado: Draft · Enero 2026**

---

## 1. Resumen ejecutivo

Cricket es una plataforma SaaS multi-tenant que implementa agentes IA para gestionar
el customer journey completo de una empresa. El principio central es **IA + IH
(Inteligencia Artificial + Inteligencia Humana)**: la IA actúa primero, el humano
siempre puede ver, intervenir y controlar cada decisión.

La **Fase 1** lanza Cricket al mercado atacando tres segmentos de PYMES en
**1-3 meses**, con **WhatsApp como canal principal** y **onboarding self-service**.

### Objetivo principal de la Fase 1
> Lograr clientes activos pagando en los tres segmentos.
> Meta: **3 clientes al mes 1 | 9 al mes 2 | 15 al mes 3**

---

## 2. Problema que resuelve Cricket

### Para las PYMES
Las pequeñas y medianas empresas tienen los mismos problemas de atención al cliente
que las grandes corporaciones, pero sin el presupuesto ni el equipo para resolverlos:

- **Atención limitada:** solo pueden atender en horario laboral
- **Escala manual:** cada conversación requiere una persona
- **Sin datos:** no saben cuántos clientes tuvieron, qué preguntaron, cuánto tardaron
- **Fricción en el journey:** un cliente que pregunta por WhatsApp y no recibe respuesta
  rápida, compra con la competencia

### Por qué las soluciones actuales no funcionan para PYMES
- **Chatbots tradicionales:** rígidos, sin IA, no escalan bien, requieren programación
- **Agentes de IA genéricos:** sin contexto del negocio, sin principio IA+IH,
  sin dashboard para el operador humano
- **Grandes plataformas (Salesforce, Zendesk):** demasiado caras y complejas para PYMES

### La propuesta de Cricket
Una plataforma que una PYME puede configurar sola en menos de 2 horas, conectar
a su WhatsApp Business, y empezar a atender clientes con IA — con la tranquilidad
de que un humano siempre puede tomar el control.

---

## 3. Segmentos de la Fase 1

### 3.1 Banca (Banking)

**Perfil del cliente objetivo:**
- Cooperativas de ahorro y crédito
- Cajas de compensación familiar con cartera financiera
- Fondos de empleados
- Bancos pequeños y medianos (activos < USD 500M)

**Dolor principal:** Los clientes preguntan por WhatsApp fuera de horario,
los asesores no dan abasto, los trámites se demoran porque falta información.

**Journey completo con Cricket:**
```
Cliente WhatsApp → Consulta (tasas, requisitos) → Ventas (apertura de producto)
→ Transacciones (transferencias, pagos) → Trámites (solicitudes formales)
→ Feedback (NPS post-servicio)
```

**Módulos activos en Fase 1:**
| Módulo | Activo | Descripción |
|--------|--------|-------------|
| Consulta | ✅ | FAQs, tasas, requisitos, horarios |
| Ventas | ✅ | Captación y apertura de productos |
| Transacciones | ✅ | Transferencias con aprobación IH |
| Trámites | ✅ | Solicitudes formales (7 tipos) |
| Feedback | ✅ | NPS y CSAT post-interacción |

**Tipos de trámites bancarios disponibles:**
1. Apertura de cuenta de ahorros (SLA: 24h)
2. Solicitud de crédito personal (SLA: 72h)
3. Solicitud de tarjeta de crédito (SLA: 120h)
4. Actualización de datos personales (SLA: 24h)
5. Apertura de CDT (SLA: 8h)
6. Radicación de reclamación (SLA: 360h)
7. Certificado de paz y salvo (SLA: 72h)
8. Levantamiento de prenda (SLA: 120h)

**Detalle: Levantamiento de prenda**

Trámite para solicitar la liberación de una garantía prendaria sobre un bien
(vehículo, inmueble, maquinaria) una vez el crédito asociado ha sido cancelado.

```typescript
levantamiento_prenda: {
  label: 'Levantamiento de prenda',
  description: 'Liberar la prenda sobre un bien cuyo crédito ya fue cancelado',
  required_fields: [
    {
      key: 'tipo_bien',
      label: 'Tipo de bien',
      question: '¿Sobre qué bien necesitas el levantamiento? (vehículo, inmueble, maquinaria u otro)',
    },
    {
      key: 'identificacion_bien',
      label: 'Identificación del bien',
      question: '¿Cuál es la placa (vehículo), matrícula inmobiliaria (inmueble) o serial del bien?',
    },
    {
      key: 'numero_credito',
      label: 'Número de crédito',
      question: '¿Cuál es el número o referencia del crédito que tenía la prenda?',
    },
    {
      key: 'destino_documento',
      label: 'Entidad destino',
      question: '¿Para qué entidad necesitas el levantamiento? (Tránsito, notaría, cámara de comercio, otro)',
    },
    {
      key: 'medio_entrega',
      label: 'Medio de entrega',
      question: '¿Cómo prefieres recibir el documento? (email o en sucursal)',
    },
  ],
  documents_required: [
    { name: 'cedula', description: 'Cédula de ciudadanía del titular del crédito' },
    { name: 'paz_y_salvo', description: 'Paz y salvo del crédito cancelado (si ya lo tienes)' },
  ],
  sla_hours: 120,
  confirmation_message:
    'Tu solicitud de levantamiento de prenda fue radicada. El banco la procesará ' +
    'en máximo 5 días hábiles y recibirás el documento por el medio indicado. ' +
    'Si requieres apostille o autenticación notarial, indícalo al especialista asignado.',
}
```

Agregar a `TRAMITE_INTENT_MAPPING` en templates.ts:
```typescript
'levantar prenda':        'levantamiento_prenda',
'liberar prenda':         'levantamiento_prenda',
'cancelar prenda':        'levantamiento_prenda',
'prenda vehículo':        'levantamiento_prenda',
'certificado levantamiento': 'levantamiento_prenda',
```

**Políticas IH para banca (estrictas):**
- 2FA obligatorio para operadores
- Escalada automática si confianza < 65%
- Aprobación humana obligatoria para todos los pagos
- Escalada preventiva en sentimientos: frustrated, angry
- Cumplimiento SARLAFT: operaciones > $10M COP → revisión compliance

**KPI objetivo Banca:**
- Mes 1: 1 cliente activo
- Mes 2: 3 clientes activos
- Mes 3: 5 clientes activos

---

### 3.2 Retail

**Perfil del cliente objetivo:**
- Tiendas de ropa, calzado y accesorios
- Tiendas de electrodomésticos o tecnología
- Ferreterías y distribuidores
- E-commerce con operación en Colombia

**Dolor principal:** Los clientes preguntan por tallas, disponibilidad y envíos,
abandonan el carrito sin comprar, y las devoluciones se vuelven un caos.

**Journey completo con Cricket:**
```
Cliente WhatsApp → Consulta (producto, tallas, envío) → Ventas (upsell, cross-sell)
→ Transacciones (devoluciones, cambios, seguimiento) → Feedback (NPS post-compra)
```

**Módulos activos en Fase 1:**
| Módulo | Activo | Descripción |
|--------|--------|-------------|
| Consulta | ✅ | Productos, tallas, disponibilidad, envíos, devoluciones |
| Ventas | ✅ | Upsell, cross-sell, recuperación de carrito |
| Transacciones | ✅ | Devoluciones estándar sin IH (<$500k COP) |
| Trámites | ❌ | No aplica en Fase 1 para Retail |
| Feedback | ✅ | NPS y CSAT post-compra o post-resolución |

**Diferencia clave vs Banca:**
- Transacciones de Retail no siempre requieren IH (devoluciones < $500k COP)
- Umbral de escalada más bajo (confianza < 55% vs 65% en banca)
- Sin requisito de 2FA para operadores
- Aprobación IH solo para reembolsos > $500k, productos dañados y fraude

**Políticas IH para Retail (relajadas):**
- 2FA no requerido
- Escalada automática si confianza < 55%
- Escalada preventiva solo en sentimiento: angry (no frustrated)
- Transacciones auto-aprobadas hasta $500k COP sin checkpoint IH

**KPI objetivo Retail:**
- Mes 1: 1 cliente activo
- Mes 2: 3 clientes activos
- Mes 3: 5 clientes activos

---

### 3.3 Salud (Health)

**Perfil del cliente objetivo:**
- Consultorios médicos y odontológicos
- IPS (Instituciones Prestadoras de Salud) pequeñas
- Centros de estética y bienestar
- Laboratorios clínicos
- Farmacias independientes

**Dolor principal:** Los pacientes preguntan por disponibilidad de citas,
resultados y servicios por WhatsApp, los recepcionistas no dan abasto,
y los pacientes no regresan porque no hay seguimiento post-consulta.

**Journey completo con Cricket:**
```
Paciente WhatsApp → Consulta (servicios, especialistas, precios)
→ Citas (agendar, modificar, cancelar)
→ Feedback (NPS post-consulta)
```

**Módulos activos en Fase 1:**
| Módulo | Activo | Descripción |
|--------|--------|-------------|
| Consulta | ✅ | Servicios, especialistas, precios, seguros |
| Citas | ✅ | Agendar, confirmar, modificar, cancelar citas |
| Trámites | ✅ | Solicitudes formales (resultados, récords, remisiones) |
| Ventas | ❌ | No aplica en Fase 1 (no se venden servicios médicos agresivamente) |
| Feedback | ✅ | NPS y CSAT post-consulta |

**Tipos de trámites en Salud Fase 1:**
1. Solicitud de resultados de laboratorio (SLA: 4h)
2. Solicitud de récord médico (SLA: 72h)
3. Solicitud de remisión a especialista (SLA: 48h)
4. Solicitud de incapacidad (SLA: 24h)
5. Solicitud de fórmula médica repetida (SLA: 8h)

**Restricciones de privacidad para Salud:**
- El agente NUNCA almacena diagnósticos ni resultados médicos en collected_data
- Solo recopila: nombre, fecha de consulta, tipo de solicitud administrativa
- Los documentos médicos se solicitan al equipo, no al agente
- IH obligatorio para cualquier decisión clínica

**Políticas IH para Salud (estrictas):**
- 2FA obligatorio para operadores
- Escalada automática si confianza < 70%
- Escalada preventiva en sentimientos: frustrated, angry
- IH obligatorio para cualquier pregunta que implique consejo médico

**KPI objetivo Salud:**
- Mes 1: 1 cliente activo
- Mes 2: 3 clientes activos
- Mes 3: 5 clientes activos

---

## 4. Modelo de precios

### Estructura híbrida: base fija + variable por conversación

| Plan | Precio base | Conversaciones incluidas | Precio adicional |
|------|------------|--------------------------|------------------|
| **Starter** | $50 USD/mes | 100 conv/mes | $0.05 por conversación adicional |
| **Growth** | $100 USD/mes | 300 conv/mes | $0.05 por conversación adicional |
| **Pro** | $150 USD/mes | 700 conv/mes | $0.05 por conversación adicional |

**Definición de conversación:** Una sesión completa desde el primer mensaje
hasta que se cierra (status: completed, abandoned o escalated y resuelta).
No se cobra por mensaje individual — se cobra por sesión.

### Módulos incluidos por plan

| Módulo | Starter | Growth | Pro |
|--------|---------|--------|-----|
| Consulta | ✅ | ✅ | ✅ |
| Ventas | ❌ | ✅ | ✅ |
| Transacciones | ❌ | ✅ | ✅ |
| Feedback | ✅ | ✅ | ✅ |
| Trámites | ❌ | ❌ | ✅ |
| Citas (Salud) | ✅ | ✅ | ✅ |

### Usuarios operadores por plan

| Plan | Usuarios IH | Canales |
|------|-------------|---------|
| Starter | 2 operadores | WhatsApp |
| Growth | 5 operadores | WhatsApp |
| Pro | Ilimitados | WhatsApp + Web chat |

### Estrategia de precios para PYMES
- Sin cobro de setup ni implementación
- Sin contrato mínimo (mensual, cancela cuando quiera)
- 14 días de prueba gratuita (incluye 50 conversaciones)
- Descuento del 20% si paga anual

---

## 5. Onboarding self-service

El cliente debe poder pasar de "registro" a "primer mensaje respondido por la IA"
en menos de **2 horas** sin asistencia de Cricket.

### Flujo completo del onboarding

```
Paso 1: Registro
  → El cliente entra a mycricket.ai
  → Se registra con email y contraseña
  → Selecciona su sector (Banking / Retail / Salud)
  → Selecciona su plan (con 14 días gratis)

Paso 2: Configuración básica
  → Nombre de la empresa y slug ({empresa}.mycricket.ai)
  → Logo y color de marca (opcional)
  → Zona horaria y idioma

Paso 3: Conexión WhatsApp
  → Guía paso a paso: crear cuenta Meta Business → obtener credenciales
  → Ingresar: Phone Number ID + Access Token + Verify Token
  → Cricket verifica la conexión y muestra ✅ o error descriptivo

Paso 4: Knowledge base inicial
  → Builder visual de FAQs (sin código)
  → Opción A: importar desde archivo CSV o Excel
  → Opción B: agregar manualmente (título + respuesta)
  → Mínimo recomendado: 10 entradas para respuestas de calidad
  → Templates pre-cargados por sector (el cliente edita)

Paso 5: Catálogo (Retail y Salud)
  → Para Retail: agregar productos (nombre, descripción, precio, tallas)
  → Para Salud: agregar servicios (nombre, descripción, precio, duración, especialista)
  → Importación CSV disponible

Paso 6: Configurar módulos
  → Activar/desactivar módulos según el plan
  → Configurar fallback para módulos inactivos

Paso 7: Invitar al equipo IH
  → Agregar emails de operadores y supervisores
  → Los invitados reciben email con link de acceso

Paso 8: Prueba y activación
  → Botón "Enviar mensaje de prueba" — Cricket envía un mensaje al WhatsApp del cliente
  → El cliente puede chatear con su propio agente
  → Botón "Activar" para que el número empiece a atender clientes reales
```

### Guía de onboarding interactiva (in-app)
- Checklist visible en el dashboard con los 8 pasos
- Cada paso completado se marca con ✅
- Barra de progreso en el header hasta completar el onboarding
- Tooltips y videos cortos (<60 segundos) en cada paso crítico
- Chat de soporte Cricket en el dashboard (irónicamente, usa Cricket)

---

## 6. Sector extension: Salud

### 6.1 Nuevo agente: Citas Agent

El Citas Agent reemplaza al Sales Agent en el sector Salud. En lugar de vender,
agenda citas de forma conversacional y notifica al equipo.

**Archivo a crear:** `packages/agents/src/citas/index.ts`

**Comportamiento:**
```
Cliente: "Quiero una cita con el médico general"
→ Citas Agent:
  1. Preguntar: ¿Qué tipo de consulta necesitas? (primera vez, control, urgencia)
  2. Preguntar: ¿Tienes preferencia de día y hora?
  3. Consultar schedule_lookup → disponibilidad del especialista
  4. Proponer 2-3 opciones de horario disponibles
  5. Confirmar con el cliente
  6. Llamar schedule_appointment → crear registro de cita
  7. Enviar confirmación: "Tu cita está agendada para el martes 15 a las 10am
     con la Dra. García. Recibirás un recordatorio 24h antes."
```

**Tools nuevas para Salud:**
- `schedule_lookup`: consulta disponibilidad en tabla `appointments_slots`
- `schedule_appointment`: crea registro en tabla `appointments`

**Tablas nuevas (migration 20240104000000_health.sql):**
```sql
CREATE TABLE appointments_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  specialist_name TEXT NOT NULL,
  specialist_type TEXT NOT NULL,
  slot_datetime TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  session_id UUID REFERENCES sessions(id),
  end_user_id UUID NOT NULL REFERENCES end_users(id),
  slot_id UUID NOT NULL REFERENCES appointments_slots(id),
  appointment_type TEXT NOT NULL,
  patient_name TEXT,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 6.2 Trámites adaptados para Salud

Reutilizar el TramiteAgent con templates específicos para salud.
Agregar a `packages/agents/src/tramites/templates.ts`:

```typescript
solicitud_resultados: {
  label: 'Solicitud de resultados de laboratorio',
  required_fields: [
    { key: 'fecha_examen', question: '¿Cuándo fue tu examen?' },
    { key: 'tipo_examen', question: '¿Qué tipo de examen fue?' },
    { key: 'medio_entrega', question: '¿Cómo prefieres recibir los resultados? (email, en sede, WhatsApp)' },
  ],
  documents_required: [],
  sla_hours: 4,
  confirmation_message: 'Tu solicitud fue enviada. Los resultados estarán disponibles en máximo 4 horas hábiles.',
},

solicitud_record_medico: {
  label: 'Solicitud de récord médico',
  required_fields: [
    { key: 'periodo', question: '¿De qué período necesitas el récord médico?' },
    { key: 'destino', question: '¿Para qué lo necesitas? (seguro, trabajo, viaje, otro)' },
    { key: 'medio_entrega', question: '¿Cómo prefieres recibirlo? (email, en sede)' },
  ],
  documents_required: [
    { name: 'cedula', description: 'Cédula de ciudadanía del paciente' },
  ],
  sla_hours: 72,
  confirmation_message: 'Tu solicitud de récord médico fue radicada. Estará lista en máximo 3 días hábiles.',
},

solicitud_remision: {
  label: 'Solicitud de remisión a especialista',
  required_fields: [
    { key: 'especialidad', question: '¿A qué especialista necesitas la remisión? (cardiólogo, dermatólogo, etc.)' },
    { key: 'motivo', question: '¿Cuál es el motivo de la consulta? (descripción breve, no diagnósticos)' },
    { key: 'urgencia', question: '¿Es urgente o puede ser programada?' },
  ],
  documents_required: [],
  sla_hours: 48,
  confirmation_message: 'Tu solicitud de remisión fue enviada. Un médico la revisará en máximo 2 días hábiles.',
},

solicitud_incapacidad: {
  label: 'Solicitud de certificado de incapacidad',
  required_fields: [
    { key: 'fecha_inicio', question: '¿Desde qué fecha necesitas la incapacidad?' },
    { key: 'num_dias', question: '¿Cuántos días necesitas?' },
    { key: 'destino', question: '¿Para quién es el certificado? (empresa, EPS, otro)' },
  ],
  documents_required: [
    { name: 'historia_clinica', description: 'Debe tener consulta médica reciente que justifique la incapacidad' },
  ],
  sla_hours: 24,
  confirmation_message: 'Tu solicitud fue enviada al médico tratante. El certificado estará disponible en 24 horas hábiles.',
},

solicitud_formula: {
  label: 'Renovación de fórmula médica',
  required_fields: [
    { key: 'medicamento', question: '¿Qué medicamento necesitas que te formulen de nuevo?' },
    { key: 'dosis', question: '¿Cuál es la dosis que te formularon anteriormente?' },
    { key: 'tiempo_uso', question: '¿Hace cuánto tiempo estás usando ese medicamento?' },
  ],
  documents_required: [],
  sla_hours: 8,
  confirmation_message: 'Tu solicitud de fórmula fue enviada. El médico la revisará en máximo 8 horas hábiles. Si ya pasaron más de 6 meses desde la última consulta, puede que necesites una nueva cita.',
},
```

### 6.3 Health sector extension

**Archivo a crear:** `packages/sectors/health/index.ts`

```typescript
HEALTH_IH_POLICIES = {
  require_2fa_for_operators: true,
  auto_escalate_below_confidence: 0.70,
  max_session_duration_hours: 4,
  human_approval_required_for_payments: false,
  auto_escalate_on_sentiment: ['frustrated', 'angry'],
  // Restricción especial Salud: escalar cualquier consulta clínica
  escalate_clinical_questions: true,
}

HEALTH_INTENT_MAPPING = {
  'agendar_cita': 'citas',
  'cancelar_cita': 'citas',
  'confirmar_cita': 'citas',
  'disponibilidad': 'citas',
  'horario_atencion': 'consultation',
  'especialistas': 'consultation',
  'precios_servicios': 'consultation',
  'preparacion_examen': 'consultation',
  'resultados_laboratorio': 'tramites',
  'record_medico': 'tramites',
  'remision': 'tramites',
  'incapacidad': 'tramites',
  'formula_medica': 'tramites',
  'satisfaccion': 'feedback',
}

HEALTH_AGENT_PROMPTS = {
  consultation: `--- Contexto: SALUD / CLÍNICA
  Eres el asistente de atención de una institución de salud.
  REGLAS ESTRICTAS:
  - NUNCA dar consejo médico, diagnósticos ni interpretación de resultados
  - Si el paciente describe síntomas → siempre sugerir consulta médica
  - Solo responder sobre: servicios, especialistas disponibles, precios,
    horarios, preparación para exámenes, trámites administrativos
  - Si el paciente parece en urgencia → escalada inmediata con mensaje:
    "Para urgencias llama al 123 o dirígete a urgencias"
  Tono: cálido, claro y tranquilizador.`,

  feedback: `--- Contexto: SALUD
  Preguntar NPS: "Del 0 al 10, ¿qué tan probable es que nos recomiendes?"
  CSAT según contexto:
    Si tuvo cita: "¿Cómo fue la atención recibida? (1 a 5)"
    Si fue trámite: "¿Qué tan fácil fue gestionar tu solicitud? (1 a 5)"
    Si fue consulta: "¿Encontraste la información que buscabas? (1 a 5)"
  Para NPS detractor (0-6): preguntar motivo con empatía.`,
}
```

---

## 7. Componentes de plataforma pendientes para Fase 1

### 7.1 Self-service Registration (CRÍTICO — Prioridad 1)

**Problema:** Actualmente el onboarding solo lo puede hacer el superadmin de Cricket.
Las PYMES necesitan poder registrarse solas.

**Archivos a crear:**
```
apps/dashboard/src/app/(public)/register/
├── page.tsx           ← formulario de registro público
├── verify/page.tsx    ← verificación de email
└── actions.ts         ← crear cuenta + tenant automáticamente
```

**Flujo:**
1. `/register` → formulario: email, contraseña, nombre empresa, sector
2. Supabase Auth crea el usuario
3. Server Action crea: tenant + tenant_user (role: tenant_admin) + 4 módulos
4. Envía email de verificación
5. Al verificar → redirect al wizard de onboarding `/setup`

**Ruta pública** (no requiere auth): `/register`, `/verify`
**No es `/platform/onboarding`** (ese es para superadmin creando tenants manualmente)

### 7.2 Setup Wizard self-service (CRÍTICO — Prioridad 1)

**Archivos a crear:**
```
apps/dashboard/src/app/(dashboard)/setup/
├── page.tsx           ← orquestador (lee step de URL)
├── step-whatsapp.tsx  ← conectar WhatsApp Business API
├── step-knowledge.tsx ← builder de knowledge base
├── step-catalog.tsx   ← catálogo de productos/servicios (Retail y Salud)
├── step-team.tsx      ← invitar operadores
├── step-test.tsx      ← probar el agente antes de activar
└── actions.ts         ← guardar config de WhatsApp, seed inicial
```

**Paso crítico — Conexión WhatsApp:**
```typescript
// Guardar credenciales de WhatsApp del tenant
// Actualmente están en .env (globales) — necesitan moverse a la DB

CREATE TABLE tenant_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  channel     channel_type NOT NULL,
  config      JSONB NOT NULL DEFAULT '{}',
  -- Para WhatsApp: { phone_number_id, access_token, verify_token, phone_number }
  is_active   BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, channel)
);
```

**El webhook de WhatsApp debe leer las credenciales de `tenant_channels`**
en lugar de `.env`, para soportar múltiples tenants con diferentes números.

### 7.3 Knowledge Base Builder (CRÍTICO — Prioridad 1)

**Archivos a crear:**
```
apps/dashboard/src/app/(dashboard)/knowledge/
├── page.tsx           ← lista de entradas con búsqueda
├── new/page.tsx       ← formulario nueva entrada
├── [id]/page.tsx      ← editar entrada existente
├── import/page.tsx    ← importar CSV/Excel
└── actions.ts         ← CRUD de knowledge_base
```

**Features del builder:**
- Crear/editar/eliminar entradas (título + contenido + categoría + tags)
- Importar desde CSV: columnas `title,content,category,tags`
- Templates por sector pre-cargados (el tenant los edita o elimina)
- Contador de entradas con recomendación: "≥ 10 entradas para respuestas de calidad"
- Vista previa: "¿Qué respondería el agente a esta pregunta?" (llama al agente en modo test)

### 7.4 Catalog Builder (Prioridad 2 — Retail y Salud)

**Archivos a crear:**
```
apps/dashboard/src/app/(dashboard)/catalog/
├── page.tsx           ← lista de productos/servicios
├── new/page.tsx       ← formulario nuevo ítem
├── [id]/page.tsx      ← editar ítem
├── import/page.tsx    ← importar CSV
└── actions.ts         ← CRUD de products
```

**Diferencia por sector:**
- Retail: nombre, descripción, precio, tallas disponibles, segmentos, imágenes (URL)
- Salud: nombre del servicio, especialista, duración, precio, preparación previa

### 7.5 WhatsApp Multi-tenant Webhook Refactor (CRÍTICO — Prioridad 1)

**Problema actual:** El webhook usa credenciales globales de `.env`.
Con múltiples tenants, cada tenant tiene su propio WhatsApp Business.

**Solución:**
1. Crear tabla `tenant_channels` (ver 7.2)
2. Refactorizar `services/api/src/routes/whatsapp.ts`:
   - El webhook recibe el número de teléfono del remitente
   - Busca qué tenant tiene ese `phone_number` en `tenant_channels`
   - Usa las credenciales de ese tenant para responder
3. La verificación del webhook Meta también debe ser por tenant

```typescript
// services/api/src/routes/whatsapp.ts — nuevo flujo
POST /webhook/whatsapp/{tenantSlug}
  → cada tenant tiene su propia URL de webhook
  → Meta se configura con: https://api.mycricket.ai/webhook/whatsapp/banco-xyz
  → el slug identifica el tenant sin buscar en DB
```

### 7.6 Billing Module (Prioridad 3 — Fase 1 final)

Para la Fase 1 el billing puede ser manual (Cricket cobra por fuera y activa/desactiva
tenants manualmente). En Fase 2 se integra Stripe.

**Manual billing para Fase 1:**
- Tabla `subscriptions` con: tenant_id, plan, status, paid_until
- Superadmin activa/extiende subscripciones desde `/platform/tenants`
- Si `paid_until` < NOW(): tenant.is_active = false → dashboard bloquea

### 7.7 Conversation Counter (Prioridad 2)

Para el modelo de precios variable, necesitar contar conversaciones:

```sql
-- Agregar a sessions o en tabla aparte
CREATE TABLE billing_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id),
  session_id UUID REFERENCES sessions(id),
  event_type TEXT NOT NULL, -- 'conversation_started' | 'conversation_completed'
  month_year TEXT NOT NULL, -- '2026-01' para agrupar fácilmente
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vista de resumen de consumo mensual
CREATE VIEW monthly_conversation_counts AS
  SELECT tenant_id, month_year, COUNT(*) as conversations
  FROM billing_events
  WHERE event_type = 'conversation_completed'
  GROUP BY tenant_id, month_year;
```

---

## 8. Matriz de lo que está construido vs pendiente

### Agentes y módulos

| Componente | Banking | Retail | Salud | Estado |
|-----------|---------|--------|-------|--------|
| Journey Engine | ✅ | ✅ | ✅ | Listo |
| Intent Classifier | ✅ | ✅ | ✅ | Listo |
| Consultation Agent | ✅ | ✅ | ✅ | Listo |
| Sales Agent | ✅ | ✅ | ❌ | Retail listo; Salud no aplica |
| Transactions Agent | ✅ | ✅ | ❌ | Listo para Banking y Retail |
| Citas Agent | ❌ | ❌ | ❌ | **Pendiente — solo Salud** |
| Tramites Agent | ✅ | ❌ | ❌ | Banking listo; Salud **pendiente templates** |
| Feedback Agent | ✅ | ✅ | ✅ | Listo |
| Handoff Agent | ✅ | ✅ | ✅ | Listo |

### Sector extensions

| Extension | Estado | Pendiente |
|-----------|--------|-----------|
| Banking | ✅ Completa | — |
| Retail | ✅ Completa | — |
| Health | ❌ No existe | Crear packages/sectors/health/ |

### Dashboard y plataforma

| Componente | Estado | Pendiente |
|-----------|--------|-----------|
| Login por subdominio | ✅ Listo | — |
| Cola IH + checkpoints | ✅ Listo | — |
| Dashboard analytics | ✅ Listo | — |
| Tramites manager | ✅ Listo | — |
| Onboarding (superadmin) | ✅ Listo | — |
| **Self-service registration** | ❌ | **Prioridad 1** |
| **Setup wizard (cliente)** | ❌ | **Prioridad 1** |
| **Knowledge base builder** | ❌ | **Prioridad 1** |
| Catalog builder | ❌ | Prioridad 2 |
| WhatsApp multi-tenant | ❌ | **Prioridad 1** |
| Billing manual | ❌ | Prioridad 3 |

---

## 9. Timeline de implementación (3 meses)

### Mes 1 — Fundación self-service

**Semana 1-2: Multi-tenant WhatsApp + registro**
- [ ] Crear tabla `tenant_channels`
- [ ] Refactorizar webhook a `/webhook/whatsapp/{tenantSlug}`
- [ ] Crear `/register` público (self-service registration)
- [ ] Crear tenant automáticamente al registrarse

**Semana 3-4: Setup wizard + knowledge base**
- [ ] Setup wizard pasos 1-3 (configuración básica + WhatsApp)
- [ ] Knowledge base builder (CRUD + templates por sector)
- [ ] Templates de knowledge base pre-cargados para los 3 sectores

**Meta mes 1:** 1 cliente activo por segmento usando self-service

---

### Mes 2 — Salud + Catálogo + Calidad

**Semana 5-6: Health sector extension**
- [ ] Crear `packages/sectors/health/index.ts`
- [ ] Crear Citas Agent + tools schedule_lookup y schedule_appointment
- [ ] Agregar templates de trámites de Salud
- [ ] Seed data de salud demo

**Semana 7-8: Catalog builder + conversación counter**
- [ ] Catalog builder para Retail (productos) y Salud (servicios + slots de cita)
- [ ] Billing events: contar conversaciones completadas
- [ ] Vista de consumo mensual en dashboard del cliente

**Meta mes 2:** 3 clientes activos por segmento

---

### Mes 3 — Escala y retención

**Semana 9-10: Billing manual + calidad**
- [ ] Tabla subscriptions + activación manual superadmin
- [ ] Quality Reviewer Agent (Fase 2 de agentes)
- [ ] Notificación WhatsApp al cliente cuando su trámite cambia de estado

**Semana 11-12: Retención y métricas**
- [ ] Dashboard del cliente mejorado (ver sus propias métricas de NPS, resolución)
- [ ] Email digest semanal al tenant_admin con resumen de la semana
- [ ] Documentación completa de self-service (guías en formato video + texto)

**Meta mes 3:** 5 clientes activos por segmento (15 total)

---

## 10. User stories por segmento

### Banking

```
US-B01: Como dueño de una cooperativa de crédito, quiero conectar mi WhatsApp
Business a Cricket en menos de 30 minutos, para que mis socios puedan consultar
tasas y saldos sin llamar a la oficina.
Criterio: Onboarding completado sin asistencia de Cricket.

US-B02: Como asesor de la cooperativa, quiero recibir en el dashboard las sesiones
escaladas con un resumen del contexto, para poder responder en menos de 2 minutos
sin leer toda la conversación.
Criterio: El Handoff Agent genera el briefing en < 5 segundos post-escalada.

US-B03: Como gerente de la cooperativa, quiero ver el NPS semanal de mis socios
y la tasa de resolución de la IA, para saber si Cricket les está sirviendo.
Criterio: Dashboard muestra NPS, tasa de escalada y conversaciones en 30 días.

US-B04: Como socio de la cooperativa, quiero solicitar un crédito por WhatsApp
dando mis datos paso a paso, sin tener que ir a la oficina solo para llenar un formulario.
Criterio: TramiteAgent completa solicitud_credito con todos los campos en < 10 turnos.
```

### Retail

```
US-R01: Como dueño de una tienda de ropa, quiero que Cricket responda preguntas
de tallas y disponibilidad en WhatsApp, para no perder ventas fuera de horario.
Criterio: Consultation Agent responde preguntas de catálogo con confidence > 0.8.

US-R02: Como cliente de la tienda, quiero que el agente me sugiera qué combina
con lo que estoy comprando, para descubrir productos que no conocía.
Criterio: Sales Agent hace cross-sell relevante en < 3 turnos de conversación.

US-R03: Como dueño de la tienda, quiero que las devoluciones simples las gestione
la IA sin molestarme, pero que me avise cuando hay reembolsos grandes.
Criterio: Devoluciones < $500k COP sin IH. Reembolsos > $500k crean checkpoint.
```

### Salud

```
US-S01: Como recepcionista de una clínica, quiero que Cricket agende citas por
WhatsApp usando mi disponibilidad real, para reducir las llamadas entrantes.
Criterio: Citas Agent agenda con base en appointments_slots, sin doble-booking.

US-S02: Como paciente, quiero solicitar mis resultados de laboratorio por WhatsApp
sin tener que llamar ni ir a la clínica.
Criterio: TramiteAgent completa solicitud_resultados en < 5 turnos, SLA 4h.

US-S03: Como director médico, quiero que el agente NUNCA dé consejos médicos
ni interprete resultados, para proteger a la clínica de responsabilidad legal.
Criterio: Cualquier pregunta clínica escala a IH con mensaje estandarizado.
```

---

## 11. Criterios de aceptación globales

### Onboarding self-service
- [ ] Un cliente puede registrarse sin intervención de Cricket
- [ ] Puede conectar su WhatsApp en < 30 minutos con la guía
- [ ] Puede agregar su knowledge base con el builder visual
- [ ] Puede probar el agente antes de activarlo
- [ ] Primer mensaje de cliente real respondido por la IA en < 24h post-registro

### Calidad de respuestas
- [ ] Consultation Agent: confidence > 0.80 con knowledge base de ≥ 10 entradas
- [ ] Sales Agent: propone productos relevantes del catálogo en < 3 turnos
- [ ] Tramites Agent: completa recopilación de datos en < 10 turnos
- [ ] Citas Agent (Salud): agenda sin double-booking en < 5 turnos
- [ ] Feedback Agent: obtiene NPS en ≤ 3 turnos

### Principio IA + IH
- [ ] Operador recibe briefing del Handoff Agent en < 10 segundos post-escalada
- [ ] Checkpoint IH bloquea operaciones sensibles antes de ejecutar
- [ ] audit_log registra todo: actor_type, actor_id, event_type
- [ ] El cliente final SIEMPRE recibe un mensaje cuando hay escalada
  ("Te comunico con un asesor...")

### Performance
- [ ] Respuesta al cliente en WhatsApp en < 8 segundos (incluye IA)
- [ ] Handoff Agent genera briefing en < 10 segundos (asíncrono)
- [ ] Dashboard /queue carga en < 2 segundos

---

## 12. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Cliente no puede conectar WhatsApp solo | Alta | Alto | Guía paso a paso con screenshots + video + soporte por chat |
| Knowledge base vacía → respuestas pobres | Alta | Alto | Templates pre-cargados + mínimo de 10 entradas antes de activar |
| Meta API: cambios en WhatsApp Business | Media | Alto | Abstraer credenciales en tenant_channels; monitorear webhooks |
| SARLAFT: agente comete error en compliance banca | Baja | Muy alto | IH obligatorio para todo pago; campo confidence estricto (0.65) |
| Agente de Salud da consejo médico | Baja | Muy alto | System prompt con reglas estrictas + escalada automática en preguntas clínicas |
| PYMES no adoptan por curva de aprendizaje | Media | Alto | Onboarding < 2h + soporte por WhatsApp (usando Cricket) + 14 días gratis |
| Costos de API Anthropic descontrolan el margen | Media | Media | Contar conversaciones, limitar por plan, alertas en > 80% del plan |

---

## 13. Prompts para Claude Code (implementación)

### Sprint 1 — Prioridad 1

**Prompt 1: Multi-tenant WhatsApp**
```
Lee el CLAUDE.md y este spec (docs/spec-phase1.md sección 7.2 y 7.5).
Crea la tabla tenant_channels y refactoriza el webhook de WhatsApp para
que cada tenant tenga su propia URL /webhook/whatsapp/{tenantSlug}
y sus propias credenciales en tenant_channels.config.
```

**Prompt 2: Self-service registration**
```
Lee el CLAUDE.md y este spec (sección 7.1).
Crea la página pública /register con formulario (email, contraseña, empresa, sector),
que al registrarse crea automáticamente: usuario en Supabase Auth + tenant +
tenant_user (role: tenant_admin) + 4 módulos con defaults del sector.
```

**Prompt 3: Knowledge base builder**
```
Lee el CLAUDE.md y este spec (sección 7.3).
Crea el knowledge base builder en /knowledge con CRUD completo,
importación CSV y templates pre-cargados por sector.
```

### Sprint 2 — Prioridad 2

**Prompt 4: Health sector extension + Citas Agent**
```
Lee el CLAUDE.md y este spec (sección 3.3 y 6).
Crea packages/sectors/health/index.ts y packages/agents/src/citas/index.ts
con las tools schedule_lookup y schedule_appointment, la migration
20240104000000_health.sql, y los templates de trámites de salud.
```

**Prompt 5: Catalog builder**
```
Lee el CLAUDE.md y este spec (sección 7.4).
Crea el catalog builder en /catalog adaptado por sector:
productos con tallas para Retail, servicios con especialistas y slots para Salud.
```

### Sprint 3 — Prioridad 3

**Prompt 6: Billing manual + conversation counter**
```
Lee el CLAUDE.md y este spec (secciones 7.6 y 7.7).
Crea tabla billing_events con conteo de conversaciones completadas,
tabla subscriptions, y panel de superadmin en /platform/tenants
para activar/extender subscripciones manualmente.
```

---

## 14. Glosario

| Término | Definición |
|---------|-----------|
| Tenant | Cliente de Cricket (un banco, una tienda, una clínica) |
| End user | Cliente final del tenant (el paciente, el comprador, el socio) |
| IA | Inteligencia Artificial — Claude gestiona la conversación |
| IH | Inteligencia Humana — el operador interviene cuando es necesario |
| Cognitive checkpoint | Momento donde la IA pausa y espera decisión humana |
| Escalada | Traspaso completo de control de la IA al operador humano |
| Journey | El ciclo completo de interacción de un end_user con el tenant |
| Trámite | Solicitud formal con múltiples campos y SLA definido |
| Confidence | Score 0-1 de certeza del agente sobre su respuesta |
| SLA | Service Level Agreement — tiempo máximo de respuesta comprometido |

---

*Documento generado para uso con SpecKit en Claude Code.*
*Actualizar este documento al inicio de cada sprint con los cambios del alcance.*
