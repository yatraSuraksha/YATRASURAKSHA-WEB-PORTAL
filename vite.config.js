import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/YATRA-SURAKSHA-ADMIN-PORTAL/' : '/',
  server: {
    port: 5173,
    strictPort: true, // Fail if port is in use instead of trying another
  }
})
