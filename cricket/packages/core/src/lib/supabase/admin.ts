/**
 * ⚠️ SOLO server-side (services/api, Server Components, Server Actions) — NUNCA en cliente
 * Bypasa RLS. Usar solo para operaciones de sistema.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types'

let _client: SupabaseClient<Database> | undefined

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('[cricket/admin] SUPABASE_SERVICE_ROLE_KEY no definida. Solo para backend.')
  }
  if (!_client) {
    _client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
  }
  return _client
}
