import express from 'express'
import http from 'http'
import net from 'net'
import cors from 'cors'
import serverless from 'serverless-http'
import authRoutes from './routes/authRoutes.js'
import assessmentRoutes from './routes/assessmentRoutes.js'
import questionRoutes from './routes/questionRoutes.js'
import roadmapRoutes from './routes/roadmapRoutes.js'
import careerRoutes from './routes/careerRoutes.js'
import progressRoutes from './routes/progressRoutes.js'
import studyGroupRoutes from './routes/studyGroupRoutes.js'
import teacherRoutes from './routes/teacherRoutes.js'
import classroomRoutes from './routes/classroomRoutes.js'
import aiRoutes from './routes/aiRoutes.js'
import todoRoutes from './routes/todoRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import { errorHandler } from './middleware/errorMiddleware.js'
import { env, ensureRequiredEnv } from './config/env.js'
import { initSocket } from './socket.js'
import { connectDatabase as connectMongoDatabase } from './localMongo.js'

const app = express()

// Render (and most PaaS hosts) sit behind a reverse proxy, so trust the
// first proxy hop for correct protocol/IP handling (safe no-op locally).
app.set('trust proxy', 1)

const allowedOrigins = env.CLIENT_URL
  ? env.CLIENT_URL.split(',').map((item) => item.trim()).filter(Boolean)
  : []

// Vercel generates a brand-new preview URL for every branch/PR
// (e.g. ai-based-personalized-learning-platform-<hash>-<user>.vercel.app),
// in addition to your stable production domain. A plain exact-match origin
// list would keep breaking every time you open a fresh preview link, so we
// explicitly allow any *.vercel.app subdomain that belongs to this project,
// on top of whatever's listed in CLIENT_URL.
function isAllowedOrigin(origin) {
  if (!origin) return true // non-browser requests (curl, server-to-server, health checks) have no Origin header

  if (allowedOrigins.includes(origin)) return true

  try {
    const { hostname, protocol } = new URL(origin)
    const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(hostname)
    const isHttp = protocol === 'http:' || protocol === 'https:'

    if (isLocalhost && isHttp) {
      return true
    }

    if (hostname.endsWith('.vercel.app') && hostname.includes('ai-based-personalized-learning-platform')) {
      return true
    }
  } catch {
    return false
  }

  return false
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true)
    } else {
      callback(null, false)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json({ limit: '8mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/assessment', assessmentRoutes)
app.use('/api/questions', questionRoutes)
app.use('/api/roadmap', roadmapRoutes)
app.use('/api/career', careerRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/study-groups', studyGroupRoutes)
app.use('/api/teacher', teacherRoutes)
app.use('/api/classroom', classroomRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/todos', todoRoutes)
app.use('/api/chat', chatRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', environment: env.NODE_ENV })
})

app.use(errorHandler)

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(port, '0.0.0.0')
  })
}

async function startServer(port = env.PORT) {
  // Bind explicitly to 0.0.0.0 so the server is reachable inside Render's
  // container (and any other host that proxies traffic to the container).
  const host = '0.0.0.0'
  // Use an explicit http.Server (instead of app.listen's implicit one) so
  // Socket.IO can attach to the same server for real-time group chat.
  const httpServer = http.createServer(app)
  initSocket(httpServer, isAllowedOrigin)

  const preferredPort = Number(port)
  const nextPort = await findAvailablePort(preferredPort)

  httpServer.listen(nextPort, host, () => {
    console.log(`Server running on http://${host}:${nextPort}`)
  })

  httpServer.on('error', (error) => {
    console.error('Server startup error:', error)
    process.exit(1)
  })
}

async function findAvailablePort(port) {
  if (await isPortAvailable(port)) return port

  for (let candidate = port + 1; candidate <= port + 10; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate
  }

  return port
}

async function connectDatabase() {
  try {
    const connection = await connectMongoDatabase(env)
    console.log(`MongoDB connected successfully${connection.isMemory ? ' (local memory server)' : ''}`)

    if (!process.env.VERCEL) {
      startServer(env.PORT)
    }
  } catch (error) {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  }
}

if (env.NODE_ENV !== 'test') {
  ensureRequiredEnv()
  connectDatabase()
}

export default process.env.VERCEL ? serverless(app) : app
