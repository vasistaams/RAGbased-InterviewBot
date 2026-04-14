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
      '/api': 'http://localhost:3000',
      '/upload-resume': 'http://localhost:3000',
      '/generate-questions': 'http://localhost:3000',
      '/evaluate-interview': 'http://localhost:3000',
      '/save-report': 'http://localhost:3000',
      '/start-session': 'http://localhost:3000',
      '/reports': 'http://localhost:3000',
      '/report': 'http://localhost:3000',
      '/ollama': 'http://localhost:3000',
    },
  },
})
