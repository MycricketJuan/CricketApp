#!/bin/bash
# ============================================================
# Cricket — Setup inicial del proyecto
# Ejecutar una sola vez al clonar el repo
# ============================================================
set -e

echo "🦗 Cricket — Setup inicial"
echo ""

# 1. Instalar dependencias
echo "→ Instalando dependencias..."
pnpm install

# 2. Copiar variables de entorno
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "→ .env.local creado desde .env.example"
  echo "  ⚠️  Edita .env.local con tus credenciales antes de continuar"
else
  echo "→ .env.local ya existe (no se sobreescribe)"
fi

# 3. Inicializar Supabase CLI
if [ ! -f supabase/config.toml ]; then
  echo "→ Inicializando Supabase..."
  npx supabase init
fi

echo ""
echo "✅ Setup completo. Próximos pasos:"
echo ""
echo "  1. Edita .env.local con:"
echo "     - NEXT_PUBLIC_SUPABASE_URL"
echo "     - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "     - SUPABASE_SERVICE_ROLE_KEY"
echo "     - SUPABASE_PROJECT_REF"
echo "     - ANTHROPIC_API_KEY"
echo ""
echo "  2. Conecta la CLI a tu proyecto de Supabase:"
echo "     npx supabase link --project-ref TU_PROJECT_REF"
echo ""
echo "  3. Aplica el schema:"
echo "     cp cricket_001_initial_schema.sql supabase/migrations/20240101000000_initial_schema.sql"
echo "     pnpm db:push"
echo ""
echo "  4. Genera los tipos TypeScript:"
echo "     pnpm db:types"
echo ""
echo "  5. Registra el Auth Hook en Supabase Dashboard:"
echo "     Authentication → Hooks → Custom Access Token"
echo "     → public.cricket_custom_access_token_hook"
echo ""
echo "  6. Levanta el proyecto:"
echo "     pnpm dev"
