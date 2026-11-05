import type {
  EscalationRule,
  FeedbackRule,
  PortfolioItem,
  Sector,
  SectorInfo,
  TestChatRole,
  TradeInfo,
} from './types'

export const SCREEN_COUNT = 8

export const SCREENS: { title: string; step: string }[] = [
  { title: 'Bienvenida',            step: 'Cómo funciona el proceso' },
  { title: 'Identidad',             step: 'Cara, camiseta y tono' },
  { title: 'Conocimiento',          step: 'La empresa' },
  { title: 'Portafolio',            step: 'Categorías, precios, descuentos' },
  { title: 'Feedback',              step: 'NPS y CSAT' },
  { title: 'Escalamientos',         step: 'Temas restringidos' },
  { title: 'Taller del empleado',   step: 'Entrenador y agente en vivo' },
  { title: 'Formación completada',  step: 'Un solo asistente, tres oficios' },
]

// screen index -> sidebar nav index (-2 = welcome/no highlight, -1 = workshop/summary/no highlight)
export const SCREEN_TO_NAV: Record<number, number> = {
  0: -2, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: -1, 7: -1,
}

export const NAV_STEPS = [
  { name: 'Identidad',      sub: 'Cara, camiseta, tono' },
  { name: 'Conocimiento',   sub: 'Qué es la empresa' },
  { name: 'Portafolio',     sub: 'Qué vende y con qué reglas' },
  { name: 'Feedback',       sub: 'Qué mide después de atender' },
  { name: 'Escalamientos',  sub: 'Cuándo no decide sola' },
]

export const SECTORS: SectorInfo[] = [
  {
    key: 'mobiliario',
    label: 'Mobiliario',
    note: 'Oficio y materiales. Explica antes de vender.',
    greeting: 'Hola, soy Lucía. Cuéntame qué espacio estás amoblando y te ayudo con medidas y maderas.',
    headColor: '#e8c9a0',
  },
  {
    key: 'tatuajes',
    label: 'Tatuajes',
    note: 'Directo y con jerga del oficio. Cero formalismo.',
    greeting: 'Qué más, soy Lucía. ¿Qué tienes en mente? Mándame la referencia y vemos tamaño y zona.',
    headColor: '#d9b48f',
  },
  {
    key: 'legal',
    label: 'Legal',
    note: 'Trato de usted, cauteloso, sin prometer resultados.',
    greeting: 'Buenas tardes, soy Lucía. ¿En qué asunto podemos asesorarle?',
    headColor: '#e3cbb0',
  },
  {
    key: 'salud',
    label: 'Salud',
    note: 'Claro y tranquilizador. No diagnostica nunca.',
    greeting: 'Hola, soy Lucía. Cuénteme qué necesita y le ayudo a agendar con el especialista.',
    headColor: '#efd9bd',
  },
]

export function getSectorInfo(sector: Sector): SectorInfo {
  return SECTORS.find((s) => s.key === sector) ?? SECTORS[0]
}

export const SHIRT_COLORS = ['var(--primary-tint)', '#1f4f8c', '#8c2f3a', '#c9a227', '#2b2b2b']

export function getSemaforo(screenIndex: number): {
  level: 0 | 1 | 2
  name:  string
  pct:   string
  note:  string
} {
  if (screenIndex <= 2) {
    return { level: 0, name: 'Atención limitada', pct: '31%', note: 'Falta información. Aún no debería atender clientes sola.' }
  }
  if (screenIndex <= 5) {
    return { level: 1, name: 'Mejora parcial', pct: '70%', note: 'Ya responde lo básico. Queda cerrar vacíos.' }
  }
  return { level: 2, name: 'Empleada completa', pct: '96%', note: 'Alta confianza en atención al cliente.' }
}

export const STAGES = [
  { n: '1', name: 'Identidad',     detail: 'Le das nombre, cara y el tono que corresponde a tu sector.' },
  { n: '2', name: 'Conocimiento',  detail: 'Le cuentas qué es tu empresa, a qué se dedica y qué la hace distinta.' },
  { n: '3', name: 'Portafolio',    detail: 'Lo específico: categorías, precios, descuentos y hasta dónde puede negociar.' },
  { n: '4', name: 'Feedback',      detail: 'Qué le preguntas al cliente cuando termina de atenderlo.' },
  { n: '5', name: 'Escalamientos', detail: 'Los temas donde no decide sola y a quién le pasa el caso.' },
]

export const KNOWLEDGE_CHIPS = [
  { name: 'Actividad',     pending: false },
  { name: 'Clientes',      pending: false },
  { name: 'Diferenciador', pending: false },
  { name: 'Trayectoria',   pending: true },
]

export const PORTFOLIO_SEED: PortfolioItem[] = [
  { id: 'categorias',    name: 'Categorías',      status: 'listo',     q: '¿Cómo agrupas lo que vendes?', a: 'Comedores, salas, alcobas y piezas por encargo. 34 referencias activas.' },
  { id: 'precios',       name: 'Precios',         status: 'listo',     q: '¿Cómo se calcula el precio de una pieza?', a: 'Por madera, medida y acabado. Lucía cotiza rangos; el valor final lo confirma el taller.' },
  { id: 'descuentos',    name: 'Descuentos',      status: 'listo',     q: '¿Hasta dónde puede negociar?', a: 'Hasta 15% sin aprobación. Por encima, escala al equipo comercial.' },
  { id: 'disponibilidad', name: 'Disponibilidad', status: 'listo',     q: '¿Qué plazos puede prometer?', a: 'Cinco semanas desde el taller. Nunca ofrece menos, ni con presión del cliente.' },
  { id: 'cruzado',       name: 'Cruzado',         status: 'listo',     q: '¿Qué puede sugerir junto a una compra?', a: 'Sillas con comedor y cuidado de la madera. Sugiere una sola vez, sin insistir.' },
  { id: 'competencia',   name: 'Competencia',     status: 'pendiente', q: '¿Qué hace si el cliente la compara con otra marca?', a: 'Falta definir: ¿puede mencionar competidores, o solo responder por Aurelia?' },
]

export const FEEDBACK_SEED: FeedbackRule[] = [
  { id: 'nps',      name: 'NPS',                     when: 'Al cerrar la venta',                detail: 'Una pregunta de 0 a 10 sobre recomendación. Se pregunta una vez por trimestre por cliente.', enabled: true },
  { id: 'csat',     name: 'CSAT',                    when: 'Al cerrar cada conversación',        detail: 'Qué tan satisfecho quedó con la atención de hoy. Tres caras, sin texto obligatorio.', enabled: true },
  { id: 'nocompra', name: 'Motivo de no compra',      when: 'Si la conversación muere',           detail: 'Una sola pregunta abierta cuando el cliente deja de responder tras una cotización.', enabled: true },
  { id: 'postentrega', name: 'Encuesta post-entrega', when: '7 días después',                     detail: 'Sobre el producto, no sobre la atención. Requiere conectar el estado de despacho.', enabled: false },
]

export const ESCALATIONS_SEED: EscalationRule[] = [
  { id: 'precio',     topic: 'Precio tope',              rule: 'No confirma valores por encima de $12 M ni descuentos mayores al 15%.', owner: 'Ana · Comercial', level: 1 },
  { id: 'competencia', topic: 'Competencia',              rule: 'No compara, no opina de otras marcas. Responde solo por Aurelia y pasa el caso.', owner: 'Ana · Comercial', level: 1 },
  { id: 'crisis',     topic: 'Crisis de reputación',      rule: 'Reclamo público, mención a medios o amenaza legal: escala de inmediato y no argumenta.', owner: 'Dirección', level: 2 },
  { id: 'defecto',    topic: 'Producto defectuoso',       rule: 'Registra el caso con fotos y lo entrega a taller. No promete reposición ni fechas.', owner: 'Taller', level: 0 },
]

export const TRAINER_SEED: { from: 'admin' | 'trainer'; text: string }[] = [
  { from: 'trainer', text: 'Lucía ya está atendiendo en el panel de la derecha. Pruébala y dime qué corregir.' },
  { from: 'admin',   text: 'La última respuesta suena a folleto. Que sea más corta y que no repita el nombre del producto tres veces.' },
  { from: 'trainer', text: 'Entendido. Bajé la longitud de 4 a 2 y agregué una regla: no repetir la referencia más de una vez por mensaje. Vuelve a preguntarle lo mismo.' },
]

export const TRAINER_APPLIED = [
  { what: 'Longitud de respuesta',         from: '4',      to: '2' },
  { what: 'Repetición de referencia',      from: 'libre',  to: '1 vez' },
  { what: 'Cierre con pregunta',           from: 'off',    to: 'on' },
]

export const TEST_CHAT_SEED: { from: 'user' | 'agent'; text: string }[] = [
  { from: 'user',  text: '¿El comedor Bruma lo hacen en 2.40?' },
  { from: 'agent', text: 'Sí. En 2.40 lo entregamos en roble o nogal, en 5 semanas. ¿Te paso las dos opciones con precio?' },
  { from: 'user',  text: '¿Y en nogal cuánto sale?' },
  { from: 'agent', text: 'En nogal, 2.40 m: $6.8 M. Incluye entrega en Medellín. ¿Lo cotizo con seis sillas?' },
]

export const TEST_ROLES: { key: TestChatRole; name: string; note: string }[] = [
  { key: 'atencion', name: 'Atención', note: 'Estás probando cómo resuelve dudas. El coordinador la deja en atención mientras el cliente pregunta.' },
  { key: 'ventas',   name: 'Ventas',   note: 'Probando su lado vendedor: aquí se nota qué tan push la configuraste.' },
  { key: 'feedback', name: 'Feedback', note: 'Probando el cierre: cómo pide la calificación sin que se sienta una encuesta.' },
]

export const TRADES: TradeInfo[] = [
  { icon: '◈', name: 'Atención', detail: 'Responde dudas sobre productos, plazos y estado de pedidos.', trait: 'Personalidad: cálida, respuestas breves' },
  { icon: '◆', name: 'Ventas',   detail: 'Perfila al cliente, cotiza y sugiere lo que encaja con su espacio.', trait: 'Personalidad: push moderado (4/10)' },
  { icon: '◇', name: 'Feedback', detail: 'Cierra con NPS o CSAT y recoge el motivo cuando algo no gustó.', trait: 'Personalidad: neutral, sin insistir' },
]

export const CHANNELS = ['WhatsApp Business', 'Chat del sitio web', 'Instagram Direct']

export const CANNED_TRAINER_REPLIES = [
  'Listo, ajusté ese punto en su formación. Pruébala de nuevo en el panel de la derecha.',
  'Entendido, lo dejé anotado y actualicé la regla correspondiente.',
  'Hecho. Ese cambio ya quedó reflejado en su forma de responder.',
]

export const CANNED_AGENT_REPLIES = [
  'Claro, dame un momento y te cuento cómo lo manejamos.',
  'Sí, con gusto. ¿Me confirmas para cuándo lo necesitas?',
  'Perfecto, te paso los detalles enseguida.',
]
