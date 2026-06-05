'use client'

import { useActionState } from 'react'
import { loginAction, type LoginState } from './actions'

export function LoginForm({ tenantSlug }: { tenantSlug: string }) {
  const [state, action, pending] = useActionState<LoginState | null, FormData>(loginAction, null)

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Cricket</h1>
        <p className="text-sm text-gray-500">
          Workspace:{' '}
          <span className="font-medium text-gray-900">{tenantSlug}</span>
        </p>
      </div>

      <form
        action={action}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                       placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                       placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {state?.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-black py-2 text-sm font-medium text-white
                     hover:bg-gray-900 disabled:opacity-60 transition-opacity"
        >
          {pending ? 'Ingresando…' : 'Ingresar'}
        </button>

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
      </form>
    </div>
  )
}
