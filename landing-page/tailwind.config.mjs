/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        accent: 'var(--accent)',
        'accent-ink': 'var(--accent-ink)',
        'code-bg': 'var(--code-bg)',
        dark: {
          bg: '#09090b',
          card: '#121215',
          border: '#27272a',
          muted: '#a1a1aa'
        },
        brand: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          accent: '#10b981'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Space Grotesk', 'Cabinet Grotesk', 'sans-serif'],
        sans: ['Inter', 'Plus Jakarta Sans', 'sans-serif']
      }
    }
  },
  plugins: []
};
