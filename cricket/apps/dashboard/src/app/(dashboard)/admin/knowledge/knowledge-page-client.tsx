'use client'

import { useState, useRef, useCallback } from 'react'

type DocStatus = 'processing' | 'ready' | 'error'

interface KBDocument {
  id: string
  title: string
  source_type: string
  source_url: string | null
  file_name: string | null
  status: DocStatus
  chunk_count: number
  created_at: string
}

interface Props {
  tenantId: string
  initialDocuments: KBDocument[]
}

type Tab = 'files' | 'urls' | 'faq'

// ── Status badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: DocStatus }) {
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
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

// ── Document list ─────────────────────────────────────────────

function DocumentList({
  docs,
  onDelete,
}: {
  docs: KBDocument[]
  onDelete: (id: string) => void
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
        <li key={doc.id} className="flex items-center justify-between px-4 py-3 gap-3">
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
            <StatusBadge status={doc.status} />
            <button
              onClick={() => onDelete(doc.id)}
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
  const [tab, setTab]           = useState<Tab>('files')
  const [docs, setDocs]         = useState<KBDocument[]>(initialDocuments)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput]   = useState('')
  const [faqQ, setFaqQ]           = useState('')
  const [faqA, setFaqA]           = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState<string | null>(null)
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

  // ── Add FAQ ─────────────────────────────────────────────────
  const handleFaqAdd = async () => {
    if (!faqQ.trim() || !faqA.trim()) return
    setUploading(true)
    const res = await fetch('/api/knowledge/faq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: faqQ, answer: faqA, tenant_id: tenantId }),
    })
    setUploading(false)
    if (res.ok) {
      setFaqQ('')
      setFaqA('')
      notify('FAQ guardada correctamente.', 'ok')
      await refreshDocs()
    } else {
      const body = await res.json() as { error: string }
      notify(body.error ?? 'Error al guardar la FAQ', 'err')
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'files', label: '📄 Archivos' },
    { id: 'urls',  label: '🌐 URLs' },
    { id: 'faq',   label: '❓ FAQ' },
  ]

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
            />
          </div>
        )}

        {/* Tab: FAQ */}
        {tab === 'faq' && (
          <div>
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
              <button
                onClick={handleFaqAdd}
                disabled={uploading || !faqQ.trim() || !faqA.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {uploading ? 'Guardando…' : 'Guardar FAQ'}
              </button>
            </div>
            <DocumentList
              docs={docs.filter(d => d.source_type === 'faq')}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>
    </div>
  )
}
