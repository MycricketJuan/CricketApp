import { getAuth0 } from '@/lib/auth0'

export default async function VerifyRegistrationPage() {
  const session = await getAuth0().getSession()
  const email = session?.user.email as string | undefined

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-xl">✉</div>
      <h1 className="text-2xl font-bold text-gray-900">Verifica tu correo</h1>
      <p className="mt-3 text-sm leading-6 text-gray-600">
        Auth0 envió un enlace de verificación{email ? ` a ${email}` : ''}. Ábrelo antes de crear el espacio de tu empresa.
      </p>
      <a
        href="/auth/login?prompt=login&returnTo=/register/complete"
        className="mt-6 block w-full rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
      >
        Ya verifiqué mi correo
      </a>
      <a href="/auth/logout?returnTo=/register" className="mt-4 inline-block text-sm text-gray-500 underline underline-offset-4">
        Usar otra cuenta
      </a>
    </div>
  )
}
