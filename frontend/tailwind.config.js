/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark': {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
          600: '#252532',
        },
        'accent': {
          blue: '#3b82f6',
          green: '#22c55e',
          red: '#ef4444',
          purple: '#8b5cf6',
        }
      }
    },
  },
  plugins: [],
}
