// Pesos por ítem para el cálculo de entendimiento. El catálogo no trae pesos,
// así que se definen aquí. Por defecto w=1; los ítems más decisivos para
// representar bien a la empresa pesan más (rango 1–3).
//
// ⚠️ Valores INICIALES. Se calibran con las 3 empresas de prueba (fase 4) para
// que llegar al 80% tome 8–15 preguntas. No fijar como definitivos hasta medir.

export const DEFAULT_WEIGHT = 1

export const ITEM_WEIGHTS: Record<string, number> = {
  // Representación · Identidad
  'identidad.01': 3, // Nombre y descripción
  'identidad.03': 2, // Actividad principal
  'identidad.04': 2, // Productos y servicios
  // Representación · Propósito
  'proposito.02': 2, // Problema que resuelve
  'proposito.04': 2, // Misión
  // Representación · Posicionamiento
  'posicionamiento.02': 2, // Cliente objetivo
  'posicionamiento.03': 2, // Necesidades prioritarias
  'posicionamiento.04': 3, // Propuesta de valor
  'posicionamiento.05': 2, // Diferenciadores
  'posicionamiento.10': 2, // Escalamiento hacia una persona
  // Venta · Oferta
  'oferta.01': 3, // Portafolio
  'oferta.02': 2, // Descripción de cada oferta
  'oferta.06': 3, // Precios y modelo comercial
  // Venta · Cliente ideal
  'cliente.01': 3, // Segmentos objetivo
  'cliente.04': 2, // Necesidades típicas
  'cliente.06': 2, // Criterios de decisión
  // Venta · Necesidad → Solución
  'necesidad.01': 2, // Necesidades principales
  'necesidad.06': 2, // Mapeo necesidad → oferta
  // Venta · Proceso de venta
  'proceso.05': 2, // Recomendación
  'proceso.12': 2, // Escalamiento comercial
  // Feedback · Actuar
  'actuar.07': 2, // Escalamiento
  'actuar.08': 2, // Destino del escalamiento
}

export function weightOf(itemId: string): number {
  return ITEM_WEIGHTS[itemId] ?? DEFAULT_WEIGHT
}
