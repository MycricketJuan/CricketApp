import { getSupabaseAdmin } from './admin'

const TRAMITE_DOCUMENTS_BUCKET = 'tramite-documents'
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60 // 24h — suficiente para que Twilio descargue el adjunto

// Sube un documento de trámite (PDF generado, comprobantes, etc.) y
// devuelve una URL firmada de corta duración — el bucket es privado,
// nunca se expone públicamente.
export async function uploadTramiteDocument(
  path: string,
  data: Uint8Array,
  contentType: string,
): Promise<string> {
  const supabase = getSupabaseAdmin()

  const { error: uploadError } = await supabase.storage
    .from(TRAMITE_DOCUMENTS_BUCKET)
    .upload(path, data, { contentType, upsert: true })

  if (uploadError) {
    throw new Error(`No se pudo subir el documento a Storage: ${uploadError.message}`)
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(TRAMITE_DOCUMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (signError || !signed) {
    throw new Error(`No se pudo generar la URL firmada: ${signError?.message ?? 'sin URL'}`)
  }

  return signed.signedUrl
}
