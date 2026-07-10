'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

type DocStatus = 'processing' | 'ready' | 'error'

export interface KBDocument {
  id: string
  title: string
  source_type: string
  source_url: string | null
  file_name: string | null
  status: DocStatus
  chunk_count: number
  error_msg: string | null
  created_at: string
  updated_at: string
}

interface Props {
  tenantId: string
  initialDocuments: KBDocument[]
}

type Tab = 'files' | 'urls' | 'faq'

// ── Status badge ─────────────────────────────────────────────

function StatusBadge({ status, animated }: { status: DocStatus; animated?: boolean }) {
  const styles: Record<DocStatus, string> = {
    processing: 'bg-yellow-100 text-yellow-800',
    ready:      'bg-green-100  text-green-800',
    error:      'bg-red-100    text-red-800',
  }
  const labels: Record<DocStatus, string> = {
    processing: 'Procesando…',
    ready:      'Listo',
    error:      'Error',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status === 'processing' && animated && (
        <span className="inline-block h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
      )}
      {labels[status]}
    </span>
  )
}

// ── Elapsed timer ─────────────────────────────────────────────

function ElapsedTimer({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(since).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [since])

  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return <span className="tabular-nums">{m > 0 ? `${m}m ` : ''}{s}s</span>
}

// ── Progress data ─────────────────────────────────────────────

interface ProgressData {
  status: string
  processed: number
  total: number
  started_at: string
}

// ── Doc detail panel ──────────────────────────────────────────

function DocDetailPanel({
  doc,
  tenantId,
  onClose,
  onUpdate,
}: {
  doc: KBDocument
  tenantId: string
  onClose: () => void
  onUpdate: (updater: (prev: KBDocument[]) => KBDocument[]) => void
}) {
  const [current, setCurrent]   = useState<KBDocument>(doc)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [elapsed, setElapsed]   = useState(0)

  // Keep in sync when parent passes a new version
  useEffect(() => { setCurrent(doc) }, [doc])

  // Elapsed timer (seconds since created_at)
  useEffect(() => {
    if (current.status !== 'processing') return
    const start = new Date(current.created_at).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [current.status, current.created_at])

  // Poll /api/knowledge/progress (1.5s while total=0, 3s otherwise)
  useEffect(() => {
    if (current.status !== 'processing') return

    const poll = async () => {
      const res = await fetch(
        `/api/knowledge/progress?document_id=${current.id}&tenant_id=${tenantId}`
      )
      if (!res.ok) return
      const data = await res.json() as ProgressData
      setProgress(data)

      if (data.status !== 'processing') {
        const listRes = await fetch(`/api/knowledge/documents?tenant_id=${tenantId}`)
        if (listRes.ok) {
          const list = await listRes.json() as KBDocument[]
          onUpdate(() => list)
          const updated = list.find(d => d.id === current.id)
          if (updated) setCurrent(updated)
        }
      }
    }

    poll()
    const interval = !progress || progress.total === 0 ? 1500 : 3000
    const id = setInterval(poll, interval)
    return () => clearInterval(id)
  }, [current.status, current.id, tenantId, onUpdate, progress?.total])

  const SOURCE_LABELS: Record<string, string> = { file: 'Archivo', url: 'URL', faq: 'FAQ' }

  function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0">
        <span className="text-sm text-gray-500 shrink-0 w-36">{label}</span>
        <span className="text-sm text-gray-900 text-right break-all">{children}</span>
      </div>
    )
  }

  // Derived progress values
  const pct          = progress && progress.total > 0 ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : null
  const elapsedMins  = elapsed / 60
  const rate         = elapsed > 30 && progress && progress.processed > 0 ? progress.processed / elapsedMins : null
  const etaMins      = rate && progress && progress.total > progress.processed ? Math.ceil((progress.total - progress.processed) / rate) : null

  const fmtElapsed = () => {
    const m = Math.floor(elapsed / 60)
    const s = elapsed % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Slide-over */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Detalle del documento</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Metadata */}
          <div>
            <Row label="Título">{current.title}</Row>
            <Row label="Tipo">{SOURCE_LABELS[current.source_type] ?? current.source_type}</Row>
            {current.source_url && (
              <Row label="URL">
                <a
                  href={current.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {current.source_url}
                </a>
              </Row>
            )}
            {current.file_name && <Row label="Archivo">{current.file_name}</Row>}
            <Row label="Estado">
              <StatusBadge status={current.status} animated />
            </Row>
            <Row label="Creado">
              {new Date(current.created_at).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
            </Row>
            {current.updated_at && current.updated_at !== current.created_at && (
              <Row label="Actualizado">
                {new Date(current.updated_at).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
              </Row>
            )}
          </div>

          {/* Processing state — 3 phases */}
          {current.status === 'processing' && (() => {
            const phase = !progress || progress.total === 0
              ? 1
              : progress.processed === 0
                ? 2
                : 3

            const PHASE_LABELS = ['Analizando URL', 'Generando embeddings', 'Guardando en base de datos']
            const PHASE_DESC = [
              'Descargando el contenido de la página y dividiendo en fragmentos para indexar…',
              `Enviando ${progress?.total ?? '…'} fragmentos a OpenAI para generar vectores semánticos…`,
              '',
            ]

            return (
              <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-4 space-y-3">
                <style>{`
                  @keyframes indeterminate {
                    0%   { transform: translateX(-100%); }
                    100% { transform: translateX(400%); }
                  }
                `}</style>

                {/* Phase header */}
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full bg-yellow-400 animate-ping shrink-0" />
                  <p className="text-sm font-semibold text-yellow-900">
                    Fase {phase} de 3 · {PHASE_LABELS[phase - 1]}
                  </p>
                </div>

                {/* Progress bar */}
                {phase < 3 ? (
                  /* Indeterminate */
                  <div className="h-2 w-full rounded-full bg-yellow-200 overflow-hidden">
                    <div
                      className="h-full w-1/3 rounded-full bg-yellow-500"
                      style={{ animation: 'indeterminate 1.5s ease-in-out infinite' }}
                    />
                  </div>
                ) : (
                  /* Determinate */
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-yellow-700">
                      <span>{progress!.processed} de {progress!.total} fragmentos</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-yellow-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-yellow-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Description */}
                {phase < 3 && (
                  <p className="text-xs text-yellow-700">{PHASE_DESC[phase - 1]}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-yellow-100 px-3 py-2">
                    <p className="text-xs text-yellow-600">Tiempo transcurrido</p>
                    <p className="text-sm font-medium text-yellow-800 tabular-nums">{fmtElapsed()}</p>
                  </div>
                  {rate !== null && (
                    <div className="rounded-lg bg-yellow-100 px-3 py-2">
                      <p className="text-xs text-yellow-600">Velocidad</p>
                      <p className="text-sm font-medium text-yellow-800 tabular-nums">~{rate.toFixed(1)} frg/min</p>
                    </div>
                  )}
                  {etaMins !== null && (
                    <div className="rounded-lg bg-yellow-100 px-3 py-2 col-span-2">
                      <p className="text-xs text-yellow-600">Tiempo estimado restante</p>
                      <p className="text-sm font-medium text-yellow-800">
                        ~{etaMins < 1 ? 'menos de 1 min' : `${etaMins} min`}
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-yellow-400">Esta vista se actualiza automáticamente.</p>
              </div>
            )
          })()}

          {/* Ready state */}
          {current.status === 'ready' && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-4">
              <p className="text-sm font-medium text-green-800">Documento listo</p>
              <p className="text-xs text-green-700 mt-1">
                {current.chunk_count} fragmento{current.chunk_count !== 1 ? 's' : ''} indexado{current.chunk_count !== 1 ? 's' : ''} y disponibles para búsqueda semántica.
              </p>
            </div>
          )}

          {/* Error state */}
          {current.status === 'error' && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-4">
              <p className="text-sm font-medium text-red-800">Error al procesar</p>
              {current.error_msg && (
                <p className="text-xs text-red-700 mt-1 font-mono whitespace-pre-wrap break-all">
                  {current.error_msg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Document list ─────────────────────────────────────────────

function DocumentList({
  docs,
  onDelete,
  onSelect,
  onEdit,
}: {
  docs: KBDocument[]
  onDelete: (id: string) => void
  onSelect: (doc: KBDocument) => void
  onEdit?: (doc: KBDocument) => void
}) {
  if (docs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        No hay documentos cargados todavía.
      </p>
    )
  }

  const sourceIcon: Record<string, string> = {
    file: '📄',
    url:  '🌐',
    faq:  '❓',
  }

  return (
    <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
      {docs.map(doc => (
        <li
          key={doc.id}
          className="flex items-center justify-between px-4 py-3 gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => onSelect(doc)}
        >
          <div className="flex items-start gap-3 min-w-0">
            <span className="mt-0.5 text-lg">{sourceIcon[doc.source_type] ?? '📄'}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{doc.title}</p>
              <p className="text-xs text-gray-400">
                {doc.chunk_count > 0 ? `${doc.chunk_count} fragmentos` : ''}
                {doc.source_url ? ` · ${doc.source_url}` : ''}
                {doc.file_name  ? ` · ${doc.file_name}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <StatusBadge status={doc.status} animated={doc.status === 'processing'} />
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(doc) }}
                className="text-gray-300 hover:text-blue-500 transition-colors"
                title="Editar"
              >
                ✎
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(doc.id) }}
              className="text-gray-300 hover:text-red-500 transition-colors"
              title="Eliminar"
            >
              ✕
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

// ── Main component ────────────────────────────────────────────

export function KnowledgePageClient({ tenantId, initialDocuments }: Props) {
  const [tab, setTab]             = useState<Tab>('files')
  const [docs, setDocs]           = useState<KBDocument[]>(initialDocuments)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput]   = useState('')
  const [faqQ, setFaqQ]           = useState('')
  const [faqA, setFaqA]           = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState<string | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<KBDocument | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const notify = (msg: string, type: 'ok' | 'err') => {
    if (type === 'ok') { setSuccess(msg); setError(null) }
    else               { setError(msg);   setSuccess(null) }
    setTimeout(() => { setSuccess(null); setError(null) }, 4000)
  }

  const refreshDocs = useCallback(async () => {
    const res  = await fetch(`/api/knowledge/documents?tenant_id=${tenantId}`)
    const data = await res.json() as KBDocument[]
    setDocs(data)
  }, [tenantId])

  const handleDelete = async (id: string) => {
    if (selectedDoc?.id === id) setSelectedDoc(null)
    const res = await fetch('/api/knowledge/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, tenant_id: tenantId }),
    })
    if (res.ok) {
      setDocs(prev => prev.filter(d => d.id !== id))
    } else {
      notify('Error al eliminar el documento', 'err')
    }
  }

  // ── Upload file ─────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    const form = new FormData()
    form.append('file', file)
    form.append('tenant_id', tenantId)

    const res = await fetch('/api/knowledge/upload', { method: 'POST', body: form })
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''

    if (res.ok) {
      notify('Archivo cargado. Procesando embeddings…', 'ok')
      await refreshDocs()
    } else {
      const body = await res.json() as { error: string }
      notify(body.error ?? 'Error al cargar el archivo', 'err')
    }
  }

  // ── Import URL ──────────────────────────────────────────────
  const handleUrlImport = async () => {
    if (!urlInput.trim()) return
    setUploading(true)
    const res = await fetch('/api/knowledge/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlInput.trim(), tenant_id: tenantId }),
    })
    setUploading(false)
    if (res.ok) {
      setUrlInput('')
      notify('URL importada. Procesando contenido…', 'ok')
      await refreshDocs()
    } else {
      const body = await res.json() as { error: string }
      notify(body.error ?? 'Error al importar la URL', 'err')
    }
  }

  // ── Add / edit FAQ ────────────────────────────────────────────
  const handleFaqSave = async () => {
    if (!faqQ.trim() || !faqA.trim()) return
    setUploading(true)

    const res = editingId
      ? await fetch('/api/knowledge/faq', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, question: faqQ, answer: faqA, tenant_id: tenantId }),
        })
      : await fetch('/api/knowledge/faq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: faqQ, answer: faqA, tenant_id: tenantId }),
        })

    setUploading(false)
    if (res.ok) {
      setFaqQ('')
      setFaqA('')
      setEditingId(null)
      notify(editingId ? 'FAQ actualizada correctamente.' : 'FAQ guardada correctamente.', 'ok')
      await refreshDocs()
    } else {
      const body = await res.json() as { error: string }
      notify(body.error ?? 'Error al guardar la FAQ', 'err')
    }
  }

  const handleFaqEditStart = async (doc: KBDocument) => {
    const res = await fetch(`/api/knowledge/faq?id=${doc.id}&tenant_id=${tenantId}`)
    if (!res.ok) {
      notify('Error al cargar la FAQ', 'err')
      return
    }
    const body = await res.json() as { question: string; answer: string }
    setFaqQ(body.question)
    setFaqA(body.answer)
    setEditingId(doc.id)
  }

  const handleFaqCancelEdit = () => {
    setEditingId(null)
    setFaqQ('')
    setFaqA('')
  }

  // ── Generate FAQs from indexed URLs ──────────────────────────
  const handleGenerateFaqs = async () => {
    setGenerating(true)
    const res = await fetch('/api/knowledge/faq/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId }),
    })
    setGenerating(false)
    if (res.ok) {
      const body = await res.json() as { inserted: number }
      notify(`Se generaron ${body.inserted} FAQs a partir de las URLs indexadas.`, 'ok')
      await refreshDocs()
    } else {
      const body = await res.json() as { error: string }
      notify(body.error ?? 'Error al generar FAQs', 'err')
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'files', label: '📄 Archivos' },
    { id: 'urls',  label: '🌐 URLs' },
    { id: 'faq',   label: '❓ FAQ' },
  ]

  // Keep selectedDoc in sync with latest list data
  useEffect(() => {
    if (!selectedDoc) return
    const fresh = docs.find(d => d.id === selectedDoc.id)
    if (fresh && fresh.updated_at !== selectedDoc.updated_at) {
      setSelectedDoc(fresh)
    }
  }, [docs, selectedDoc])

  return (
    <div>
      {/* Notificaciones */}
      {error   && <div className="mb-4 rounded-lg bg-red-50   border border-red-200   px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* Tab: Archivos */}
        {tab === 'files' && (
          <div>
            <div
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file && fileRef.current) {
                  const dt = new DataTransfer()
                  dt.items.add(file)
                  fileRef.current.files = dt.files
                  fileRef.current.dispatchEvent(new Event('change', { bubbles: true }))
                }
              }}
            >
              <span className="text-3xl mb-2">☁️</span>
              <p className="text-sm font-medium text-gray-700">
                {uploading ? 'Procesando…' : 'Arrastra un archivo o haz clic para seleccionar'}
              </p>
              <p className="mt-1 text-xs text-gray-400">PDF, DOCX o TXT — máx 10 MB</p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </div>
            <DocumentList
              docs={docs.filter(d => d.source_type === 'file')}
              onDelete={handleDelete}
              onSelect={setSelectedDoc}
            />
          </div>
        )}

        {/* Tab: URLs */}
        {tab === 'urls' && (
          <div>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrlImport()}
                placeholder="https://ejemplo.com/pagina"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={uploading}
              />
              <button
                onClick={handleUrlImport}
                disabled={uploading || !urlInput.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {uploading ? 'Importando…' : 'Importar'}
              </button>
            </div>
            <DocumentList
              docs={docs.filter(d => d.source_type === 'url')}
              onDelete={handleDelete}
              onSelect={setSelectedDoc}
            />
          </div>
        )}

        {/* Tab: FAQ */}
        {tab === 'faq' && (
          <div>
            <button
              onClick={handleGenerateFaqs}
              disabled={generating || uploading}
              className="mb-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {generating ? 'Generando…' : '✨ Generar FAQs desde URLs'}
            </button>

            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pregunta</label>
                <input
                  type="text"
                  value={faqQ}
                  onChange={e => setFaqQ(e.target.value)}
                  placeholder="¿Cómo abro una cuenta de ahorros?"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={uploading}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Respuesta</label>
                <textarea
                  value={faqA}
                  onChange={e => setFaqA(e.target.value)}
                  rows={4}
                  placeholder="Para abrir una cuenta de ahorros necesitas…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  disabled={uploading}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleFaqSave}
                  disabled={uploading || !faqQ.trim() || !faqA.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {uploading ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar FAQ'}
                </button>
                {editingId && (
                  <button
                    onClick={handleFaqCancelEdit}
                    disabled={uploading}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
            <DocumentList
              docs={docs.filter(d => d.source_type === 'faq')}
              onDelete={handleDelete}
              onSelect={setSelectedDoc}
              onEdit={handleFaqEditStart}
            />
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedDoc && (
        <DocDetailPanel
          doc={selectedDoc}
          tenantId={tenantId}
          onClose={() => setSelectedDoc(null)}
          onUpdate={setDocs}
        />
      )}
    </div>
  )
}
