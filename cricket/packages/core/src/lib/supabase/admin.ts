/**
 * ⚠️ SOLO en services/api — NUNCA en apps/dashboard ni widget
 * Bypasa RLS. Usar solo para operaciones de sistema.
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('[cricket/admin] SUPABASE_SERVICE_ROLE_KEY no definida. Solo para backend.')
}

export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
