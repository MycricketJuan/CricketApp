import { NextRequest, NextResponse } from 'next/server'
import {
  addTurnCost,
  appendMessage,
  getOrCreateRepresentation,
  loadRepresentationState,
  recomputeUnderstanding,
} from '@/lib/representation/db'
import { runTurn } from '@/lib/representation/engine'
import { resolveTenantContext } from '@/lib/representation/tenant'

export const dynamic = 'force-dynamic'

// POST /api/representation/turn
// body: { inputs?: string[] }  — mensajes encolados del usuario (vacío = arranque)
// Persiste los mensajes del usuario, corre el bucle con tool use, persiste la
// respuesta de ZEREZ, recalcula el entendimiento y devuelve el estado nuevo.
export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveTenantContext(req)
    if (!ctx) return NextResponse.json({ error: 'Tenant no resuelto' }, { status: 400 })

    const body = (await req.json().catch(() => ({}))) as { inputs?: unknown }
    const inputs = Array.isArray(body.inputs)
      ? body.inputs.map((x) => String(x)).map((s) => s.trim()).filter(Boolean)
      : []

    const repId = await getOrCreateRepresentation(ctx.tenantId, ctx.createdBy)

    // 1. Persistir los mensajes del usuario (si los hay) ANTES de llamar al modelo.
    for (const content of inputs) {
      await appendMessage(repId, ctx.tenantId, { role: 'user', content })
    }

    // 2. Correr el turno (lee el hilo ya persistido).
    const result = await runTurn({
      representationId: repId,
      tenantId: ctx.tenantId,
      model: ctx.claudeModel ?? 'claude-sonnet-5-5',
    })

    // 3. Persistir el mensaje de ZEREZ con costo/tokens del turno.
    const text = result.text || (result.effects.ask?.question ?? '')
    await appendMessage(repId, ctx.tenantId, {
      role: 'zerez',
      content: text,
      card: result.effects.card,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      costUsd: result.usage.costUsd,
      toolsUsed: result.toolsUsed,
    })
    await addTurnCost(repId, result.usage.inputTokens, result.usage.outputTokens, result.usage.costUsd)

    // 4. Recalcular entendimiento (servidor) y devolver estado nuevo.
    await recomputeUnderstanding(repId)
    const state = await loadRepresentationState(repId)

    return NextResponse.json({
      state,
      message: { role: 'zerez', content: text, card: result.effects.card ?? null },
      effects: {
        incomplete: result.effects.incomplete,
        ask: result.effects.ask,
        changedItems: result.effects.changedItems,
        confirmedItems: result.effects.confirmedItems,
      },
    })
  } catch (err) {
    console.error('[representation/turn] POST', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
