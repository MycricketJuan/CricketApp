// Utilidades de color compartidas (servidor y cliente). Sin 'use client'.

/** Extrae un hex #rrggbb de un texto libre, o null. */
export function parseHexServer(text: string): string | null {
  const m = text.match(/#?([0-9a-f]{6})\b/i)
  return m ? `#${m[1].toLowerCase()}` : null
}

/** Navy o blanco, el que más contraste da sobre el color dado (WCAG aprox.). */
export function onColor(hex: string): string {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex
  if (clean.length !== 6) return '#0f1b4c'
  const n = parseInt(clean, 16)
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return lum > 0.4 ? '#0f1b4c' : '#ffffff'
}
