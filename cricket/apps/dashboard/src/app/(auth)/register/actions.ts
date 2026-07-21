'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import {
  createRegistrationDraft,
  REGISTRATION_DRAFT_COOKIE,
  REGISTRATION_DRAFT_MAX_AGE,
  RegistrationDraftError,
} from '@/lib/registration/draft'

export async function startBusinessRegistration(formData: FormData): Promise<void> {
  let draft

  try {
    draft = createRegistrationDraft(formData)
  } catch (error) {
    const message = error instanceof RegistrationDraftError
      ? error.message
      : 'No fue posible iniciar el registro'
    redirect(`/register?error=${encodeURIComponent(message)}`)
  }

  const { data: existing, error: availabilityError } = await getSupabaseAdmin()
    .from('tenants')
    .select('id')
    .eq('slug', draft.slug)
    .maybeSingle()

  if (availabilityError) {
    redirect('/register?error=' + encodeURIComponent('No pudimos validar el identificador. Intenta nuevamente.'))
  }
  if (existing) {
    redirect('/register?error=' + encodeURIComponent(`El identificador "${draft.slug}" ya está en uso`))
  }

  const cookieStore = await cookies()
  cookieStore.set(REGISTRATION_DRAFT_COOKIE, JSON.stringify(draft), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: REGISTRATION_DRAFT_MAX_AGE,
  })

  redirect('/auth/login?screen_hint=signup&returnTo=/register/complete')
}
