import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

// Las tablas knowledge_base_* no están en los tipos generados hasta que
// se aplique la migración 20260619000000 y se regeneren con pnpm db:types.
// Este helper devuelve el cliente sin tipos para esas tablas.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getKBAdmin(): SupabaseClient<any> {
  return getSupabaseAdmin() as unknown as SupabaseClient<any>
}
