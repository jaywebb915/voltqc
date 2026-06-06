/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'volt-bg': '#0B0B0C',
        'volt-surface': '#131316',
        'volt-surface2': '#1A1A20',
        'volt-border': '#2A2A32',
        'volt-red': '#E31B23',
        'volt-red-hover': '#C4161D',
        'volt-green': '#22C55E',
        'volt-green-bg': 'rgba(34,197,94,0.12)',
        'volt-red-bg': 'rgba(227,27,35,0.12)',
        'volt-amber': '#F59E0B',
        'volt-amber-bg': 'rgba(245,158,11,0.12)',
        'volt-gray': '#6B7280',
        'volt-text': '#E5E7EB',
        'volt-text-dim': '#9CA3AF',
        'volt-text-muted': '#6B7280',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'volt': '0 0 20px rgba(227, 27, 35, 0.15)',
        'volt-glow': '0 0 40px rgba(227, 27, 35, 0.25)',
      },
    },
  },
  plugins: [],
}