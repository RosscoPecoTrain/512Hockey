import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0a1628',
          light: '#112240',
          dark: '#060e1a',
        },
        ice: {
          DEFAULT: '#4fc3f7',
          light: '#81d4fa',
          dark: '#0288d1',
        },
      },
    },
  },
  plugins: [],
}

export default config
