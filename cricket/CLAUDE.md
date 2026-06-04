# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es Cricket
SaaS multi-tenant que implementa agentes IA para gestionar el customer journey completo.
Clientes: bancos, retailers, salud, telecom. Cada cliente tiene su subdominio: `banco.mycricket.ai`.

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
│   ├── dashboard/               → Next.js 15 (App Router) — portal del cliente
│   └── widget/                  → React — chat embebido para web
├── packages/
│   ├── core/                    → tipos TypeScript, Supabase clients (único package creado hasta ahora)
│   ├── agents/                  → agentes Claude (por crear)
│   ├── channels/                → adaptadores WhatsApp, Web Chat, Email (por crear)
│   └── sectors/                 → extensiones por sector (por crear)
├── services/
│   └── api/                     → Node.js + Fastify — API principal + webhook receiver (por crear)
└── supabase/
    └── migrations/              → cricket_001_initial_schema.sql ya aplicado
```

## Stack
| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript strict, Tailwind |
| Backend | Node.js + Fastify, TypeScript |
| DB | Supabase (PostgreSQL 17) con Row Level Security |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Auth | Supabase Auth + JWT custom claims (`tenant_id`, `user_role`) |
| Multi-tenancy | Subdominio por tenant, resuelto en `apps/dashboard/middleware.ts` |
| Realtime | Supabase Realtime (escaladas, checkpoints, sesiones activas) |

## Setup inicial (una vez al clonar)
```bash
./setup.sh                                          # instala deps, crea .env.local
# Editar .env.local con las credenciales reales
npx supabase link --project-ref TU_PROJECT_REF      # conectar CLI al proyecto remoto
pnpm db:push                                        # aplicar schema
pnpm db:types                                       # generar tipos TypeScript
```
Tras el push, registrar el Auth Hook en Supabase Dashboard:
`Authentication → Hooks → Custom Access Token → public.cricket_custom_access_token_hook`

## Comandos
```bash
pnpm dev          # Levanta dashboard + api en paralelo
pnpm build        # Compila packages primero, luego apps y services
pnpm type-check   # Verifica tipos en todos los packages (requiere que exista supabase.generated.ts)
pnpm db:types     # Regenera packages/core/src/types/supabase.generated.ts (correr tras cada migración)
pnpm db:push      # Aplica migraciones al proyecto Supabase remoto
pnpm db:reset     # Resetea la DB local y re-aplica todas las migraciones
pnpm db:studio    # Abre Supabase Studio local
```

> `pnpm type-check` falla si `supabase.generated.ts` no existe todavía — correr `pnpm db:types` primero.

## Reglas de código

### TypeScript
- `strict: true` en todos los tsconfig. Cero `any`.
- Importar tipos del schema desde `@cricket/core/types` (genera `pnpm db:types`)
- Errores: usar tipos de error explícitos, nunca `catch(e: any)`

### Supabase — clientes
```
packages/core/src/lib/supabase/client.ts   → cliente browser (Client Components)
packages/core/src/lib/supabase/server.ts   → cliente servidor (Server Components, Route Handlers)
packages/core/src/lib/supabase/admin.ts    → service_role (SOLO en services/api)
```
Imports via los export paths del package:
```typescript
import { createClient } from '@cricket/core/supabase/client'
import { createClient } from '@cricket/core/supabase/server'
import { supabaseAdmin }  from '@cricket/core/supabase/admin'
```
- ❌ NUNCA usar el cliente browser en Server Components
- ❌ NUNCA exponer `SUPABASE_SERVICE_ROLE_KEY` en el cliente
- ❌ NUNCA bypassar RLS desde el dashboard

### Multi-tenancy
- Tenant se resuelve en `apps/dashboard/middleware.ts` leyendo el subdominio del host
- Header `x-tenant-slug` propaga el slug a todos los Server Components
- En localhost, el slug viene de `DEV_TENANT_SLUG` (`.env.local`)
- ❌ NUNCA hardcodear `tenant_id` en ningún query

### Agentes (`packages/agents/`)
Todo agente implementa `Agent { run(input: AgentInput, ctx: AgentContext): Promise<AgentOutput> }`.

`AgentOutput` completo (definido en `packages/core/src/types/index.ts`):
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
`EscalationRequired` es el error que lanza un agente cuando debe escalar (definido en `@cricket/core/types`).

### Nomenclatura
- Archivos: `kebab-case.ts`
- Funciones/variables: `camelCase`
- Tipos/interfaces: `PascalCase`
- Constantes: `UPPER_SNAKE_CASE`
- Rutas Next.js: `kebab-case` (carpetas)

## Variables de entorno críticas
```bash
NEXT_PUBLIC_SUPABASE_URL          # URL del proyecto (pública)
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Anon key (pública, RLS la protege)
SUPABASE_SERVICE_ROLE_KEY         # ⚠️ SOLO en services/api — NUNCA en cliente
SUPABASE_PROJECT_REF              # Ref del proyecto para el CLI
ANTHROPIC_API_KEY                 # Para agentes Claude — SOLO en servicios server-side
DEV_TENANT_SLUG                   # Slug del tenant en desarrollo local (ej: 'banco-dev')
```

## Schema — tablas clave
```
tenants              → clientes de Cricket (slug = subdominio)
tenant_users         → operadores/admins (ligados a Supabase Auth)
tenant_modules       → qué módulos contrató cada cliente + fallback config
end_users            → clientes finales (identificados por canal, no tienen login)
journey_templates    → blueprints del journey configurables por tenant
sessions             → instancias activas del journey (actor_control = quien manda ahora)
interactions         → cada mensaje/acción (actor_type es el campo de auditoría central)
ai_decisions         → decisiones de Claude (confidence + reasoning)
cognitive_checkpoints→ momentos IA+IH donde el humano DEBE decidir
escalations          → handoffs completos AI→Humano con context_summary
audit_log            → inmutable, append-only (requerido para cumplimiento bancario)
```

## ❌ Qué NO hacer
- No bypassar cognitive_checkpoints por "urgencia" o "eficiencia"
- No llamar Anthropic API desde el browser/cliente
- No crear interacciones sin `actor_type`
- No hardcodear `tenant_id`
- No usar `service_role` en el dashboard Next.js
- No ejecutar pagos o transacciones sensibles sin checkpoint IH resuelto

## Próximos archivos a crear (en orden)
1. `packages/agents/src/consultation/index.ts` → primer agente
2. `services/api/src/routes/webhook.ts` → recibir mensajes WhatsApp
3. `apps/dashboard/src/app/(auth)/login/page.tsx` → login con tenant detection
