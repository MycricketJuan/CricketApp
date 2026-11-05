import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './zerez-tokens.css'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'ZEREZ Dashboard',
  description: 'AI-powered customer journey platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="light" className={plusJakartaSans.variable}>
      <body className="bg-surface-000 text-ink antialiased">{children}</body>
    </html>
  )
}
