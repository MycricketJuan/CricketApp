// Guion del onboarding "Crea" (ZEREZ). Texto y reglas tomadas de la demo; todo corre en local, sin llamadas de red.

export const GOAL = 80
export const BASE_UNDERSTANDING = 30
export const GAIN_PER_SOURCE = 3
export const MAX_SOURCES_COUNTED = 4
export const GAIN_PER_ANSWER = 12
export const DEFAULT_COLOR = '#10cba7'

export const COLOR_SWATCHES = ['#2563eb', '#10cba7', '#6f03fd', '#e11d48', '#f59e0b', '#0f1b4c'] as const

export const ACKS = ['Perfecto.', 'Anotado.', 'Gracias, ya lo tengo.', 'Muy claro.', 'Listo.'] as const

export interface OpenQuestion {
  q: (company: string) => string
  help: string
}

export const OPEN_QUESTIONS: readonly OpenQuestion[] = [
  {
    q: (c) => `Cuéntame quiénes son tus clientes y qué necesitan cuando llegan con ${c}.`,
    help: 'Con tus palabras, como se lo contarías a alguien nuevo en tu equipo.',
  },
  {
    q: () => '¿Cómo vendes? Cuéntame qué pasa desde que alguien pregunta hasta que compra.',
    help: 'Incluye precios, condiciones o lo que sueles explicar.',
  },
  {
    q: () => '¿Qué te hace diferente de tu competencia?',
    help: 'Lo que dirían de ti tus mejores clientes.',
  },
  {
    q: () => '¿Cómo escuchan hoy a sus clientes y qué hacen con sus quejas y sugerencias?',
    help: 'Qué canales usan, quién responde y cómo dan seguimiento.',
  },
  {
    q: () => '¿En qué casos debe intervenir una persona de tu equipo?',
    help: 'Situaciones delicadas, montos o decisiones que tu representación no debe tomar sola.',
  },
]

export const REVIEW_POINTS = 5

export interface MenuDraft {
  id: string
  title: string
  description: string
  on: boolean
}

export const DEFAULT_MENUS: readonly MenuDraft[] = [
  { id: 'conoce', title: 'Conoce lo que ofrecemos', description: 'Productos, servicios y precios', on: true },
  { id: 'cotiza', title: 'Cotiza o agenda', description: 'Estima un costo o reserva con tu equipo', on: true },
  { id: 'duda', title: 'Resuelve una duda', description: 'Preguntas frecuentes y condiciones', on: true },
  { id: 'caso', title: 'Haz seguimiento a tu caso', description: 'Estado de pedidos, citas o reclamos', on: true },
]

const URL_PATTERN = /(https?:\/\/[^\s,]+|www\.[^\s,]+|[a-z0-9-]+\.(?:com|mx|org|net|io|co|com\.mx)(?:\/[^\s,]*)?)/gi

export function extractUrls(text: string): string[] {
  const found = text.match(URL_PATTERN) ?? []
  return found.map((u) => (/^https?:/i.test(u) ? u : `https://${u}`))
}

export function parseHex(text: string): string | null {
  const m = text.match(/#?([0-9a-f]{6})\b/i)
  return m ? `#${m[1].toLowerCase()}` : null
}

/** Navy o blanco, el que más contraste da sobre el color del cliente (ver `onColor` en el design system). */
export function onColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return lum > 0.4 ? '#0f1b4c' : '#ffffff'
}
