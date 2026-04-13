import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/upload-resume': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/generate-questions': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/evaluate-interview': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/save-report': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/start-session': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/reports': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/report': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ollama': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
