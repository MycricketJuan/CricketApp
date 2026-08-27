'use client'

import { Archivo } from 'next/font/google'
import { useEffect, useState } from 'react'
import { FEEDBACK_SEED, SCREEN_COUNT, TEST_CHAT_SEED, TRAINER_SEED } from './constants'
import { ScreenEscalations } from './screen-escalations'
import { ScreenFeedback } from './screen-feedback'
import { ScreenIdentity } from './screen-identity'
import { ScreenKnowledge } from './screen-knowledge'
import { ScreenPortfolio } from './screen-portfolio'
import { ScreenSummary } from './screen-summary'
import { ScreenWelcome } from './screen-welcome'
import { ScreenWorkshop } from './screen-workshop'
import { Sidebar } from './sidebar'
import { TopBar } from './top-bar'
import type { ChatMessage, Sector, TestChatRole } from './types'

const archivo = Archivo({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], display: 'swap' })

export function AgenteWizard() {
  const [i, setI] = useState(0)
  const [name] = useState('Lucía')
  const [sector, setSector] = useState<Sector>('mobiliario')
  const [shirtColorIndex, setShirtColorIndex] = useState(0)
  const [testChatRole, setTestChatRole] = useState<TestChatRole>('atencion')
  const [feedbackRules, setFeedbackRules] = useState(FEEDBACK_SEED)
  const [trainerMessages, setTrainerMessages] = useState<ChatMessage[]>(TRAINER_SEED)
  const [testMessages, setTestMessages] = useState<ChatMessage[]>(TEST_CHAT_SEED)
  const [trainerSaved, setTrainerSaved] = useState(false)
  const [entered, setEntered] = useState(false)

  const goTo = (n: number) => setI(Math.max(0, Math.min(SCREEN_COUNT - 1, n)))
  const next = () => goTo(i + 1)
  const prev = () => goTo(i - 1)
  const goWorkshop = () => goTo(6)

  useEffect(() => {
    setEntered(false)
    const t = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(t)
  }, [i])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [i])

  function toggleFeedbackRule(id: string) {
    setFeedbackRules((rules) => rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)))
  }

  function addTrainerMessage(m: ChatMessage) {
    setTrainerMessages((prevMsgs) => [...prevMsgs, m])
  }

  function addTestMessage(m: ChatMessage) {
    setTestMessages((prevMsgs) => [...prevMsgs, m])
  }

  return (
    <div className={`${archivo.className} fixed inset-0 z-50 overflow-hidden bg-[#0b0c0d] text-[#e8e8e8]`}>
      <style>{`
        @keyframes agenteOrbPulse {
          0%,100% { transform:scale(1); box-shadow:0 0 0 1px rgba(74,222,128,.35), 0 0 26px 2px rgba(74,222,128,.30); }
          50% { transform:scale(1.035); box-shadow:0 0 0 1px rgba(74,222,128,.55), 0 0 46px 6px rgba(74,222,128,.42); }
        }
      `}</style>
      <div className="flex h-full flex-col">
        <TopBar i={i} goTo={goTo} prev={prev} next={next} />
        <div
          className="flex min-h-0 flex-1 transition-all duration-500"
          style={{ opacity: entered ? 1 : 0, transform: entered ? 'translateY(0)' : 'translateY(14px)' }}
        >
          <Sidebar i={i} goTo={goTo} goWorkshop={goWorkshop} />
          <div key={i} className="flex min-h-0 flex-1 flex-col bg-black">
            {i === 0 && <ScreenWelcome next={next} />}
            {i === 1 && (
              <ScreenIdentity
                name={name}
                sector={sector}
                setSector={setSector}
                shirtColorIndex={shirtColorIndex}
                setShirtColorIndex={setShirtColorIndex}
                next={next}
              />
            )}
            {i === 2 && <ScreenKnowledge />}
            {i === 3 && <ScreenPortfolio next={next} />}
            {i === 4 && <ScreenFeedback rules={feedbackRules} toggle={toggleFeedbackRule} next={next} />}
            {i === 5 && <ScreenEscalations goWorkshop={goWorkshop} />}
            {i === 6 && (
              <ScreenWorkshop
                trainerMessages={trainerMessages}
                addTrainerMessage={addTrainerMessage}
                testMessages={testMessages}
                addTestMessage={addTestMessage}
                testChatRole={testChatRole}
                setTestChatRole={setTestChatRole}
                trainerSaved={trainerSaved}
                setTrainerSaved={setTrainerSaved}
              />
            )}
            {i === 7 && (
              <ScreenSummary name={name} sector={sector} shirtColorIndex={shirtColorIndex} goWorkshop={goWorkshop} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
