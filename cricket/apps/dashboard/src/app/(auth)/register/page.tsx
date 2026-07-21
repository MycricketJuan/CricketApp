import { startBusinessRegistration } from './actions'

interface RegisterPageProps {
  searchParams: Promise<{ error?: string }>
}

const SECTORS = [
  { value: 'retail', label: 'Retail y comercio' },
  { value: 'health', label: 'Salud' },
  { value: 'banking', label: 'Servicios financieros' },
  { value: 'telecom', label: 'Telecomunicaciones' },
  { value: 'government', label: 'Gobierno' },
]

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { error } = await searchParams

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Cricket</p>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Crea el espacio de tu empresa</h1>
        <p className="text-sm text-gray-600">
          Configura la organización y luego crea tu cuenta de acceso segura con Auth0.
        </p>
      </div>

      <form action={startBusinessRegistration} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <label className="block space-y-2">
          <span className="text-sm font-medium text-gray-800">Nombre de la empresa</span>
          <input
            name="companyName"
            required
            minLength={2}
            maxLength={120}
            autoComplete="organization"
            placeholder="Ej. Clínica Horizonte"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-gray-800">Identificador del espacio</span>
          <div className="flex rounded-lg border border-gray-300 focus-within:border-gray-900 focus-within:ring-2 focus-within:ring-gray-200">
            <input
              name="slug"
              required
              minLength={3}
              maxLength={63}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="clinica-horizonte"
              className="min-w-0 flex-1 rounded-l-lg px-3 py-2.5 text-sm outline-none"
            />
            <span className="flex items-center rounded-r-lg bg-gray-50 px-3 text-xs text-gray-500">.mycricket.ai</span>
          </div>
          <span className="text-xs text-gray-500">Solo letras minúsculas, números y guiones.</span>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-gray-800">Sector</span>
          <select
            name="sector"
            required
            defaultValue=""
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
          >
            <option value="" disabled>Selecciona un sector</option>
            {SECTORS.map(sector => (
              <option key={sector.value} value={sector.value}>{sector.label}</option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          Continuar con Auth0
        </button>

        <p className="text-center text-xs leading-5 text-gray-500">
          Tu contraseña se introduce directamente en Auth0 y nunca pasa por Cricket.
        </p>
      </form>

      <p className="text-center text-sm text-gray-600">
        ¿Ya tienes una cuenta?{' '}
        <a href="/login" className="font-medium text-gray-900 underline underline-offset-4">Inicia sesión</a>
      </p>
    </div>
  )
}
