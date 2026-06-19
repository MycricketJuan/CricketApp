import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { KnowledgePageClient } from './knowledge-page-client'

export default async function KnowledgePage() {
  const headersList  = await headers()
  const tenantSlug   = headersList.get('x-tenant-slug') ?? ''
  const db           = getSupabaseAdmin()

  const { data: tenant } = await db
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">Tenant no encontrado: {tenantSlug}</p>
      </div>
    )
  }

  // Usamos cast porque la tabla es de la migración 002 y puede no estar
  // en los tipos generados todavía
  type DocRow = {
    id: string
    title: string
    source_type: string
    source_url: string | null
    file_name: string | null
    status: string
    chunk_count: number
    created_at: string
  }

  const { data: documents } = await (db as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: object) => Promise<{ data: DocRow[] | null }>
        }
      }
    }
  })
    .from('knowledge_base_documents')
    .select('id, title, source_type, source_url, file_name, status, chunk_count, created_at')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Base de conocimiento</h1>
        <p className="mt-1 text-sm text-gray-500">
          Los documentos cargados aquí serán usados por el agente de IA para responder
          preguntas de los clientes.
        </p>
      </div>
      <KnowledgePageClient
        tenantId={tenant.id}
        initialDocuments={(documents ?? []) as import('./knowledge-page-client').KBDocument[]}
      />
    </div>
  )
}
