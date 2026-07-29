-- ============================================================
-- Cricket — Bucket de Storage para documentos de trámites
-- Certificados de paz y salvo generados, documentos de firma de
-- levantamiento de prenda, etc. Privado: solo se accede vía URLs
-- firmadas generadas server-side con el service role.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('tramite-documents', 'tramite-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "service role gestiona tramite-documents" ON storage.objects;
CREATE POLICY "service role gestiona tramite-documents"
  ON storage.objects FOR ALL
  USING (bucket_id = 'tramite-documents')
  WITH CHECK (bucket_id = 'tramite-documents');
