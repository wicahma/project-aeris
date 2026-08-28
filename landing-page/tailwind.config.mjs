/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#09090b',
          card: '#18181b',
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
        sans: ['Inter', 'Plus Jakarta Sans', 'sans-serif']
      },
      boxShadow: {
        neubrutalism: '4px 4px 0px 0px #6366f1',
        'neubrutalism-green': '4px 4px 0px 0px #10b981',
        'neubrutalism-dark': '4px 4px 0px 0px #27272a'
      }
    }
  },
  plugins: []
};