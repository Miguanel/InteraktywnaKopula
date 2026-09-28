import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Ścieżki względne – build działa zarówno pod własną domeną (Render),
  // jak i w podkatalogu na serwerze klienta (np. /konfigurator/).
  base: './',
  build: {
    // three.js jest duży z natury; scena 3D i tak ładuje się osobnym chunkiem (lazy import)
    chunkSizeWarningLimit: 1500,
  },
})
