// Acceso a datos del flujo "Crear representación".
// Las tablas representation_* no están en los tipos generados hasta correr
// `pnpm db:types`; este helper devuelve el cliente admin sin tipos (como getKBAdmin).

import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@cricket/core/supabase/admin'
import { ALL_ITEMS, CATALOG_VERSION, GOAL, getItemMeta } from './catalog'
import { computeFromKnowledge } from './understanding'
import type {
  Evidence,
  ItemStatus,
  KnowledgeItem,
  RepCard,
  RepMenu,
  RepMessage,
  RepProfile,
  RepresentationState,
} from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRepAdmin(): SupabaseClient<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseAdmin() as unknown as SupabaseClient<any>
}

interface KnowledgeRow {
  item_id: string
  submodule_id: string
  module_id: string
  status: ItemStatus
  value: string | null
  confidence: number
  quality: number
  evidence: Evidence[]
}

function toKnowledgeItem(r: KnowledgeRow): KnowledgeItem {
  return {
    item_id: r.item_id,
    submodule_id: r.submodule_id,
    module_id: r.module_id,
    status: r.status,
    value: r.value,
    confidence: Number(r.confidence),
    quality: Number(r.quality),
    evidence: Array.isArray(r.evidence) ? r.evidence : [],
  }
}

/** Devuelve el id de la representación activa (no `done`) del tenant+usuario, o null. */
export async function findRepresentation(
  tenantId: string,
  createdBy: string | null,
): Promise<string | null> {
  const db = getRepAdmin()
  let query = db
    .from('representations')
    .select('id')
    .eq('tenant_id', tenantId)
    .neq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(1)
  if (createdBy) query = query.eq('created_by', createdBy)
  const { data } = await query
  return data && data.length > 0 ? (data[0].id as string) : null
}

/** Devuelve la representación activa (no `done`) del tenant+usuario, o crea una nueva ya sembrada. */
export async function getOrCreateRepresentation(
  tenantId: string,
  createdBy: string | null,
): Promise<string> {
  const db = getRepAdmin()

  const existingId = await findRepresentation(tenantId, createdBy)
  if (existingId) return existingId

  const { data: created, error } = await db
    .from('representations')
    .insert({ tenant_id: tenantId, created_by: createdBy, catalog_version: CATALOG_VERSION })
    .select('id')
    .single()

  if (error || !created) throw new Error(`No se pudo crear la representación: ${error?.message}`)

  await seedKnowledge(created.id as string, tenantId)
  return created.id as string
}

/** Siembra las 123 filas de conocimiento en estado `todo`. */
export async function seedKnowledge(representationId: string, tenantId: string): Promise<void> {
  const db = getRepAdmin()
  const rows = ALL_ITEMS.map((item) => {
    const meta = getItemMeta(item.id)!
    return {
      representation_id: representationId,
      tenant_id: tenantId,
      item_id: item.id,
      submodule_id: meta.submodule_id,
      module_id: meta.module_id,
      status: 'todo' as ItemStatus,
    }
  })
  // Insert en lotes para no exceder límites de payload.
  const BATCH = 200
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.from('representation_knowledge').insert(rows.slice(i, i + BATCH))
  }
}

export async function loadKnowledge(representationId: string): Promise<KnowledgeItem[]> {
  const db = getRepAdmin()
  const { data } = await db
    .from('representation_knowledge')
    .select('item_id, submodule_id, module_id, status, value, confidence, quality, evidence')
    .eq('representation_id', representationId)
  return ((data ?? []) as KnowledgeRow[]).map(toKnowledgeItem)
}

export async function loadProfile(representationId: string): Promise<{
  profile: RepProfile
  status: string
  pending: RepresentationState['pending']
  cost: RepresentationState['cost']
}> {
  const db = getRepAdmin()
  const { data } = await db
    .from('representations')
    .select('profile, status, pending, total_input_tokens, total_output_tokens, est_cost_usd')
    .eq('id', representationId)
    .single()

  return {
    profile: (data?.profile ?? {}) as RepProfile,
    status: (data?.status ?? 'draft') as string,
    pending: (data?.pending ?? {}) as RepresentationState['pending'],
    cost: {
      total_input_tokens: Number(data?.total_input_tokens ?? 0),
      total_output_tokens: Number(data?.total_output_tokens ?? 0),
      est_cost_usd: Number(data?.est_cost_usd ?? 0),
    },
  }
}

export async function loadMenus(representationId: string): Promise<RepMenu[]> {
  const db = getRepAdmin()
  const { data } = await db
    .from('representation_menus')
    .select('menu_key, title, description, icon, intent, rationale, position, enabled')
    .eq('representation_id', representationId)
    .order('position')
  return (data ?? []) as RepMenu[]
}

export async function loadThread(representationId: string): Promise<RepMessage[]> {
  const db = getRepAdmin()
  const { data } = await db
    .from('representation_messages')
    .select('role, content, card')
    .eq('representation_id', representationId)
    .order('created_at')
  return ((data ?? []) as { role: RepMessage['role']; content: string; card: RepCard | null }[])
    .map((m) => ({ role: m.role, content: m.content, card: m.card }))
}

/** Ensambla el estado completo que pinta el cliente (números calculados aquí). */
export async function loadRepresentationState(representationId: string): Promise<RepresentationState> {
  const [knowledge, meta, menus] = await Promise.all([
    loadKnowledge(representationId),
    loadProfile(representationId),
    loadMenus(representationId),
  ])
  const { understanding, submoduleCoverage, moduleCoverage } = computeFromKnowledge(knowledge)
  return {
    id: representationId,
    status: meta.status,
    profile: meta.profile,
    understanding,
    goal: GOAL,
    pending: meta.pending,
    moduleCoverage,
    submoduleCoverage,
    knowledge,
    menus,
    cost: meta.cost,
  }
}

// ── Mutaciones ────────────────────────────────────────────────

export async function applyProfileUpdate(
  representationId: string,
  tenantId: string,
  field: keyof RepProfile,
  value: unknown,
): Promise<void> {
  const db = getRepAdmin()
  const { data } = await db
    .from('representations')
    .select('profile')
    .eq('id', representationId)
    .single()
  const before = (data?.profile ?? {}) as RepProfile
  const after = { ...before, [field]: value }
  await db.from('representations').update({ profile: after }).eq('id', representationId)
  await logEvent(representationId, tenantId, 'profile_update', { field, before: before[field], after: value })
}

export interface UpsertItem {
  itemId: string
  value?: string
  status?: ItemStatus
  confidence?: number
  quality?: number
  evidence?: Evidence[]
}

/** Upsert de uno o varios ítems. Devuelve los itemIds que realmente cambiaron (anti-inflación). */
export async function upsertKnowledge(
  representationId: string,
  tenantId: string,
  items: UpsertItem[],
): Promise<string[]> {
  const db = getRepAdmin()
  const changed: string[] = []

  for (const it of items) {
    const meta = getItemMeta(it.itemId)
    if (!meta) continue

    const { data: prevRows } = await db
      .from('representation_knowledge')
      .select('value, status, confidence, quality')
      .eq('representation_id', representationId)
      .eq('item_id', it.itemId)
      .limit(1)
    const prev = (prevRows?.[0] ?? null) as
      | { value: string | null; status: ItemStatus; confidence: number; quality: number }
      | null

    const next = {
      value: it.value ?? prev?.value ?? null,
      status: it.status ?? prev?.status ?? 'inferred',
      confidence: clamp01(it.confidence ?? prev?.confidence ?? 0),
      quality: clamp01(it.quality ?? prev?.quality ?? 0),
      evidence: it.evidence ?? undefined,
    }

    const didChange =
      !prev ||
      prev.value !== next.value ||
      prev.status !== next.status ||
      Number(prev.confidence) !== next.confidence ||
      Number(prev.quality) !== next.quality

    const update: Record<string, unknown> = {
      value: next.value,
      status: next.status,
      confidence: next.confidence,
      quality: next.quality,
    }
    if (next.evidence) update.evidence = next.evidence

    await db
      .from('representation_knowledge')
      .update(update)
      .eq('representation_id', representationId)
      .eq('item_id', it.itemId)

    if (didChange) changed.push(it.itemId)
  }

  if (changed.length > 0) {
    await logEvent(representationId, tenantId, 'knowledge_upsert', { items: changed })
  }
  return changed
}

/** Validación en bloque: inferred -> confirmed para todos los itemIds dados, en una acción. */
export async function confirmKnowledge(
  representationId: string,
  tenantId: string,
  itemIds: string[],
): Promise<string[]> {
  const db = getRepAdmin()
  const valid = itemIds.filter((id) => getItemMeta(id))
  if (valid.length === 0) return []
  await db
    .from('representation_knowledge')
    .update({ status: 'confirmed' })
    .eq('representation_id', representationId)
    .in('item_id', valid)
  await logEvent(representationId, tenantId, 'knowledge_confirm', { items: valid })
  return valid
}

export async function setPending(
  representationId: string,
  pending: { waiting_for?: string; targets?: string[] },
): Promise<void> {
  const db = getRepAdmin()
  await db.from('representations').update({ pending }).eq('id', representationId)
}

/** Recalcula el entendimiento desde las filas de conocimiento y lo cachea. */
export async function recomputeUnderstanding(representationId: string): Promise<number> {
  const knowledge = await loadKnowledge(representationId)
  const { understanding } = computeFromKnowledge(knowledge)
  const db = getRepAdmin()
  await db.from('representations').update({ understanding }).eq('id', representationId)
  return understanding
}

export async function appendMessage(
  representationId: string,
  tenantId: string,
  msg: {
    role: RepMessage['role']
    content: string
    card?: RepCard | null
    inputTokens?: number
    outputTokens?: number
    costUsd?: number
    toolsUsed?: string[]
  },
): Promise<void> {
  const db = getRepAdmin()
  await db.from('representation_messages').insert({
    representation_id: representationId,
    tenant_id: tenantId,
    role: msg.role,
    content: msg.content,
    card: msg.card ?? null,
    input_tokens: msg.inputTokens ?? 0,
    output_tokens: msg.outputTokens ?? 0,
    est_cost_usd: msg.costUsd ?? 0,
    tools_used: msg.toolsUsed ?? [],
  })
}

/** Acumula tokens/costo del turno en la representación. */
export async function addTurnCost(
  representationId: string,
  inputTokens: number,
  outputTokens: number,
  costUsd: number,
): Promise<void> {
  const db = getRepAdmin()
  const { data } = await db
    .from('representations')
    .select('total_input_tokens, total_output_tokens, est_cost_usd')
    .eq('id', representationId)
    .single()
  await db
    .from('representations')
    .update({
      total_input_tokens: Number(data?.total_input_tokens ?? 0) + inputTokens,
      total_output_tokens: Number(data?.total_output_tokens ?? 0) + outputTokens,
      est_cost_usd: Number(data?.est_cost_usd ?? 0) + costUsd,
    })
    .eq('id', representationId)
}

export async function logEvent(
  representationId: string,
  tenantId: string,
  type: string,
  payload: Record<string, unknown>,
  source: 'user_message' | 'source_extraction' | 'zerez_proposal' = 'user_message',
): Promise<void> {
  const db = getRepAdmin()
  await db.from('representation_events').insert({
    representation_id: representationId,
    tenant_id: tenantId,
    type,
    payload,
    source,
  })
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}
