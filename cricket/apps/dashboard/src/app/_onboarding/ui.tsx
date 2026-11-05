'use client'

import type { ReactNode } from 'react'

export type OrbState = 'idle' | 'thinking'

export function Orb({ state, size = 64 }: { state: OrbState; size?: number }) {
  return (
    <div
      aria-hidden
      className={`rounded-full bg-spark shadow-glow ${state === 'thinking' ? 'animate-spin' : 'animate-pulse'}`}
      style={{
        width: size,
        height: size,
        animationDuration: state === 'thinking' ? 'var(--duration-orb-spin)' : 'var(--duration-orb-breathe)',
      }}
    />
  )
}

export function UnderstandingMeter({ value, goal, label }: { value: number; goal: number; label: string }) {
  const reached = value >= goal
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-label uppercase text-ink-subtle">{label}</span>
        <span className="text-numeral text-ink">{value}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-2 overflow-hidden rounded-full bg-wash"
      >
        <div
          className="h-full rounded-full bg-spark transition-[width] duration-meter"
          style={{ width: `${value}%` }}
        />
        <div className="absolute inset-y-0 w-px bg-ink-subtle" style={{ left: `${goal}%` }} />
      </div>
      <p className="text-caption text-ink-muted">
        {reached
          ? 'Meta alcanzada: ya puedes probar tu representación.'
          : `Al llegar al ${goal}% te muestro lo que hay que revisar.`}
      </p>
    </div>
  )
}

export function QuestionCard({ title, help, children }: { title: string; help?: string; children?: ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg bg-surface-100 p-6 shadow-card">
      <div className="space-y-1">
        <h2 className="text-question text-ink">{title}</h2>
        {help && <p className="text-body text-ink-muted">{help}</p>}
      </div>
      {children}
    </section>
  )
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full bg-primary px-5 py-2.5 text-body font-semibold text-on-primary transition-colors duration-fast hover:bg-primary-hover disabled:opacity-50"
    >
      {children}
    </button>
  )
}

export function GhostButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-wash px-5 py-2.5 text-body font-semibold text-ink transition-colors duration-fast hover:bg-wash-strong"
    >
      {children}
    </button>
  )
}
