// Estimación de costo por turno a partir de response.usage del SDK de Anthropic.
// Precios USD por millón de tokens (aprox.; ajustar si cambia la tarifa).
// Se usa solo para instrumentación interna (telemetría de costo), no se cobra.

interface Price { input: number; output: number } // USD / 1M tokens

const PRICES: Record<string, Price> = {
  'claude-sonnet-5-5': { input: 3, output: 15 },
  'claude-opus-5-5': { input: 15, output: 75 },
  'claude-haiku-5-5': { input: 1, output: 5 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
}

const FALLBACK: Price = { input: 3, output: 15 }

function priceFor(model: string): Price {
  if (PRICES[model]) return PRICES[model]
  // Coincidencia por prefijo de familia (p.ej. ids con sufijo de fecha).
  const key = Object.keys(PRICES).find((k) => model.startsWith(k.split('-').slice(0, 3).join('-')))
  return key ? PRICES[key] : FALLBACK
}

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = priceFor(model)
  const usd = (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output
  return Math.round(usd * 10000) / 10000
}
