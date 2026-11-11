// Definición y ejecución (servidor) de las herramientas de ZEREZ.
// El servidor valida cada llamada antes de aplicarla; si es inválida devuelve un
// tool_result de error para que el modelo corrija en la misma vuelta.

import type Anthropic from '@anthropic-ai/sdk'
import { isValidItemId } from './catalog'
import { parseHexServer } from './color'
import {
  applyProfileUpdate,
  confirmKnowledge,
  setPending,
  upsertKnowledge,
  type UpsertItem,
} from './db'
import type { ItemStatus, RepCard, RepCardType } from './types'

export const TOOLS: Anthropic.Tool[] = [
  {
    name: 'update_profile',
    description: 'Fija o corrige un dato del perfil de la empresa. Úsalo también para corregir algo que el usuario cambió.',
    input_schema: {
      type: 'object',
      properties: {
        field: { type: 'string', enum: ['user', 'company', 'color', 'color_secondary', 'logo', 'tone'] },
        value: { type: 'string', description: 'Nuevo valor. Para color, un hex como #2563eb. Para tone, "tu" o "usted".' },
      },
      required: ['field', 'value'],
    },
  },
  {
    name: 'upsert_knowledge',
    description: 'Registra o actualiza uno o varios ítems de conocimiento a partir de lo que dijo el usuario o se dedujo. Evalúa quality con la rúbrica.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              itemId: { type: 'string', description: 'Id del catálogo, p.ej. identidad.01' },
              value: { type: 'string', description: 'Contenido entendido, redactado y específico.' },
              status: { type: 'string', enum: ['inferred', 'confirmed', 'not_applicable'] },
              confidence: { type: 'number', description: '0 a 1' },
              quality: { type: 'number', description: '0 a 1 según la rúbrica' },
            },
            required: ['itemId', 'value', 'status', 'confidence', 'quality'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'confirm_knowledge',
    description: 'Valida en bloque un grupo de ítems deducidos: todos pasan a confirmed en una sola acción.',
    input_schema: {
      type: 'object',
      properties: {
        itemIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
      },
      required: ['itemIds'],
    },
  },
  {
    name: 'mark_incomplete',
    description: 'El mensaje del usuario parece incompleto o demasiado vago para cubrir algo. No lo des por respondido; pide que continúe o detalle.',
    input_schema: {
      type: 'object',
      properties: { reason: { type: 'string' } },
      required: ['reason'],
    },
  },
  {
    name: 'ask',
    description: 'Formula la siguiente pregunta abierta (máximo una por turno) indicando qué ítems busca cubrir.',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        targets: { type: 'array', items: { type: 'string' }, description: 'itemIds que busca cubrir' },
        why: { type: 'string' },
      },
      required: ['question', 'targets'],
    },
  },
  {
    name: 'show_card',
    description: 'Muestra un atajo de interfaz opcional (selector de color, subir logo, fuentes). Nunca reemplaza la conversación.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['color', 'logo', 'sources', 'review', 'menus'] },
      },
      required: ['type'],
    },
  },
]

export interface TurnEffects {
  ask: { question: string; targets: string[] } | null
  card: RepCard | null
  incomplete: { reason: string } | null
  changedItems: string[]
  confirmedItems: string[]
  profileChanged: boolean
}

export function emptyEffects(): TurnEffects {
  return { ask: null, card: null, incomplete: null, changedItems: [], confirmedItems: [], profileChanged: false }
}

/**
 * Ejecuta una llamada a herramienta. Muta DB cuando corresponde y acumula efectos.
 * Devuelve el texto del tool_result (ok o error) para la siguiente vuelta del modelo.
 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: { representationId: string; tenantId: string; effects: TurnEffects },
): Promise<string> {
  const { representationId, tenantId, effects } = ctx

  switch (name) {
    case 'update_profile': {
      const field = String(input.field ?? '')
      let value = input.value as unknown
      if (!['user', 'company', 'color', 'color_secondary', 'logo', 'tone'].includes(field)) {
        return `error: field inválido "${field}"`
      }
      if (field === 'color' || field === 'color_secondary') {
        const hex = parseHexServer(String(value))
        if (!hex) return 'error: color debe ser un hex válido, p.ej. #2563eb'
        value = hex
      }
      if (field === 'tone' && !['tu', 'usted'].includes(String(value))) {
        return 'error: tone debe ser "tu" o "usted"'
      }
      const mapped = field === 'logo' ? 'logo_url' : field
      await applyProfileUpdate(representationId, tenantId, mapped as never, value)
      effects.profileChanged = true
      return `ok: perfil.${field} actualizado`
    }

    case 'upsert_knowledge': {
      const rawItems = Array.isArray(input.items) ? (input.items as Record<string, unknown>[]) : []
      const valid: UpsertItem[] = []
      for (const it of rawItems) {
        const itemId = String(it.itemId ?? '')
        if (!isValidItemId(itemId)) return `error: itemId desconocido "${itemId}"`
        valid.push({
          itemId,
          value: it.value != null ? String(it.value) : undefined,
          status: (it.status as ItemStatus) ?? 'inferred',
          confidence: toNum(it.confidence),
          quality: toNum(it.quality),
        })
      }
      if (valid.length === 0) return 'error: items vacío'
      const changed = await upsertKnowledge(representationId, tenantId, valid)
      effects.changedItems.push(...changed)
      return `ok: ${valid.length} ítem(s) registrados; ${changed.length} cambiaron`
    }

    case 'confirm_knowledge': {
      const ids = Array.isArray(input.itemIds) ? (input.itemIds as unknown[]).map(String) : []
      const unknown = ids.find((id) => !isValidItemId(id))
      if (unknown) return `error: itemId desconocido "${unknown}"`
      const confirmed = await confirmKnowledge(representationId, tenantId, ids)
      effects.confirmedItems.push(...confirmed)
      return `ok: ${confirmed.length} ítem(s) confirmados`
    }

    case 'mark_incomplete': {
      effects.incomplete = { reason: String(input.reason ?? '') }
      return 'ok: marcado como incompleto; pide que continúe'
    }

    case 'ask': {
      if (effects.ask) return 'error: solo se permite una pregunta (ask) por turno'
      const question = String(input.question ?? '').trim()
      const targets = Array.isArray(input.targets) ? (input.targets as unknown[]).map(String) : []
      if (!question) return 'error: question vacío'
      const bad = targets.find((t) => !isValidItemId(t))
      if (bad) return `error: target desconocido "${bad}"`
      effects.ask = { question, targets }
      await setPending(representationId, { waiting_for: question, targets })
      return 'ok: pregunta registrada'
    }

    case 'show_card': {
      const type = String(input.type ?? '') as RepCardType
      if (!['color', 'logo', 'sources', 'review', 'menus'].includes(type)) {
        return `error: tipo de tarjeta inválido "${type}"`
      }
      effects.card = { type }
      return 'ok: tarjeta mostrada (atajo opcional)'
    }

    default:
      return `error: herramienta desconocida "${name}"`
  }
}

function toNum(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
