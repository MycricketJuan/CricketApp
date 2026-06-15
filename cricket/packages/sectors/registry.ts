import type { SectorExtension } from './types'
import { retailExtension } from './retail'

const SECTOR_REGISTRY: Record<string, SectorExtension> = {
  retail: retailExtension,
}

export function getSectorExtension(sector: string): SectorExtension | null {
  return SECTOR_REGISTRY[sector] ?? null
}

export function getSectorPrompts(sector: string): SectorExtension['agentPrompts'] | null {
  return SECTOR_REGISTRY[sector]?.agentPrompts ?? null
}

export function getSectorIntentMapping(sector: string): Record<string, string> {
  return SECTOR_REGISTRY[sector]?.intentMapping ?? {}
}

export function getSectorTransactionsConfig(
  sector: string,
): SectorExtension['transactionsConfig'] | null {
  return SECTOR_REGISTRY[sector]?.transactionsConfig ?? null
}
