# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm TypeScript monorepo. `apps/dashboard/` contains the Next.js 15 App Router dashboard; routes, layouts, Server Actions, and API handlers live under `src/app/`. `services/api/` is the Fastify API. Shared domain types, the journey engine, and Supabase clients belong in `packages/core/`; AI agents and tools in `packages/agents/`; sector-specific configuration in `packages/sectors/`. Database migrations and demo seeds are under `supabase/`, while product specifications live in `docs/spec/`.

## Build, Test, and Development Commands

- `pnpm install` installs all workspace dependencies (pnpm 9.4 is declared).
- `pnpm dev` starts dashboard and API development servers in parallel; the dashboard uses port 3000.
- `pnpm build` builds shared packages before applications and services.
- `pnpm type-check` runs TypeScript checks across every workspace.
- `pnpm db:push` applies Supabase migrations; `pnpm db:reset` rebuilds the local database and is destructive.
- `pnpm db:types` regenerates `packages/core/src/types/supabase.generated.ts` and requires `SUPABASE_PROJECT_REF`.

There is currently no automated test command. Before submitting changes, run `pnpm type-check` and `pnpm build`; add focused tests alongside new test infrastructure when introducing it.

## Coding Style & Naming Conventions

Use strict TypeScript with two-space indentation and avoid `any`. Name files and route folders in `kebab-case`, variables/functions in `camelCase`, types/interfaces in `PascalCase`, and constants in `UPPER_SNAKE_CASE`. Prefer workspace imports such as `@cricket/core/types` and the dashboard alias `@/`. No formatter or linter is configured, so preserve nearby formatting and keep imports organized.

## Architecture, Security & Configuration

Never hardcode `tenant_id`; tenant context comes from middleware and `x-tenant-slug`. Use the appropriate browser, server, or admin Supabase client, and never expose `SUPABASE_SERVICE_ROLE_KEY`. Instantiate Auth0 through the lazy `getAuth0()` helper. Keep secrets in `.env.local`, using `.env.example` as the template. Sensitive agent actions must require human approval, and every interaction must retain actor attribution.

## Commit & Pull Request Guidelines

Recent history uses descriptive, sentence-style commit messages, often in Spanish, that explain the behavior and rationale. Keep each commit focused and use an imperative summary where practical. Pull requests should describe the user-visible effect, affected workspaces, database or environment changes, and validation performed. Link relevant issues/specs and include screenshots for dashboard changes; call out new migrations and deployment variables explicitly.
