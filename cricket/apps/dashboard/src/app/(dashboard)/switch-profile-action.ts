'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth0 } from '@/lib/auth0'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'

export async function switchProfile(tenantSlug: string): Promise<void> {
  const session = await auth0.getSession()
  if (!session) redirect('/auth/login')

  const userId = session.user.sub as string
  const db     = getSupabaseAdmin()

  // Verificar que el usuario realmente tiene acceso a este tenant
  const { data: profile } = await db
    .from('tenant_users')
    .select('id, tenants!inner(slug)')
    .eq('auth0_sub', userId)
    .eq('is_active', true)
    .eq('tenants.slug', tenantSlug)
    .maybeSingle()

  if (!profile) {
    throw new Error('Acceso denegado a este perfil')
  }

  const cookieStore = await cookies()
  cookieStore.set('cricket_active_tenant', tenantSlug, {
    path:     '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 30,  // 30 días
  })

  redirect('/')
}
