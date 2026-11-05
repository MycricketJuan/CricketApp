import type { Config } from 'tailwindcss'

// ZEREZ — preset de Tailwind v3 (tokens v15). Los colores apuntan a las variables de zerez-tokens.css.
const zerezPreset: Partial<Config> = {
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        "surface-000": "var(--surface-000)",
        "surface-100": "var(--surface-100)",
        "surface-200": "var(--surface-200)",
        "surface-glass": "var(--surface-glass)",
        "border-soft": "var(--border-soft)",
        "border-strong": "var(--border-strong)",
        "wash": "var(--wash)",
        "wash-strong": "var(--wash-strong)",
        "ink": "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        "ink-subtle": "var(--ink-subtle)",
        "primary": "var(--primary)",
        "primary-hover": "var(--primary-hover)",
        "on-primary": "var(--on-primary)",
        "primary-tint": "var(--primary-tint)",
        "brand-blue": "var(--brand-blue)",
        "spark-cyan": "var(--spark-cyan)",
        "spark-blue": "var(--spark-blue)",
        "spark-violet": "var(--spark-violet)",
        "spark-amber": "var(--spark-amber)",
        "logo-ink": "var(--logo-ink)",
        "aura-cyan": "var(--aura-cyan)",
        "aura-violet": "var(--aura-violet)",
        "aura-amber": "var(--aura-amber)",
        "success": "var(--success)",
        "danger": "var(--danger)"
      },
      fontFamily: { sans: ['var(--font-sans)'] },
      borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', full: 'var(--radius-full)', sheet: 'var(--dock-sheet-radius)' },
      boxShadow: { card: 'var(--shadow-card)', float: 'var(--shadow-float)', glow: 'var(--shadow-glow)' },
      backdropBlur: { glass: 'var(--blur-glass)' },
      maxWidth: { conversation: 'var(--conversation-max)', rail: 'var(--rail-width)', panel: 'var(--panel-width)', page: 'var(--page-max)', dock: 'var(--dock-max)' },
      width: { rail: 'var(--rail-width)', panel: 'var(--panel-width)', 'insight-nav': 'var(--insight-nav-width)', 'insight-panel': 'var(--insight-panel-width)' },
      zIndex: { dock: 'var(--z-dock)', topbar: 'var(--z-topbar)' },
      transitionDuration: { fast: 'var(--duration-fast)', base: 'var(--duration-base)', progress: 'var(--duration-progress)', enter: 'var(--duration-enter)' },
      transitionTimingFunction: { rise: 'var(--ease-rise)' },
      screens: { 'zz-mobile': { max: '520px' }, 'zz-compact': { max: '760px' }, 'zz-panel': { max: '1180px' } },
      fontSize: {
        display: ['56px', { lineHeight: '60px', fontWeight: '700', letterSpacing: '-0.02em' }],
        slogan: ['40px', { lineHeight: '48px', fontWeight: '400', letterSpacing: '-0.005em' }],
        question: ['30px', { lineHeight: '36px', fontWeight: '700', letterSpacing: '-0.01em' }],
        message: ['17px', { lineHeight: '26px', fontWeight: '400' }],
        body: ['15px', { lineHeight: '22px', fontWeight: '400' }],
        title: ['16px', { lineHeight: '22px', fontWeight: '600' }],
        label: ['11px', { lineHeight: '14px', fontWeight: '700', letterSpacing: '0.08em' }],
        caption: ['13px', { lineHeight: '18px', fontWeight: '400' }],
        numeral: ['14px', { lineHeight: '16px', fontWeight: '700' }]
      },
      backgroundImage: { spark: 'linear-gradient(120deg, var(--spark-cyan) 0%, var(--spark-blue) 38%, var(--spark-violet) 72%, var(--spark-amber) 100%)' }
    }
  }
}

export default zerezPreset
