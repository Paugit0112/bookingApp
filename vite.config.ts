import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'date-fns': path.resolve(__dirname, './node_modules/date-fns/index.js'),
    },
  },
  optimizeDeps: {
    include: ['date-fns'],
  },
})
