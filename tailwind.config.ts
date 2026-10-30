import type { Config } from 'tailwindcss'

/**
 * Gershon.AI unified look (2026-10-13, red unified 2026-10-22): Linalysis layout, Gershon.ai red as the
 * main colour. `brand` is the canonical name; `indigo` is remapped to the same
 * red scale so every older indigo accent in the app turns Gershon red at once.
 */
// v1.4.0 (2026-10-22): unified Gershon red #CC3333 (dark #a8281f, tint #fdf2f2),
// same tokens as Radar / Pulse / Linalysis. Was #FE1B04.
const brand = {
  50: '#fdf2f2',
  100: '#fbe3e3',
  200: '#f3caca',
  300: '#e9a3a3',
  400: '#dc6b6b',
  500: '#d44a4a',
  600: '#CC3333',
  700: '#a8281f',
  800: '#8a2219',
  900: '#6e1c15',
  950: '#3d0e0a',
}

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand,
        indigo: brand,
        ink: { DEFAULT: '#1d1d1f', muted: '#6e6e73' },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
