# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es Cricket
SaaS multi-tenant que implementa agentes IA para gestionar el customer journey completo.
Clientes: bancos, retailers, salud, telecom. Cada cliente tiene su subdominio: `banco.mycricket.ai`.
Deploy en Vercel. DB en Supabase (proyecto `pyicxnsvumqhnvcaqasl`). Auth con Auth0.

## ⚡ Principio central: IA + IH (nunca saltarlo)
Toda decisión de diseño respeta **IA First, IH Always**:

- **IA actúa primero**: Claude gestiona la conversación y propone/ejecuta acciones.
- **IH supervisa siempre**: un humano puede ver qué hizo la IA, intervenir en cualquier momento,
  y las operaciones sensibles SIEMPRE requieren aprobación explícita de un humano.

### Cómo se refleja en código:
```
ai_decisions.confidence < tenant.ih_policies.auto_escalate_below_confidence
  → crear cognitive_checkpoint (IA pausa, humano decide)

interactions.actor_type: 'AI' | 'HUMAN' | 'SYSTEM'
  → NUNCA hay una acción sin atribución

sessions.actor_control: 'AI' | 'HUMAN' | 'MIXED'
  → refleja quién controla el diálogo en tiempo real

payment_initiator skill
  → SIEMPRE termina en cognitive_checkpoint. Nunca ejecuta de forma autónoma.
```

## Arquitectura del proyecto
```
cricket/
├── apps/
│   ├── dashboard/               → Next.js 15 (App Router) — portal del cliente (ACTIVO)
│   └── widget/                  → React — chat embebido para web (por crear)
├── packages/
│   ├── core/                    → tipos TypeScript, Supabase clients
│   ├── agents/                  → agentes Claude (por crear)
│   ├── channels/                → adaptadores WhatsApp, Web Chat, Email (por crear)
│   └── sectors/                 → extensiones por sector (por crear)
├── services/
│   └── api/                     → Node.js + Fastify — API principal (por crear)
└── supabase/
    └── migrations/              → 4 migraciones aplicadas (ver Schema)
```

## Stack
| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript strict, Tailwind |
| Auth | Auth0 (`@auth0/nextjs-auth0`) — lazy singleton via `getAuth0()` |
| DB | Supabase (PostgreSQL 17) con Row Level Security |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Embeddings | OpenAI `text-embedding-3-small` (batch de 100 por call) |
| Multi-tenancy | Subdominio por tenant, resuelto en `apps/dashboard/middleware.ts` |
| Realtime | Supabase Realtime (escaladas, checkpoints, sesiones activas) |
| Deploy | Vercel — URL: `https://cricket-app-snowy-iota.vercel.app` |

## Setup inicial (una vez al clonar)
```bash
./setup.sh                                          # instala deps, crea .env.local
# Editar .env.local con las credenciales reales
npx supabase link --project-ref pyicxnsvumqhnvcaqasl
pnpm db:push                                        # aplicar schema
pnpm db:types                                       # generar tipos TypeScript
```

## Comandos
```bash
pnpm dev          # Levanta dashboard + api en paralelo
pnpm build        # Compila packages primero, luego apps y services
pnpm type-check   # Verifica tipos en todos los packages (requiere supabase.generated.ts)
pnpm db:types     # Regenera packages/core/src/types/supabase.generated.ts
pnpm db:push      # Aplica migraciones al proyecto Supabase remoto
pnpm db:reset     # Resetea la DB local y re-aplica todas las migraciones
pnpm db:studio    # Abre Supabase Studio local
```

> `pnpm type-check` falla si `supabase.generated.ts` no existe — correr `pnpm db:types` primero.

## Reglas de código

### TypeScript
- `strict: true` en todos los tsconfig. Cero `any`.
- Importar tipos del schema desde `@cricket/core/types`
- Errores: usar tipos de error explícitos, nunca `catch(e: any)`
- Las tablas `knowledge_base_*` usan `getKBAdmin()` de `@/lib/knowledge/db` (cast sin tipos mientras no se regeneren los tipos)

### Auth — Auth0
```
apps/dashboard/src/lib/auth0.ts  → lazy singleton getAuth0()
```
**CRÍTICO**: `Auth0Client` valida `APP_BASE_URL` con `new URL()` en el constructor.
Si se instancia a nivel de módulo, el build de Next.js falla con `TypeError: Invalid URL`.
**SIEMPRE** usar el patrón lazy:
```typescript
import { getAuth0 } from '@/lib/auth0'
// NO: import { auth0 } ... auth0.getSession()
// SÍ: await getAuth0().getSession()
```

### Supabase — clientes
```
packages/core/src/lib/supabase/client.ts   → cliente browser (Client Components)
packages/core/src/lib/supabase/server.ts   → cliente servidor (Server Components, Route Handlers)
packages/core/src/lib/supabase/admin.ts    → service_role — getSupabaseAdmin() lazy singleton
apps/dashboard/src/lib/knowledge/db.ts     → getKBAdmin() — admin sin tipos para tablas KB
```
Imports:
```typescript
import { createClient }    from '@cricket/core/supabase/client'
import { createClient }    from '@cricket/core/supabase/server'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
```
- ❌ NUNCA usar el cliente browser en Server Components
- ❌ NUNCA exponer `SUPABASE_SERVICE_ROLE_KEY` en el cliente (empieza con `sb_secret_` o `eyJ...`)
- ❌ NUNCA bypassar RLS desde el dashboard
- ❌ NUNCA instanciar `createClient()` browser a nivel de módulo en Client Components — moverlo dentro de `useEffect`

### Multi-tenancy
- Tenant se resuelve en `apps/dashboard/middleware.ts` leyendo el subdominio del host
- Header `x-tenant-slug` propaga el slug a todos los Server Components
- En localhost, el slug viene de `DEV_TENANT_SLUG` (`.env.local`)
- En Vercel preview (`*.vercel.app`), también usa `DEV_TENANT_SLUG`
- ❌ NUNCA hardcodear `tenant_id` en ningún query

### Server Components y build
- Todas las páginas y layouts del dashboard usan `export const dynamic = 'force-dynamic'`
- Esto evita que Next.js intente pre-renderizar páginas que dependen de headers/cookies en runtime
- Si una página falla en build con "Failed to collect configuration", revisar si hay código de inicialización a nivel de módulo (constructores, `new URL()`, `createClient()`, etc.)

### Background tasks en Vercel
- ❌ NUNCA usar `(async () => { ... })()` fire-and-forget en Route Handlers — Vercel mata la función serverless al enviar la respuesta
- ✅ Usar `after()` de `next/server` para tareas post-respuesta:
```typescript
import { after } from 'next/server'
after(async () => { /* tarea larga */ })
return NextResponse.json({ ... })
```
- `after` NO requiere configuración en `next.config.ts` (está disponible en Next.js 15 GA sin flags)

### Agentes (`packages/agents/`)
Todo agente implementa `Agent { run(input: AgentInput, ctx: AgentContext): Promise<AgentOutput> }`.

`AgentOutput` (definido en `packages/core/src/types/index.ts`):
```typescript
interface AgentOutput {
  content: string
  confidence: number       // 0.000–1.000; bajo umbral del tenant → requiresIH automático
  reasoning: string        // chain-of-thought; se persiste en ai_decisions.reasoning
  toolsUsed: string[]
  requiresIH: boolean      // true → Journey Engine crea cognitive_checkpoint
  action?: AgentAction     // acción propuesta; nunca ejecutar si requiresIHApproval = true
  usage: { promptTokens: number; completionTokens: number }
  latencyMs: number
}
```
`EscalationRequired` es el error que lanza un agente cuando debe escalar.

### Nomenclatura
- Archivos: `kebab-case.ts`
- Funciones/variables: `camelCase`
- Tipos/interfaces: `PascalCase`
- Constantes: `UPPER_SNAKE_CASE`
- Rutas Next.js: `kebab-case` (carpetas)

## Variables de entorno

### En Vercel (producción)
```bash
NEXT_PUBLIC_SUPABASE_URL          # https://pyicxnsvumqhnvcaqasl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     # sb_publishable_... (anon/public key)
SUPABASE_SERVICE_ROLE_KEY         # ⚠️ sb_secret_... o eyJ... — NUNCA la anon key aquí
SUPABASE_PROJECT_REF              # pyicxnsvumqhnvcaqasl
ANTHROPIC_API_KEY                 # sk-ant-...
OPENAI_API_KEY                    # sk-... (para embeddings knowledge base)
APP_BASE_URL                      # https://cricket-app-snowy-iota.vercel.app ← CRÍTICO, no poner slug de tenant
DEV_TENANT_SLUG                   # slug del tenant por defecto en previews/localhost
AUTH0_SECRET                      # secret largo para Auth0
AUTH0_BASE_URL                    # https://cricket-app-snowy-iota.vercel.app
AUTH0_ISSUER_BASE_URL             # https://tu-dominio.auth0.com
AUTH0_CLIENT_ID                   # client ID de Auth0
AUTH0_CLIENT_SECRET               # client secret de Auth0
```

> ⚠️ `APP_BASE_URL` debe ser una URL completa con protocolo. Si se pone un slug como `banco-xyz`,
> Auth0 falla con `TypeError: Invalid URL, input: 'banco-xyz'` en el build de Vercel.

## Schema — migraciones aplicadas
```
cricket_001_initial_schema.sql        → schema base completo
20240102000000_nps_responses.sql      → tabla nps_responses
20260619000000_knowledge_base.sql     → tablas knowledge_base_documents + knowledge_base_chunks
20260629000000_user_grants.sql        → tablas user_grants + superadmin_grants (provisioning)
```

### Tablas clave
```
tenants                → clientes de Cricket (slug = subdominio)
tenant_users           → operadores/admins (auth0_sub + email, ligados a Auth0)
tenant_modules         → módulos contratados por tenant + config JSONB + fallback_config JSONB
end_users              → clientes finales (canal, no tienen login)
journey_templates      → blueprints del journey configurables por tenant
sessions               → instancias activas (actor_control: AI|HUMAN|MIXED)
interactions           → cada mensaje/acción (actor_type: AI|HUMAN|SYSTEM — campo de auditoría central)
ai_decisions           → decisiones de Claude (confidence + reasoning)
cognitive_checkpoints  → momentos donde el humano DEBE decidir
escalations            → handoffs AI→Humano con context_summary
audit_log              → inmutable, append-only (requerido cumplimiento bancario)
nps_responses          → encuestas NPS por sesión
knowledge_base_documents → documentos indexados (url/file/faq), status: processing|ready|error
knowledge_base_chunks    → fragmentos de texto con embedding vectorial (pgvector)
user_grants            → invitaciones pendientes de provisioning por email
superadmin_grants      → grants de superadmin pendientes
superadmins            → tabla de superadmins del sistema
```

## Páginas implementadas (dashboard)

### Rutas de auth (`(auth)/`)
- `/auth/login` — login Auth0, `/auth/callback`, `/auth/logout` (manejados por Auth0)
- `/after-login` — provisiona grants y redirige según rol

### Dashboard tenant admin (`(dashboard)/admin/`)
- `/admin` — landing del admin con accesos rápidos
- `/admin/config` — config general del tenant (claude_config, ih_policies, módulos)
- `/admin/users` — lista de tenant_users (solo lectura)
- `/admin/modules` — módulos contratados con config JSONB expandida
- `/admin/audit` — últimas 100 entradas del audit_log
- `/admin/knowledge` — base de conocimiento: subir archivos, agregar URLs, FAQs
  - Panel de detalle con progreso en tiempo real (3 fases)
  - Fase 1: Analizando URL (barra indeterminada)
  - Fase 2: Generando embeddings (barra indeterminada + total de fragmentos)
  - Fase 3: Guardando en BD (barra determinada + velocidad + ETA)

### Dashboard operador (`(dashboard)/`)
- `/queue` — cola de escalaciones y cognitive_checkpoints con Supabase Realtime
- `/analytics` — métricas y NPS
- `/help` — ayuda

### Platform superadmin (`(dashboard)/platform/`)
- `/platform` — overview
- `/platform/tenants` — gestión de tenants
- `/platform/users` — usuarios + invitaciones con provisioning
- `/platform/modules` — catálogo de módulos
- `/platform/agents` — agentes disponibles
- `/platform/monitoring` — monitoreo
- `/platform/audit` — audit log global

### API Routes (`/api/`)
- `POST /api/knowledge/url` — ingestar URL en knowledge base (usa `after()`)
- `POST /api/knowledge/upload` — ingestar archivo PDF/DOCX/TXT (usa `after()`)
- `POST /api/knowledge/faq` — ingestar FAQ manual
- `GET  /api/knowledge/documents` — listar documentos del tenant
- `GET  /api/knowledge/progress` — progreso de procesamiento de un documento
- `POST /api/webhook/whatsapp` — recibir mensajes de WhatsApp

## Knowledge Base — pipeline de procesamiento
```
apps/dashboard/src/lib/knowledge/
├── db.ts        → getKBAdmin() — cliente Supabase sin tipos para tablas KB
└── pipeline.ts  → chunkText(), ingestChunks(), generateEmbedding(), markDocumentError()
```

Flujo:
1. Route handler crea documento en BD con `status: 'processing'`
2. Responde 202 inmediatamente
3. `after()` mantiene la función viva en Vercel y ejecuta:
   a. Fetch de la URL con timeout 30s
   b. Extracción de texto con Cheerio (elimina nav/footer/scripts)
   c. `chunkText()` — divide en chunks de ~2000 chars con 200 chars de overlap
   d. Escribe `chunk_count` en BD ANTES del loop (para que el progress endpoint tenga el total)
   e. `generateEmbeddingsBatch()` — lotes de 100 chunks por call a OpenAI
   f. INSERT en batch en `knowledge_base_chunks`
   g. Actualiza `status: 'ready'`

Constantes:
- `CHUNK_CHARS = 2000`, `OVERLAP = 200`, `OPENAI_BATCH_SIZE = 100`
- Modelo embeddings: `text-embedding-3-small`

## ❌ Qué NO hacer
- No bypassar cognitive_checkpoints por "urgencia" o "eficiencia"
- No llamar Anthropic/OpenAI API desde el browser/cliente
- No crear interacciones sin `actor_type`
- No hardcodear `tenant_id`
- No usar `service_role` en el dashboard Next.js
- No ejecutar pagos o transacciones sensibles sin checkpoint IH resuelto
- No instanciar `Auth0Client` a nivel de módulo (usar `getAuth0()`)
- No usar IIFE async fire-and-forget en Route Handlers en Vercel (usar `after()`)
- No poner `SUPABASE_ANON_KEY` como `SUPABASE_SERVICE_ROLE_KEY` — son llaves distintas
- No poner un slug de tenant como `APP_BASE_URL` — debe ser la URL completa con protocolo

## Próximos pasos (en orden de prioridad)
1. `packages/agents/src/consultation/index.ts` → primer agente Claude
2. `services/api/src/routes/webhook.ts` → procesar mensajes WhatsApp recibidos
3. Migración para habilitar `pgvector` y búsqueda semántica en `knowledge_base_chunks`
4. Endpoint de búsqueda en knowledge base para que los agentes consulten documentos
