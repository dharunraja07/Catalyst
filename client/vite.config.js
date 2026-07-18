import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

async function resolveApiTarget() {
  const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '')
  const configuredTarget = env.VITE_API_URL || env.VITE_PROXY_TARGET || 'http://localhost:4000'
  const normalized = configuredTarget.startsWith('http') ? configuredTarget.replace(/\/$/, '') : 'http://localhost:4000'
  const candidates = Array.from(new Set([
    normalized,
    'http://localhost:4000',
    'http://localhost:4001',
    'http://localhost:4002',
    'http://localhost:4003',
    'http://localhost:4004',
    'http://localhost:4005'
  ]))

  for (const candidate of candidates) {
    try {
      const response = await fetch(`${candidate}/health`)
      if (response.ok) return candidate
    } catch {
      // Try the next candidate until one responds.
    }
  }

  return normalized
}

export default defineConfig(async () => {
  const target = await resolveApiTarget()

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})
