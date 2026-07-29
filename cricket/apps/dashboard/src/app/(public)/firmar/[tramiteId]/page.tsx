export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getTramitesAdmin } from '@/lib/tramites/db'
import { SignButton } from './sign-button'

export default async function FirmarPage({
  params,
}: {
  params: Promise<{ tramiteId: string }>
}) {
  const { tramiteId } = await params
  const db = getTramitesAdmin()

  const { data: tramite } = await db
    .from('tramites')
    .select('id, label, collected_data')
    .eq('id', tramiteId)
    .eq('tramite_type', 'levantamiento_de_prenda')
    .single()

  if (!tramite) notFound()

  const collectedData = tramite.collected_data as Record<string, unknown>
  const stage = collectedData.stage as string | undefined
  const placa = collectedData.placa as string | undefined
  const alreadySigned = stage && stage !== 'awaiting_signature' && stage !== 'document_confirmed'

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{tramite.label}</h1>
        {placa && <p className="mt-1 text-sm text-gray-500">Vehículo placa {placa}</p>}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-700">
          Al firmar, aceptas el documento de levantamiento de la prenda sobre tu vehículo,
          generado a partir de los datos que confirmaste por WhatsApp. Esta es una firma
          digital simulada dentro del proceso de Cricket.
        </p>
      </div>

      {alreadySigned ? (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          Este documento ya fue firmado.
        </p>
      ) : stage !== 'awaiting_signature' ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Este documento aún no está listo para firma.
        </p>
      ) : (
        <SignButton tramiteId={tramite.id} />
      )}
    </main>
  )
}
