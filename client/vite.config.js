import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
              console.warn(`[vite proxy] Backend starting up on port 4000 (${err.code}). Request queued...`)
            }
            if (res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Backend unavailable or starting up, retrying...' }))
            }
          })
        }
      },
      '/socket.io': {
        target: 'http://127.0.0.1:4000',
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
              // Suppress transient websocket connection refusal while server spins up
            }
          })
        }
      }
    }
  }
})
