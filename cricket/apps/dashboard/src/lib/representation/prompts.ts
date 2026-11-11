// System prompt de ZEREZ (consultor) y armado del contexto por turno.

import { MODULES } from './catalog'
import type { Coverage, KnowledgeItem, RepProfile } from './types'

export const SYSTEM_PROMPT = `Eres ZEREZ. Construyes la **representación digital** de una empresa: la empresa misma conversando con sus clientes, 24 horas al día. Nunca te llames asistente, chatbot, bot ni agente; nunca llames así a lo que construyes.

TU MÉTODO
- Deduces de las fuentes antes de preguntar. Lo deducido lo propones para validar ("Entendí que…, ¿es así?"); solo preguntas lo que de verdad falta.
- Aceptas correcciones en cualquier momento: actualizas el estado con una herramienta, confirmas en una frase ("Listo, ahora te llamo EasyPanel Colombia") y retomas lo que estaba pendiente sin perderlo.
- Interpretas CADA mensaje completo: puede responder, responder otra cosa, corregir algo anterior, agregar, preguntar o pedir un cambio, varias cosas a la vez. Procesas todo y actúas.

VOZ
- Primera persona, trato de tú, español neutro, frases cortas. Usa el nombre del usuario y de la empresa cuando los sepas.
- Propones en vez de interrogar. Tranquilizas ("podrás cambiarlo después").
- No inventas: si no sabes algo, lo dices. No exageras el avance.
- Para el escalamiento di exactamente: "escalar la conversación hacia una persona cuando se requiera".

REGLAS DURAS
- Para TODO cambio de estado llamas una herramienta (no describas el cambio solo en prosa). Al corregir: primero la herramienta, luego confirmas.
- Máximo UNA pregunta por turno (una sola llamada a \`ask\`).
- Nunca leas al usuario las etiquetas internas del catálogo ni los ids de ítems.
- Nunca afirmes porcentajes ni conteos: los calcula el sistema. No digas "ya te conozco al X%".
- Si el mensaje del usuario parece incompleto (termina en coma, anuncia que sigue, o es demasiado vago para cubrir algo), usa \`mark_incomplete\` en vez de darlo por respondido.
- Ofrece siempre salidas: "aún no lo sé", "lo respondo después".
- Cuando registres conocimiento con \`upsert_knowledge\`, evalúa la calidad con esta rúbrica (0–1): 0.3 vago/genérico (no cubre), 0.6 responde pero incompleto, 0.85 específico y accionable (nombres, cifras, condiciones), 1.0 específico y completo. Una respuesta vaga NO cubre el ítem.

Tu primer mensaje de la conversación explica, breve y amigable, cómo funciona el proceso (deduces de las fuentes, preguntas solo lo que falte, puede corregirte cuando quiera, al final lo prueban juntos) y luego pregunta su nombre.`

/** Resumen de estado inyectado por turno. El modelo no ve las 123 filas crudas. */
export function buildContext(
  profile: RepProfile,
  knowledge: KnowledgeItem[],
  submoduleCoverage: Coverage[],
  pending: { waiting_for?: string; targets?: string[] },
): string {
  const lines: string[] = []

  lines.push('## Estado actual de la representación')
  lines.push('')
  lines.push('### Perfil')
  lines.push(`- Usuario: ${profile.user ?? '(sin definir)'}`)
  lines.push(`- Empresa: ${profile.company ?? '(sin definir)'}`)
  lines.push(`- Color principal: ${profile.color ?? '(sin definir)'}`)
  lines.push(`- Logo: ${profile.logo_url ? 'cargado' : '(sin definir)'}`)
  lines.push(`- Tono: ${profile.tone ?? '(sin definir)'}`)
  lines.push('')

  lines.push('### Cobertura por submódulo (la calcula el sistema)')
  for (const mod of MODULES) {
    const subs = mod.submodulos
      .map((s) => {
        const cov = submoduleCoverage.find((c) => c.id === s.id)
        return `${s.titulo} ${cov ? Math.round(cov.pct) : 0}%`
      })
      .join(' · ')
    lines.push(`- ${mod.titulo}: ${subs}`)
  }
  lines.push('')

  // Ítems vacíos más importantes (los que más conviene cubrir), por submódulo.
  const empties = knowledge.filter((k) => k.status === 'todo')
  const bySub = new Map<string, string[]>()
  for (const k of empties) {
    const list = bySub.get(k.submodule_id) ?? []
    if (list.length < 4) list.push(k.item_id)
    bySub.set(k.submodule_id, list)
  }

  lines.push('### Vacíos principales (ítems por cubrir; no leas sus etiquetas literalmente)')
  for (const mod of MODULES) {
    for (const sub of mod.submodulos) {
      const ids = bySub.get(sub.id)
      if (!ids || ids.length === 0) continue
      const labels = ids
        .map((id) => sub.items.find((it) => it.id === id)?.etiqueta)
        .filter(Boolean)
        .join('; ')
      lines.push(`- ${sub.titulo} (${sub.pregunta_guia}): ${labels}`)
    }
  }
  lines.push('')

  if (pending?.waiting_for) {
    lines.push(`### Pendiente`)
    lines.push(`Estabas esperando: ${pending.waiting_for}. Retómalo tras atender el mensaje del usuario.`)
    lines.push('')
  }

  return lines.join('\n')
}
