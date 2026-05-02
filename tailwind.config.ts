import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./pages/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#0f0f14',
        card: '#1a1a24',
        border: '#2a2a3a',
        accent: '#6c63ff',
        buy: '#22c55e',
        hold: '#eab308',
        sell: '#ef4444',
        primary: '#f1f5f9',
        secondary: '#94a3b8',
      },
    },
  },
  plugins: [],
}
export default config
