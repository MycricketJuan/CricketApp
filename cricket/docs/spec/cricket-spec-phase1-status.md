# Estado de implementación — Cricket Fase 1

**Fecha de corte:** 21 de julio de 2026  
**Documento base:** [`cricket-spec-phase1.md`](./cricket-spec-phase1.md)  
**Alcance:** código y migraciones presentes en el working tree. Este informe no confirma que las migraciones estén aplicadas ni que las integraciones externas estén configuradas en producción.

## Convenciones

- ✅ **Implementado:** existe un flujo funcional completo en el repositorio.
- 🟡 **Parcial:** existe una parte relevante, pero falta integración, seguridad, UX o validación E2E.
- ❌ **Pendiente:** no se encontró implementación.
- ⚪ **No verificado:** el criterio requiere pruebas operativas, métricas o servicios externos.

## Resumen ejecutivo

La base técnica de Cricket está avanzada: arquitectura multitenant, Journey Engine, agentes principales, IA + IH, dashboard operativo, trámites bancarios, registro empresarial con Auth0 y Knowledge Base con RAG. La principal brecha frente a la Fase 1 es convertir esas capacidades en un self-service operativo: todavía faltan el wizard completo, la conexión de WhatsApp por tenant, pruebas y activación, catálogo, Salud y billing.

| Área del spec | Estado actual | Evaluación |
|---|---|---|
| Motor conversacional y agentes base | Journey Engine, intent classifier y cinco agentes de negocio | 🟡 |
| IA + IH | Escaladas, checkpoints, takeover, briefing y auditoría | 🟡 |
| Registro empresarial | `/register` + Auth0 + tenant + propietario `tenant_admin` | 🟡 |
| Setup self-service | Solo pantalla inicial posterior al registro | 🟡 |
| Knowledge Base | CRUD, archivos, URLs, FAQ, embeddings y RAG | 🟡 |
| WhatsApp multitenant | Tabla creada como migración; webhook aún global | 🟡 |
| Salud | Sin extensión, Citas Agent, tablas ni templates | ❌ |
| Catálogo autogestionable | Solo tablas/seed de productos y búsqueda del agente | 🟡 |
| Billing y conteo | Sin subscriptions, billing events ni vistas mensuales | ❌ |

## Agentes, módulos y sectores

| Componente | Estado | Evidencia y brecha |
|---|---|---|
| Journey Engine | ✅ | `packages/core/src/journey-engine/index.ts`: enrutamiento dinámico, persistencia, fallbacks y políticas IH. |
| Intent Classifier | ✅ | Integrado en el Journey Engine mediante Claude Haiku y mappings por sector. |
| Consultation Agent | ✅ | `packages/agents/src/consultation/`: consulta RAG por tenant y escalada por incertidumbre. |
| Sales Agent | ✅ | CRM lookup, búsqueda de productos y calificación de leads. Depende de catálogo previamente cargado. |
| Transactions Agent | ✅ | Preview, verificación de cuenta y aprobación IH para operaciones sensibles. |
| Tramites Agent | 🟡 Banking | Código, templates, migración y seed existen. El aprovisionamiento self-service no crea el módulo/etapa `tramites`, y no hay templates de Salud. |
| Feedback Agent | ✅ | Recopila NPS/CSAT, evita duplicados y cierra la sesión. |
| Handoff Agent | 🟡 | Genera briefing asíncrono y fallback. El historial está incompleto porque el mensaje entrante no se persiste como interacción. |
| Citas Agent | ❌ | No existen agente, `schedule_lookup`, `schedule_appointment` ni tablas de citas. |
| Quality Reviewer | ❌ | No existe; estaba planificado para el mes 3. |
| Retail extension | 🟡 | `packages/sectors/retail/` contiene prompts, intents y políticas, pero los webhooks no seleccionan/pasan `tenant.sector` al Journey Engine. |
| Banking extension | 🟡 | Funciona mediante defaults, seed y trámites, pero no existe `packages/sectors/banking/`. |
| Health extension | ❌ | No existe `packages/sectors/health/` ni seed de Salud. |

## Plataforma y self-service

### Registro empresarial — sección 7.1

🟡 **Implementado en código; pendiente de validación E2E.**

- `/register` recopila empresa, slug y sector.
- Auth0 Universal Login administra identidad y contraseña; Cricket no recibe la contraseña.
- `/register/complete` exige email verificado, evita duplicados y aprovisiona tenant, módulos, journey, auditoría y propietario `tenant_admin`.
- Se incorporó el contexto de tenant para los hosts centrales y una transición a `/setup`.
- Falta probar el flujo contra un tenant Auth0 real y confirmar sign-ups, email verification, callbacks, logout y `AUTH0_COOKIE_DOMAIN` en producción.

### Setup Wizard — sección 7.2

🟡 `/setup` confirma que el registro terminó y enlaza al panel y Knowledge Base. Faltan los pasos persistentes de configuración básica, branding, idioma, zona horaria, WhatsApp, progreso, prueba y activación. Tampoco existe una tabla `onboarding_progress`.

### Knowledge Base Builder — sección 7.3

🟡 Existe una interfaz visual en `/admin/knowledge` con FAQ manual, edición, eliminación, importación de PDF/DOCX/TXT, extracción de URL, generación de FAQ, embeddings y búsqueda RAG. Faltan CSV/Excel y templates precargados por sector.

**Brecha de seguridad:** varias API routes reciben `tenant_id` del cliente y usan service role. Deben resolver el tenant desde la sesión Auth0 y comprobar membresía antes de leer o mutar datos.

### Catalog Builder — sección 7.4

🟡 El esquema inicial y los seeds contienen productos, y Sales Agent ejecuta `product_search`. No existe CRUD visual, importación CSV ni modelo de servicios/slots para Salud.

### WhatsApp multitenant — sección 7.5

🟡 La migración `20260720000000_tenant_channels.sql` modela canales por tenant, referencias opacas a credenciales, constraints y RLS. No está conectada al runtime.

- Los webhooks de Dashboard y Fastify siguen resolviendo el tenant por `x-tenant-slug`, `DEV_TENANT_SLUG` o fallback.
- Las credenciales Twilio siguen siendo globales en variables de entorno.
- Existen dos implementaciones de webhook que deberían consolidarse.
- Si `TWILIO_AUTH_TOKEN` no está configurado, el handler del Dashboard omite la validación de firma.

### Billing y consumo — secciones 7.6 y 7.7

❌ No existen tablas `subscriptions` o `billing_events`, vista `monthly_conversation_counts`, límites por plan, activación manual ni vista mensual de consumo.

## Dashboard e IA + IH

| Capacidad | Estado | Observación |
|---|---|---|
| Login por subdominio/Auth0 | ✅ | Middleware, perfiles por tenant y grants implementados. |
| Cola IH y checkpoints | 🟡 | Interfaz, resolución y takeover implementados. Realtime usa Supabase browser client, pero las políticas existentes esperan Supabase Auth, no Auth0. |
| Analytics | 🟡 | NPS, sesiones, escaladas, resolución y canales están diseñados. Las consultas usan cliente Supabase anon y dependen de RLS basado en Supabase Auth, por lo que debe integrarse Auth0 o resolverse server-side por tenant. |
| Trámites manager | ✅ | Listado, detalle, transiciones válidas, SLA, asignación y auditoría por tenant. |
| Notificación de trámite | ❌ | `customer_message` se guarda, pero no se envía por WhatsApp. |
| Onboarding superadmin | ✅ | Creación de tenant, módulos, invitación y auditoría. |
| Audit log | 🟡 | Esquema append-only, triggers y eventos explícitos. El Journey Engine persiste la respuesta IA, pero no registra primero el mensaje entrante del cliente como `interaction`. |

## Criterios de aceptación globales

| Criterio del spec | Estado | Resultado actual |
|---|---|---|
| Registro sin intervención de Cricket | ⚪ | El flujo existe; falta prueba E2E con Auth0 y Supabase desplegados. |
| Conectar WhatsApp en menos de 30 minutos | ❌ | No existe UI ni verificación por tenant. |
| Agregar Knowledge Base visualmente | 🟡 | Implementado, con brecha de autorización tenant. |
| Probar agente antes de activar | ❌ | No existe modo de prueba/activación. |
| Primer mensaje real en menos de 24 horas | ⚪ | No hay telemetría del funnel para medirlo. |
| Confidence, turnos y calidad por agente | ⚪ | Hay lógica y prompts, pero no suite de evaluación automatizada. |
| Checkpoint bloquea acciones sensibles | ✅ | El Journey Engine detiene acciones con `requiresIHApproval`. |
| Briefing Handoff en menos de 10 segundos | ⚪ | Implementado asíncronamente; no hay medición/SLO. |
| Auditoría con actor y evento | 🟡 | Campos y eventos existen; faltan interacciones entrantes y algunas acciones Auth0 atribuyen `actor_sub` en payload porque `actor_id` es UUID. |
| Mensaje al cliente al escalar | ❌ | Los webhooks devuelven respuesta vacía para `escalated` y `checkpoint_created`. |
| WhatsApp responde en menos de 8 segundos | ⚪ | No hay prueba de carga ni métrica de latencia end-to-end. |
| `/queue` carga en menos de 2 segundos | ⚪ | No existe benchmark ni monitoreo de este SLA. |

## Diferencias relevantes respecto al spec

1. La identidad se implementó con **Auth0**, no con Supabase Auth como propone la sección 7.1.
2. La web atiende al **cliente Cricket/tenant**; WhatsApp atiende al **cliente final/end_user**.
3. Las RLS originales dependen de `auth.uid()`/claims Supabase. Varios flujos Auth0 las evitan usando service role, por lo que la autorización debe aplicarse explícitamente en servidor.
4. La migración `tenant_channels` evita guardar secretos directamente en JSON, mejorando el diseño sugerido por el spec.
5. Las extensiones por sector están desacopladas, pero el runtime de WhatsApp no carga actualmente el sector del tenant; Retail cae en el comportamiento genérico.
6. El aprovisionamiento crea cuatro módulos base; no agrega `tramites` para nuevos tenants Banking aunque el agente y el seed bancario sí existen.
7. No existe infraestructura de pruebas automatizadas; `pnpm type-check` y `pnpm build` pasan, pero no validan criterios funcionales, calidad ni performance.

## Próximas prioridades recomendadas

1. **Cerrar aislamiento multitenant:** helper único de autorización Auth0 → `tenant_users`; aplicarlo a Knowledge Base, Analytics, Queue y APIs administrativas.
2. **Completar setup pasos 1–3:** datos básicos, alta/verificación de `tenant_channels` y prueba de WhatsApp.
3. **Consolidar el webhook:** resolver tenant por número receptor/`tenant_channels`, cargar su sector, persistir mensajes entrantes, usar credenciales seguras y responder explícitamente en escaladas.
4. **Añadir pruebas E2E:** registro Auth0, aislamiento entre tenants, conversación → escalada → takeover y Knowledge Base → respuesta RAG.
5. **Implementar Salud:** extensión, Citas Agent, tools, tablas, templates y seed.
6. **Después:** Catalog Builder, conversation counter y billing manual.
