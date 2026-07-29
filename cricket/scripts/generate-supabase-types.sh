#!/usr/bin/env bash
# Regenera packages/core/src/types/supabase.generated.ts desde el schema
# real de Supabase.
#
# Funciona en dos contextos:
# - Build de Vercel: no interactivo, usa SUPABASE_ACCESS_TOKEN (env var)
#   para autenticar el CLI sin `supabase login`.
# - Desarrollo local: usa la sesión de `supabase login` / `supabase link`
#   que ya tengas en la máquina.
#
# Nunca trunca el archivo committeado si la generación falla — así un
# CLI no autenticado o sin red no vuelve a dejar el archivo vacío y
# rompiendo `next build` (fue justo lo que pasó la vez anterior).
set -euo pipefail
cd "$(dirname "$0")/.."

OUT_FILE="packages/core/src/types/supabase.generated.ts"
PROJECT_REF="${SUPABASE_PROJECT_REF:-}"

if [ -z "$PROJECT_REF" ]; then
  echo "⚠️  SUPABASE_PROJECT_REF no está definida — se mantiene $OUT_FILE tal cual"
  exit 0
fi

TMP_FILE="$(mktemp)"
LOG_FILE="$(mktemp)"

if npx --yes supabase gen types typescript --project-id "$PROJECT_REF" --schema public > "$TMP_FILE" 2>"$LOG_FILE"; then
  if grep -q "export type Database" "$TMP_FILE"; then
    mv "$TMP_FILE" "$OUT_FILE"
    echo "✓ tipos de Supabase regenerados en $OUT_FILE"
  else
    echo "⚠️  La salida de 'supabase gen types' no parece un módulo válido — se mantiene $OUT_FILE tal cual"
    cat "$LOG_FILE"
  fi
else
  echo "⚠️  No se pudieron regenerar los tipos de Supabase (¿falta SUPABASE_ACCESS_TOKEN o falta 'supabase login' local?) — se mantiene $OUT_FILE tal cual"
  cat "$LOG_FILE"
fi

rm -f "$TMP_FILE" "$LOG_FILE"
exit 0
