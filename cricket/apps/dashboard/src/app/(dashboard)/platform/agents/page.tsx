import { getSupabaseAdmin } from '@cricket/core/supabase/admin'

const AGENT_META: Record<string, { label: string; desc: string; color: string }> = {
  consultation_agent: {
    label: 'Consulta',
    desc:  'Responde preguntas usando el knowledge base del tenant.',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  sales_agent: {
    label: 'Ventas',
    desc:  'Identifica oportunidades y propone productos del catálogo.',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
  },
  transactions_agent: {
    label: 'Transacciones',
    desc:  'Valida identidad y estructura previews de operaciones para aprobación IH.',
    color: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  feedback_agent: {
    label: 'Feedback',
    desc:  'Recoge NPS y CSAT al cierre del journey.',
    color: 'bg-green-50 border-green-200 text-green-700',
  },
}

export default async function AgentsPage() {
  const db      = getSupabaseAdmin()
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: decisions } = await db
    .from('ai_decisions')
    .select('agent_type, confidence, latency_ms, prompt_tokens, completion_tokens, created_at, model')
    .gte('created_at', since30)

  const rows = decisions ?? []

  // Agrupar métricas por agent_type
  const agentKeys = Object.keys(AGENT_META)

  const stats = agentKeys.map((key) => {
    const subset = rows.filter((r) => r.agent_type === key)
    const total  = subset.length
    if (total === 0) {
      return { key, total: 0, avgConfidence: null, avgLatency: null, totalTokens: 0, p50Latency: null }
    }
    const avgConfidence = subset.reduce((s, r) => s + Number(r.confidence ?? 0), 0) / total
    const avgLatency    = subset.reduce((s, r) => s + (r.latency_ms ?? 0), 0) / total
    const totalTokens   = subset.reduce((s, r) => s + (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0), 0)
    const latencies     = subset.map((r) => r.latency_ms ?? 0).sort((a, b) => a - b)
    const p50Latency    = latencies[Math.floor(latencies.length / 2)] ?? null
    return { key, total, avgConfidence, avgLatency, totalTokens, p50Latency }
  })

  // Últimas 20 decisiones
  const recent = [...rows]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20)

  const totalDecisions = rows.length
  const globalAvgConf  = totalDecisions > 0
    ? rows.reduce((s, r) => s + Number(r.confidence ?? 0), 0) / totalDecisions
    : null
  const globalAvgMs    = totalDecisions > 0
    ? rows.reduce((s, r) => s + (r.latency_ms ?? 0), 0) / totalDecisions
    : null

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Agentes IA</h1>
        <p className="text-sm text-gray-500">
          Rendimiento de los últimos 30 días · {totalDecisions.toLocaleString('es')} decisiones totales
        </p>
      </div>

      {/* Resumen global */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Decisiones (30 d)</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{totalDecisions.toLocaleString('es')}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Confianza promedio</p>
          <p className={`mt-1 text-3xl font-semibold ${
            globalAvgConf == null ? 'text-gray-400'
            : globalAvgConf >= 0.7 ? 'text-green-600'
            : globalAvgConf >= 0.5 ? 'text-amber-600'
            : 'text-red-600'
          }`}>
            {globalAvgConf != null ? `${(globalAvgConf * 100).toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Latencia promedio</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {globalAvgMs != null ? `${(globalAvgMs / 1000).toFixed(1)} s` : '—'}
          </p>
        </div>
      </div>

      {/* Cards por agente */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((s) => {
          const meta = AGENT_META[s.key]
          return (
            <div key={s.key} className={`rounded-xl border p-5 ${meta.color}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{meta.label}</p>
                  <p className="mt-0.5 text-xs opacity-60">{meta.desc}</p>
                </div>
                <span className="text-xs font-medium opacity-60">{s.total} usos</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs opacity-60">Confianza</p>
                  <p className="text-lg font-bold">
                    {s.avgConfidence != null ? `${(s.avgConfidence * 100).toFixed(0)}%` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs opacity-60">P50 latencia</p>
                  <p className="text-lg font-bold">
                    {s.p50Latency != null ? `${(s.p50Latency / 1000).toFixed(1)} s` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs opacity-60">Tokens</p>
                  <p className="text-lg font-bold">
                    {s.totalTokens > 0 ? `${(s.totalTokens / 1000).toFixed(0)} k` : '—'}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modelo en uso */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-gray-700 mb-3">Modelos en uso</p>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400">Sin datos aún</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {[...new Set(rows.map((r) => r.model))].map((model) => (
              <span key={model} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-mono text-gray-600">
                {model}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Últimas decisiones */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Últimas decisiones
        </h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Agente', 'Confianza', 'Latencia', 'Tokens', 'Fecha'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                    Sin decisiones registradas en los últimos 30 días
                  </td>
                </tr>
              ) : recent.map((r) => {
                const conf = Number(r.confidence ?? 0)
                return (
                  <tr key={`${r.agent_type}-${r.created_at}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-700">
                      {AGENT_META[r.agent_type]?.label ?? r.agent_type}
                    </td>
                    <td className={`px-4 py-2.5 font-medium ${
                      conf >= 0.7 ? 'text-green-600' : conf >= 0.5 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {(conf * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {r.latency_ms != null ? `${(r.latency_ms / 1000).toFixed(1)} s` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {((r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0)).toLocaleString('es')}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">
                      {new Date(r.created_at).toLocaleString('es', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
