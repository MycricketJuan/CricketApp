import { headers } from 'next/headers'

export default async function LoginPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'dev'

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-ink">ZEREZ</h1>
        <p className="text-sm text-ink-subtle">
          Workspace:{' '}
          <span className="font-medium text-ink">{tenantSlug}</span>
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border-soft bg-surface-100 p-6 shadow-sm">
        {/* Usar <a> en lugar de Link para que Auth0 no entre en client-side routing */}
        <a
          href="/auth/login"
          className="block w-full rounded-lg bg-primary py-2 text-center text-sm
                     font-medium text-white hover:bg-primary-hover"
        >
          Iniciar sesión
        </a>

        <p className="text-center text-sm text-ink-subtle">
          ¿Tu empresa aún no usa ZEREZ?{' '}
          <a href="/register" className="font-medium text-ink underline underline-offset-4">
            Crear cuenta
          </a>
        </p>

        <div className="flex items-center gap-3">
          <hr className="flex-1 border-border-soft" />
          <span className="text-xs text-ink-subtle">o</span>
          <hr className="flex-1 border-border-soft" />
        </div>

        <button
          type="button"
          disabled
          className="w-full rounded-lg border border-border-strong py-2 text-sm
                     text-ink-subtle cursor-not-allowed"
        >
          Continuar con SSO
        </button>
      </div>
    </div>
  )
}
