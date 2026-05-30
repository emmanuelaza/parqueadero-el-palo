/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        // Punto Moto brand tokens (refer to CSS variables in index.css for rebranding)
        pm: {
          'blue-900':   'var(--blue-900)',
          'blue-700':   'var(--blue-700)',
          'blue-600':   'var(--blue-600)',
          'yellow-400': 'var(--yellow-400)',
          'yellow-300': 'var(--yellow-300)',
          white:        'var(--white)',
          'gray-50':    'var(--gray-50)',
          'gray-100':   'var(--gray-100)',
          'gray-400':   'var(--gray-400)',
          'gray-600':   'var(--gray-600)',
          success:      'var(--success)',
          danger:       'var(--danger)',
          warning:      'var(--warning)',
        },
      },
      boxShadow: {
        'pm-sm': 'var(--shadow-sm)',
        'pm-md': 'var(--shadow-md)',
        'pm-lg': 'var(--shadow-lg)',
      },
      borderRadius: {
        'pm-sm': 'var(--radius-sm)',
        'pm-md': 'var(--radius-md)',
        'pm-lg': 'var(--radius-lg)',
      },
    },
  },
  plugins: [],
}
