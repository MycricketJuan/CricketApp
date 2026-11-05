'use client'

import { useState, useTransition } from 'react'
import { signDocument } from './actions'

export function SignButton({ tramiteId }: { tramiteId: string }) {
  const [isPending, startTransition] = useTransition()
  const [signed, setSigned] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await signDocument(tramiteId)
      if (result?.error) setError(result.error)
      else setSigned(true)
    })
  }

  if (signed) {
    return (
      <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
        Documento firmado correctamente. En breve te contactaremos por WhatsApp para el siguiente paso.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? 'Firmando...' : 'Firmar documento digitalmente'}
      </button>
    </div>
  )
}
