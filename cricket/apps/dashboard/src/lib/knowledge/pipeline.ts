import OpenAI from 'openai'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'

const CHUNK_SIZE  = 500  // tokens aproximados (~2000 chars)
const CHUNK_CHARS = 2000
const OVERLAP     = 200  // chars de solapamiento entre chunks

export function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + CHUNK_CHARS, text.length)
    chunks.push(text.slice(start, end).trim())
    if (end >= text.length) break
    start = end - OVERLAP
  }
  return chunks.filter(c => c.length > 50)
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return res.data[0].embedding
}

export async function ingestChunks(
  documentId: string,
  tenantId: string,
  chunks: string[],
): Promise<void> {
  const db = getSupabaseAdmin()

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i])
    await db.from('knowledge_base_chunks').insert({
      document_id: documentId,
      tenant_id:   tenantId,
      content:     chunks[i],
      embedding:   JSON.stringify(embedding),
      chunk_index: i,
    })
  }

  await db
    .from('knowledge_base_documents')
    .update({ status: 'ready', chunk_count: chunks.length })
    .eq('id', documentId)
}

export async function markDocumentError(documentId: string, msg: string): Promise<void> {
  const db = getSupabaseAdmin()
  await db
    .from('knowledge_base_documents')
    .update({ status: 'error', error_msg: msg })
    .eq('id', documentId)
}

// Unused but kept for reference
export { CHUNK_SIZE }
