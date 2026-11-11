// Loader tipado del catálogo de conocimiento de ZEREZ (fuente de verdad:
// cricket/docs/spec/zerez-catalogo-conocimiento.json, copiado aquí para que
// Next lo empaquete; mantener ambos en sincronía). 123 ítems en 10 submódulos.

import catalogJson from './catalog.json'

export interface CatalogItem {
  id: string
  etiqueta: string
}

export interface CatalogSubmodule {
  id: string
  titulo: string
  pregunta_guia: string
  items: CatalogItem[]
}

export interface CatalogModule {
  id: string
  titulo: string
  descripcion: string
  submodulos: CatalogSubmodule[]
}

export interface Catalog {
  version: string
  meta_entendimiento: number
  modulos: CatalogModule[]
}

export const CATALOG = catalogJson as unknown as Catalog

export const CATALOG_VERSION = CATALOG.version
export const GOAL = CATALOG.meta_entendimiento // 80

export const MODULES = CATALOG.modulos
export const SUBMODULES: CatalogSubmodule[] = MODULES.flatMap((m) => m.submodulos)
export const ALL_ITEMS: CatalogItem[] = SUBMODULES.flatMap((s) => s.items)

/** item_id -> { submodule_id, module_id, etiqueta } */
export interface ItemMeta {
  item_id: string
  submodule_id: string
  module_id: string
  etiqueta: string
}

const ITEM_META = new Map<string, ItemMeta>()
for (const mod of MODULES) {
  for (const sub of mod.submodulos) {
    for (const item of sub.items) {
      ITEM_META.set(item.id, {
        item_id: item.id,
        submodule_id: sub.id,
        module_id: mod.id,
        etiqueta: item.etiqueta,
      })
    }
  }
}

export const ITEM_IDS: string[] = [...ITEM_META.keys()]
export const ITEM_COUNT = ITEM_IDS.length // 123

export function isValidItemId(id: string): boolean {
  return ITEM_META.has(id)
}

export function getItemMeta(id: string): ItemMeta | undefined {
  return ITEM_META.get(id)
}

export function getSubmodule(id: string): CatalogSubmodule | undefined {
  return SUBMODULES.find((s) => s.id === id)
}

export function getModuleOfSubmodule(submoduleId: string): CatalogModule | undefined {
  return MODULES.find((m) => m.submodulos.some((s) => s.id === submoduleId))
}
