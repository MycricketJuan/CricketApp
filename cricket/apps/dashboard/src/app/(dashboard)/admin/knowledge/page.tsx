import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { getKBAdmin } from '@/lib/knowledge/db'
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

  const kb = getKBAdmin()
  const { data: documents } = await kb
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
