'use client'

export default function UsersError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  return (
    <div className="p-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-sm font-semibold text-red-800 mb-2">Error cargando la página de usuarios</h2>
        <p className="text-sm text-red-700 font-mono">{error.message}</p>
        {error.digest && (
          <p className="text-xs text-red-500 mt-1">Digest: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
