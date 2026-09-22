export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#1E1F22',
        panel: '#2B2D30',
        border: '#393B40',
        hover: '#43454A',
        selection: '#2E436E',
        accent: '#3574F0',
        text: '#CED0D6',
        heading: '#F0F1F2',
        muted: '#868A91',
        disabled: '#6F737A',
        success: '#5FAD65',
        warning: '#F2C55C',
        error: '#E55765',
        syntax: {
          keyword: '#CF8E6D',
          string: '#6AAB73',
          number: '#2AACB8',
          function: '#56A8F5',
          comment: '#7A7E85',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        island: '8px',
        control: '6px',
        chip: '4px',
      },
    },
  },
  plugins: [],
}
