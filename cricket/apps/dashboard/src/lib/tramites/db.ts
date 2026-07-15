import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

// La tabla tramites no está en los tipos generados hasta que se
// aplique la migración 20240103000000_tramites.sql y se regeneren
// con pnpm db:types. Este helper devuelve el cliente sin tipos
// para esa tabla (mismo patrón que getKBAdmin).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTramitesAdmin(): SupabaseClient<any> {
  return getSupabaseAdmin() as unknown as SupabaseClient<any>
}
