// Cálculo del entendimiento (servidor). Determinista y puro — testeable sin DB.
//
// Por ítem:
//   todo            -> 0
//   inferred        -> 0.6 × quality × confidence
//   confirmed       -> quality
//   not_applicable  -> excluido del promedio
// Por submódulo: promedio PONDERADO de sus ítems (pesos de item-weights).
// Por módulo:    promedio simple de sus submódulos.
// General:       promedio de los 10 submódulos × 100.
//
// Umbral anti-inflación: quality < QUALITY_FLOOR no cuenta como cubierto.

import { MODULES, getItemMeta } from './catalog'
import { weightOf } from './item-weights'
import type { Coverage, ItemStatus, KnowledgeItem } from './types'

export const QUALITY_FLOOR = 0.4
export const INFERRED_FACTOR = 0.6

export interface ScoreInput {
  item_id: string
  status: ItemStatus
  confidence: number
  quality: number
}

/** Puntaje efectivo de un ítem en [0,1]. not_applicable devuelve null (se excluye). */
export function itemScore(it: ScoreInput): number | null {
  if (it.status === 'not_applicable') return null
  if (it.status === 'todo') return 0
  const q = it.quality < QUALITY_FLOOR ? 0 : it.quality
  if (it.status === 'inferred') return INFERRED_FACTOR * q * it.confidence
  // confirmed
  return q
}

interface Agg {
  weighted: number
  weight: number
}

export interface UnderstandingResult {
  understanding: number // 0–100, promedio de los 10 submódulos
  submoduleCoverage: Coverage[]
  moduleCoverage: Coverage[]
}

/**
 * Calcula el entendimiento a partir del estado de los ítems.
 * Acepta el set completo o parcial; los ítems ausentes se tratan como `todo` (0).
 */
export function computeUnderstanding(items: ScoreInput[]): UnderstandingResult {
  // Index por item_id para lookup.
  const byId = new Map<string, ScoreInput>()
  for (const it of items) byId.set(it.item_id, it)

  const subAgg = new Map<string, Agg>()

  // Recorremos el catálogo completo (no solo lo recibido) para que los ítems
  // faltantes cuenten como `todo` = 0.
  for (const mod of MODULES) {
    for (const sub of mod.submodulos) {
      const agg: Agg = { weighted: 0, weight: 0 }
      for (const item of sub.items) {
        const meta = getItemMeta(item.id)!
        const known = byId.get(item.id)
        const score = itemScore(
          known ?? { item_id: item.id, status: 'todo', confidence: 0, quality: 0 },
        )
        if (score === null) continue // not_applicable -> excluido
        const w = weightOf(meta.item_id)
        agg.weighted += w * score
        agg.weight += w
      }
      subAgg.set(sub.id, agg)
    }
  }

  const submoduleCoverage: Coverage[] = []
  const moduleCoverage: Coverage[] = []
  const subPctList: number[] = []

  for (const mod of MODULES) {
    const subPcts: number[] = []
    for (const sub of mod.submodulos) {
      const agg = subAgg.get(sub.id)!
      const pct = agg.weight > 0 ? (agg.weighted / agg.weight) * 100 : 0
      submoduleCoverage.push({ id: sub.id, title: sub.titulo, pct: round1(pct) })
      subPcts.push(pct)
      subPctList.push(pct)
    }
    const modPct = subPcts.length > 0 ? subPcts.reduce((a, b) => a + b, 0) / subPcts.length : 0
    moduleCoverage.push({ id: mod.id, title: mod.titulo, pct: round1(modPct) })
  }

  const understanding = subPctList.length > 0
    ? round1(subPctList.reduce((a, b) => a + b, 0) / subPctList.length)
    : 0

  return { understanding, submoduleCoverage, moduleCoverage }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Adaptador: calcula desde filas completas de conocimiento. */
export function computeFromKnowledge(items: KnowledgeItem[]): UnderstandingResult {
  return computeUnderstanding(
    items.map((it) => ({
      item_id: it.item_id,
      status: it.status,
      confidence: it.confidence,
      quality: it.quality,
    })),
  )
}
