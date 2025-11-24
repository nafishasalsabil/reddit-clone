import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF5722',
          50: '#FFEBE5',
          100: '#FFD6CC',
          200: '#FFB399',
          300: '#FF9066',
          400: '#FF6D33',
          500: '#FF5722',
          600: '#E64A1F',
          700: '#CC3D1C',
          800: '#B33019',
          900: '#992316',
        }
      }
    }
  },
  plugins: []
} satisfies Config
