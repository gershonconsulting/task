import type { Config } from 'tailwindcss'

/**
 * Gershon.AI unified look (2026-10-13): Linalysis layout, Gershon.ai red as the
 * main colour. `brand` is the canonical name; `indigo` is remapped to the same
 * red scale so every older indigo accent in the app turns Gershon red at once.
 */
const brand = {
  50: '#fff5f5',
  100: '#ffe4e1',
  200: '#ffc9c2',
  300: '#ff9f93',
  400: '#ff6a58',
  500: '#ff3b24',
  600: '#FE1B04',
  700: '#d11200',
  800: '#a80f02',
  900: '#7a0d03',
  950: '#450600',
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
