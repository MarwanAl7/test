import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // يسمح بفتح التطبيق من الهاتف على نفس شبكة Wi-Fi
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
