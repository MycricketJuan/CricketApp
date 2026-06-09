import { headers } from 'next/headers'

export default async function LoginPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'app'

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Cricket</h1>
        <p className="text-sm text-gray-500">
          Workspace:{' '}
          <span className="font-medium text-gray-900">{tenantSlug}</span>
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Usar <a> en lugar de Link para que Auth0 no entre en client-side routing */}
        <a
          href="/auth/login"
          className="block w-full rounded-lg bg-black py-2 text-center text-sm
                     font-medium text-white hover:bg-gray-900"
        >
          Iniciar sesión
        </a>

        <div className="flex items-center gap-3">
          <hr className="flex-1 border-gray-200" />
          <span className="text-xs text-gray-400">o</span>
          <hr className="flex-1 border-gray-200" />
        </div>

        <button
          type="button"
          disabled
          className="w-full rounded-lg border border-gray-300 py-2 text-sm
                     text-gray-400 cursor-not-allowed"
        >
          Continuar con SSO
        </button>
      </div>
    </div>
  )
}
