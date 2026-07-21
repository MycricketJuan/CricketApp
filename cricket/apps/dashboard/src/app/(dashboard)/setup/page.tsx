import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'

export default async function SetupPage() {
  const headerStore = await headers()
  const tenantSlug = headerStore.get('x-tenant-slug') ?? ''
  const { data: tenant } = await getSupabaseAdmin()
    .from('tenants')
    .select('name, slug, sector')
    .eq('slug', tenantSlug)
    .maybeSingle()

  if (!tenant) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No pudimos resolver el espacio empresarial activo. Vuelve a iniciar sesión.
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="text-sm font-semibold text-emerald-700">Registro completado</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">Bienvenido a {tenant.name}</h1>
        <p className="mt-2 text-sm text-gray-600">
          Tu cuenta quedó vinculada como administradora de <strong>{tenant.slug}.mycricket.ai</strong>.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Siguiente paso</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          El espacio y sus módulos iniciales ya están listos. Continúa configurando la base de conocimiento mientras habilitamos la conexión guiada de WhatsApp.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="/admin/knowledge" className="rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">
            Configurar conocimiento
          </a>
          <a href="/admin" className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Ir al panel administrativo
          </a>
        </div>
      </div>
    </div>
  )
}
