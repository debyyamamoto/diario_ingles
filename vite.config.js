import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // importante: caminhos relativos, senão quebra ao empacotar no Electron
  build: {
    outDir: 'dist'
  },
  server: {
    port: 5173,
    strictPort: true
  },
  test: {
    environment: 'node'
  }
})
