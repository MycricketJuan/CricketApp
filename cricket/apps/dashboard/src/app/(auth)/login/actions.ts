'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@cricket/core/supabase/server'
import type { UserRole } from '@cricket/core/types'

const ROLE_REDIRECT: Record<UserRole, string> = {
  operator:     '/queue',
  supervisor:   '/dashboard',
  tenant_admin: '/admin',
  superadmin:   '/platform',
}

export interface LoginState {
  error?: string
}

export async function loginAction(
  _prev: LoginState | null,
  formData: FormData,
): Promise<LoginState> {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  // Leer user_role del JWT puesto por cricket_custom_access_token_hook.
  // El payload es base64url → normalizar a base64 estándar antes de decodificar.
  const raw = data.session.access_token.split('.')[1]
  const base64 = raw.replace(/-/g, '+').replace(/_/g, '/')
  const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8')) as {
    user_role?: string
  }
  const userRole = (payload.user_role ?? 'operator') as UserRole

  redirect(ROLE_REDIRECT[userRole] ?? '/dashboard')
}
