import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export interface PazYSalvoPdfData {
  tenantName: string
  tramiteId: string
  customerName: string | null
  documentNumber: string
  producto: string
  destinoCertificado: string
  issuedAt: Date
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
}

// Certificado simple de una página. No hay integración con un
// proveedor de firma/plantillas del banco real — es el documento que
// se entrega al cliente tras validar que no tiene deuda pendiente
// (ver check_debt_status / mock_client_debts).
export async function generatePazYSalvoPdf(data: PazYSalvoPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89]) // A4
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const margin = 60
  let y = 780

  const drawLine = (text: string, opts: { size?: number; f?: typeof font; gap?: number } = {}) => {
    const { size = 11, f = font, gap = 22 } = opts
    page.drawText(text, { x: margin, y, size, font: f, color: rgb(0.1, 0.1, 0.1) })
    y -= gap
  }

  drawLine(data.tenantName.toUpperCase(), { size: 14, f: bold, gap: 40 })
  drawLine('CERTIFICADO DE PAZ Y SALVO', { size: 16, f: bold, gap: 36 })

  drawLine(`Radicado No.: ${data.tramiteId}`)
  drawLine(`Fecha de expedición: ${formatDate(data.issuedAt)}`, { gap: 34 })

  drawLine('El presente documento certifica que:', { f: bold, gap: 26 })
  if (data.customerName) drawLine(`Cliente: ${data.customerName}`)
  drawLine(`Documento de identidad: ${data.documentNumber}`)
  drawLine(`Producto: ${data.producto}`)
  drawLine(`Destino del certificado: ${data.destinoCertificado}`, { gap: 34 })

  drawLine(
    'Se encuentra a paz y salvo por todo concepto con la entidad respecto al',
    { gap: 16 },
  )
  drawLine('producto referenciado, a la fecha de expedición de este certificado.', { gap: 40 })

  page.drawText(
    'Este certificado fue generado y validado por Cricket. Cualquier inconsistencia',
    { x: margin, y, size: 8, font, color: rgb(0.5, 0.5, 0.5) },
  )
  y -= 12
  page.drawText(
    'debe reportarse directamente a la entidad emisora.',
    { x: margin, y, size: 8, font, color: rgb(0.5, 0.5, 0.5) },
  )

  return doc.save()
}
