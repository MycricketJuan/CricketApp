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
      <div className="flex min-w-0 flex-1 flex-col border-r border-[#1a1c1a]">
        <div className="flex items-center gap-3 border-b border-[#1a1c1a] px-[26px] py-5">
          <div className="grid h-[30px] w-[30px] place-items-center rounded-full border border-[rgba(74,222,128,.45)] text-xs text-[#4ade80]">
            ◈
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white">El entrenador</div>
            <div className="mt-0.5 text-[11.5px] text-[#6d726d]">Aquí ajustas. No le hables al agente, háblame a mí.</div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto px-[26px] py-6">
          {trainerMessages.map((m, idx) => (
            <div
              key={idx}
              className="max-w-[88%] px-[17px] py-3.5 text-sm leading-[1.6]"
              style={
                m.from === 'trainer'
                  ? { alignSelf: 'flex-start', background: '#0f1a12', border: '1px solid #24402c', color: '#dcf3e2' }
                  : { alignSelf: 'flex-end', background: '#141614', border: '1px solid #1c1f1c', color: '#c9cec9' }
              }
            >
              {m.text}
            </div>
          ))}
          <div className="max-w-[92%] self-start border border-[#1c1f1c] bg-[#0a0b0a] px-[17px] py-3.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-[.13em] text-[#5f645f]">
              Cambios aplicados ahora
            </div>
            <div className="mt-2.5 flex flex-col gap-2">
              {TRAINER_APPLIED.map((a) => (
                <div key={a.what} className="flex items-center gap-2.5 text-[13px] text-[#c9cec9]">
                  <span className="text-[11px] text-[#4ade80]">✓</span>
                  <span className="flex-1">{a.what}</span>
                  <span className="tabular-nums text-xs text-[#6d726d]">
                    {a.from} → {a.to}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3.5 flex gap-2.5">
              <div
                onClick={() => setTrainerSaved(true)}
                className="cursor-pointer bg-[#4ade80] px-[15px] py-2.5 text-[12.5px] font-semibold text-[#04140a] hover:bg-[#86efac]"
              >
                {trainerSaved ? 'Guardado ✓' : 'Guardar en su formación'}
              </div>
              <div
                onClick={() => setTrainerSaved(false)}
                className="cursor-pointer border border-[#232623] px-[15px] py-2.5 text-[12.5px] text-[#9aa09a] hover:border-[#3f5a45] hover:text-[#d5d8d5]"
              >
                Deshacer
              </div>
            </div>
          </div>
        </div>
        <div className="px-[26px] pb-[22px] pt-4">
          <div className="flex h-[52px] items-center gap-3 rounded-[26px] border border-[#212421] bg-[#0f110f] px-2.5">
            <div className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-[#181b18] text-[13px] text-[#8a8f8a] hover:bg-[#20261f] hover:text-[#4ade80]">
              🎙
            </div>
            <input
              value={trainerDraft}
              onChange={(e) => setTrainerDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendTrainer()}
              placeholder="Dime qué corregir de la última respuesta…"
              className="flex-1 bg-transparent text-sm text-[#e8e8e8] placeholder:text-[#5f645f] focus:outline-none"
            />
            <div
              onClick={sendTrainer}
              className="grid h-[34px] w-[34px] cursor-pointer place-items-center rounded-full bg-[#4ade80] text-sm text-[#04140a] hover:bg-[#86efac]"
            >
              ↑
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-[400px] flex-none flex-col bg-[#050605]">
        <div className="flex items-center gap-3 border-b border-[#1a1c1a] px-6 py-5">
          <div className="h-[34px] w-[34px] rounded-full bg-[#e8c9a0]" style={{ boxShadow: 'inset 0 -12px 0 #2f7f52' }} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white">Lucía · Aurelia</div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] shadow-[0_0_8px_#4ade80]" />
              <span className="text-[11.5px] text-[#8a8f8a]">Prueba en vivo · no cuenta como conversación real</span>
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
                  ? { alignSelf: 'flex-start', background: '#0f1a12', border: '1px solid #24402c', color: '#dcf3e2' }
                  : { alignSelf: 'flex-end', background: '#141614', border: '1px solid #1c1f1c', color: '#c9cec9' }
              }
            >
              {m.text}
            </div>
          ))}
        </div>
        <div className="px-6 pb-4">
          <div className="flex gap-px border border-[#1c1f1c] bg-[#1c1f1c]">
            {TEST_ROLES.map((r) => (
              <div
                key={r.key}
                onClick={() => setTestChatRole(r.key)}
                className="flex-1 cursor-pointer py-2.5 text-center text-[12.5px]"
                style={
                  r.key === testChatRole
                    ? { background: '#0f1a12', color: '#4ade80', fontWeight: 600 }
                    : { background: '#0a0b0a', color: '#7a7f7a' }
                }
              >
                {r.name}
              </div>
            ))}
          </div>
          <div className="mt-2.5 text-[11.5px] leading-[1.55] text-[#5f645f]">{roleNote}</div>
        </div>
        <div className="px-6 pb-[22px]">
          <div className="flex h-12 items-center gap-2.5 rounded-3xl border border-[#212421] bg-[#0f110f] px-2.5">
            <input
              value={testDraft}
              onChange={(e) => setTestDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendTest()}
              placeholder="Escríbele como un cliente…"
              className="flex-1 bg-transparent pl-2 text-[13.5px] text-[#e8e8e8] placeholder:text-[#5f645f] focus:outline-none"
            />
            <div
              onClick={sendTest}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-[#181b18] text-[13px] text-[#8a8f8a] hover:bg-[#20261f] hover:text-[#4ade80]"
            >
              ↑
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
