'use client'

import { useState } from 'react'
import { CANNED_AGENT_REPLIES, CANNED_TRAINER_REPLIES, TEST_ROLES, TRAINER_APPLIED } from './constants'
import type { ChatMessage, TestChatRole } from './types'

interface ScreenWorkshopProps {
  trainerMessages: ChatMessage[]
  addTrainerMessage: (m: ChatMessage) => void
  testMessages: ChatMessage[]
  addTestMessage: (m: ChatMessage) => void
  testChatRole: TestChatRole
  setTestChatRole: (r: TestChatRole) => void
  trainerSaved: boolean
  setTrainerSaved: (v: boolean) => void
}

let replyCursor = 0

export function ScreenWorkshop({
  trainerMessages,
  addTrainerMessage,
  testMessages,
  addTestMessage,
  testChatRole,
  setTestChatRole,
  trainerSaved,
  setTrainerSaved,
}: ScreenWorkshopProps) {
  const [trainerDraft, setTrainerDraft] = useState('')
  const [testDraft, setTestDraft] = useState('')
  const roleNote = TEST_ROLES.find((r) => r.key === testChatRole)?.note ?? ''

  function sendTrainer() {
    const text = trainerDraft.trim()
    if (!text) return
    addTrainerMessage({ from: 'admin', text })
    setTrainerDraft('')
    const reply = CANNED_TRAINER_REPLIES[replyCursor % CANNED_TRAINER_REPLIES.length]
    replyCursor += 1
    setTimeout(() => addTrainerMessage({ from: 'trainer', text: reply }), 400)
  }

  function sendTest() {
    const text = testDraft.trim()
    if (!text) return
    addTestMessage({ from: 'user', text })
    setTestDraft('')
    const reply = CANNED_AGENT_REPLIES[replyCursor % CANNED_AGENT_REPLIES.length]
    replyCursor += 1
    setTimeout(() => addTestMessage({ from: 'agent', text: reply }), 400)
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col border-r border-border-soft">
        <div className="flex items-center gap-3 border-b border-border-soft px-[26px] py-5">
          <div className="grid h-[30px] w-[30px] place-items-center rounded-full border border-[color-mix(in_srgb,var(--primary)_45%,transparent)] text-xs text-primary">
            ◈
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-ink">El entrenador</div>
            <div className="mt-0.5 text-[11.5px] text-ink-subtle">Aquí ajustas. No le hables al agente, háblame a mí.</div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto px-[26px] py-6">
          {trainerMessages.map((m, idx) => (
            <div
              key={idx}
              className="max-w-[88%] px-[17px] py-3.5 text-sm leading-[1.6]"
              style={
                m.from === 'trainer'
                  ? { alignSelf: 'flex-start', background: 'var(--primary-tint)', border: '1px solid var(--primary-tint)', color: 'var(--ink)' }
                  : { alignSelf: 'flex-end', background: 'var(--surface-000)', border: '1px solid var(--border-soft)', color: 'var(--ink)' }
              }
            >
              {m.text}
            </div>
          ))}
          <div className="max-w-[92%] self-start border border-border-soft bg-surface-000 px-[17px] py-3.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-[.13em] text-ink-subtle">
              Cambios aplicados ahora
            </div>
            <div className="mt-2.5 flex flex-col gap-2">
              {TRAINER_APPLIED.map((a) => (
                <div key={a.what} className="flex items-center gap-2.5 text-[13px] text-ink">
                  <span className="text-[11px] text-primary">✓</span>
                  <span className="flex-1">{a.what}</span>
                  <span className="tabular-nums text-xs text-ink-subtle">
                    {a.from} → {a.to}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3.5 flex gap-2.5">
              <div
                onClick={() => setTrainerSaved(true)}
                className="cursor-pointer bg-primary px-[15px] py-2.5 text-[12.5px] font-semibold text-on-primary hover:bg-primary"
              >
                {trainerSaved ? 'Guardado ✓' : 'Guardar en su formación'}
              </div>
              <div
                onClick={() => setTrainerSaved(false)}
                className="cursor-pointer border border-border-soft px-[15px] py-2.5 text-[12.5px] text-ink-muted hover:border-primary-tint hover:text-ink"
              >
                Deshacer
              </div>
            </div>
          </div>
        </div>
        <div className="px-[26px] pb-[22px] pt-4">
          <div className="flex h-[52px] items-center gap-3 rounded-[26px] border border-border-soft bg-surface-000 px-2.5">
            <div className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-surface-200 text-[13px] text-ink-muted hover:bg-surface-200 hover:text-primary">
              🎙
            </div>
            <input
              value={trainerDraft}
              onChange={(e) => setTrainerDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendTrainer()}
              placeholder="Dime qué corregir de la última respuesta…"
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-subtle focus:outline-none"
            />
            <div
              onClick={sendTrainer}
              className="grid h-[34px] w-[34px] cursor-pointer place-items-center rounded-full bg-primary text-sm text-on-primary hover:bg-primary"
            >
              ↑
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-[400px] flex-none flex-col bg-surface-000">
        <div className="flex items-center gap-3 border-b border-border-soft px-6 py-5">
          <div className="h-[34px] w-[34px] rounded-full bg-[#e8c9a0]" style={{ boxShadow: 'inset 0 -12px 0 var(--primary)' }} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-ink">Lucía · Aurelia</div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
              <span className="text-[11.5px] text-ink-muted">Prueba en vivo · no cuenta como conversación real</span>
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-6 py-[22px]">
          {testMessages.map((m, idx) => (
            <div
              key={idx}
              className="max-w-[86%] px-4 py-[13px] text-[13.5px] leading-[1.6]"
              style={
                m.from === 'agent'
                  ? { alignSelf: 'flex-start', background: 'var(--primary-tint)', border: '1px solid var(--primary-tint)', color: 'var(--ink)' }
                  : { alignSelf: 'flex-end', background: 'var(--surface-000)', border: '1px solid var(--border-soft)', color: 'var(--ink)' }
              }
            >
              {m.text}
            </div>
          ))}
        </div>
        <div className="px-6 pb-4">
          <div className="flex gap-px border border-border-soft bg-surface-200">
            {TEST_ROLES.map((r) => (
              <div
                key={r.key}
                onClick={() => setTestChatRole(r.key)}
                className="flex-1 cursor-pointer py-2.5 text-center text-[12.5px]"
                style={
                  r.key === testChatRole
                    ? { background: 'var(--primary-tint)', color: 'var(--primary)', fontWeight: 600 }
                    : { background: 'var(--surface-000)', color: 'var(--ink-subtle)' }
                }
              >
                {r.name}
              </div>
            ))}
          </div>
          <div className="mt-2.5 text-[11.5px] leading-[1.55] text-ink-subtle">{roleNote}</div>
        </div>
        <div className="px-6 pb-[22px]">
          <div className="flex h-12 items-center gap-2.5 rounded-3xl border border-border-soft bg-surface-000 px-2.5">
            <input
              value={testDraft}
              onChange={(e) => setTestDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendTest()}
              placeholder="Escríbele como un cliente…"
              className="flex-1 bg-transparent pl-2 text-[13.5px] text-ink placeholder:text-ink-subtle focus:outline-none"
            />
            <div
              onClick={sendTest}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-surface-200 text-[13px] text-ink-muted hover:bg-surface-200 hover:text-primary"
            >
              ↑
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
