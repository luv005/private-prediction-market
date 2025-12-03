import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  preview: {
    allowedHosts: ['private-prediction-market-production.up.railway.app'],
  },
})
