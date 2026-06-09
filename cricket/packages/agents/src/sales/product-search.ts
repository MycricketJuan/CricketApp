/*
 * SQL — Aplicar manualmente en Supabase SQL Editor antes de usar este agente:
 *
 * CREATE TABLE products (
 *   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *   name        TEXT NOT NULL,
 *   description TEXT NOT NULL,
 *   features    JSONB NOT NULL DEFAULT '[]',
 *   price       NUMERIC(12,2),
 *   segments    JSONB NOT NULL DEFAULT '[]',   -- ['premium','basic','all']
 *   is_active   BOOLEAN NOT NULL DEFAULT true,
 *   metadata    JSONB NOT NULL DEFAULT '{}',
 *   created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 * ALTER TABLE products ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "tenant users ven sus productos"
 *   ON products FOR SELECT USING (tenant_id = auth_tenant_id() OR is_superadmin());
 * CREATE INDEX idx_products_tenant ON products(tenant_id) WHERE is_active = true;
 * CREATE INDEX idx_products_fts ON products
 *   USING gin(to_tsvector('spanish', description));
 */

import { createClient } from '@supabase/supabase-js'

export interface ProductSearchParams {
  tenantId: string
  supabaseUrl: string
  supabaseKey: string
  segment: string
  intent: string
  maxResults?: number
}

export async function productSearch(params: ProductSearchParams): Promise<string> {
  const { tenantId, supabaseUrl, supabaseKey, segment, intent, maxResults = 3 } = params
  const supabase = createClient(supabaseUrl, supabaseKey)

  const [bySegment, byText] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, description, features, price, segments, metadata')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .contains('segments', [segment])
      .limit(maxResults),

    supabase
      .from('products')
      .select('id, name, description, features, price, segments, metadata')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .textSearch('description', intent, { type: 'websearch', config: 'spanish' })
      .limit(maxResults),
  ])

  if (bySegment.error?.message?.includes('relation') && byText.error?.message?.includes('relation')) {
    return JSON.stringify({ products: [], message: 'Catálogo no configurado' })
  }

  const seen = new Set<string>()
  const products: unknown[] = []

  for (const row of bySegment.data ?? []) {
    if (!seen.has(row.id)) { seen.add(row.id); products.push(row) }
  }
  for (const row of byText.data ?? []) {
    if (!seen.has(row.id)) { seen.add(row.id); products.push(row) }
  }

  return JSON.stringify({ products, total: products.length })
}

export const PRODUCT_SEARCH_TOOL = {
  name: 'product_search',
  description:
    'Busca productos del catálogo del tenant recomendados para el segmento del cliente. Llamar después de crm_lookup para conocer el segmento.',
  input_schema: {
    type: 'object' as const,
    properties: {
      segment: {
        type: 'string',
        description: 'Segmento del cliente obtenido del CRM (ej: premium, basic)',
      },
      intent: {
        type: 'string',
        description: 'Descripción de qué busca o necesita el cliente',
      },
      max_results: {
        type: 'number',
        description: 'Número máximo de resultados. Default: 3',
      },
    },
    required: ['segment', 'intent'],
  },
}
