import { headers } from 'next/headers'

export default async function DashboardPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'app'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">ZEREZ Dashboard</h1>
        <p className="text-lg text-ink-muted">
          Plataforma de agentes IA para el customer journey
        </p>
        <div className="rounded-lg border border-border-soft bg-surface-100 px-6 py-4 text-sm text-ink-subtle">
          Tenant: <span className="font-mono font-medium text-ink">{tenantSlug}</span>
        </div>
      </div>
    </main>
  )
}
