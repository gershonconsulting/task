import type { Config } from 'tailwindcss'

/**
 * Gershon unified design (decision 2026-10-13, re-based 2026-10-22, v1.4.0):
 * Linalysis layout, Gershon.ai red #CC3333 as the main colour (same tokens as
 * Radar / Pulse unified-theme.css). `brand` is the canonical name; `indigo` is
 * remapped to the same red scale so every older indigo accent turns Gershon red.
 * 600 = brand #CC3333, 700 = dark #a8281f, 50 = tint #fdf2f2.
 */
const brand = {
  50: '#fdf2f2',
  100: '#fbe3e3',
  200: '#f3caca',
  300: '#e9a3a3',
  400: '#dc6b6b',
  500: '#d24545',
  600: '#CC3333',
  700: '#a8281f',
  800: '#87211a',
  900: '#6b1b16',
  950: '#3d0d0a',
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
