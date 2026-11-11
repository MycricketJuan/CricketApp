// Resolución de tenant y usuario para las rutas de representación.
// Igual que el webhook: el tenant viene del header x-tenant-slug (lo pone el
// middleware), con fallback a DEV_TENANT_SLUG en local/preview.

import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { getAuth0 } from '@/lib/auth0'

export interface TenantContext {
  tenantId: string
  slug: string
  claudeModel: string | null
  createdBy: string | null
}

const DEFAULT_MODEL = 'claude-sonnet-5-5'

export async function resolveTenantContext(req: NextRequest): Promise<TenantContext | null> {
  const slug = req.headers.get('x-tenant-slug') || process.env.DEV_TENANT_SLUG || 'dev'

  const db = getSupabaseAdmin()
  const { data: tenant } = await db
    .from('tenants')
    .select('id, slug, claude_config')
    .eq('slug', slug)
    .single()

  if (!tenant) return null

  const claudeConfig = tenant.claude_config as unknown as { model?: string } | null

  let createdBy: string | null = null
  try {
    const session = await getAuth0().getSession()
    createdBy = (session?.user?.sub as string | undefined)
      ?? (session?.user?.email as string | undefined)
      ?? null
  } catch {
    createdBy = null
  }

  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    claudeModel: claudeConfig?.model ?? DEFAULT_MODEL,
    createdBy,
  }
}

export { DEFAULT_MODEL }
