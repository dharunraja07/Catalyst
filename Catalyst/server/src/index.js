import express from 'express'
import http from 'http'
import cors from 'cors'
import mongoose from 'mongoose'
import dns from 'dns'
import serverless from 'serverless-http'

// Fix Node.js DNS SRV resolution issue on Windows (e.g. WSL/Hyper-V network adapters refusing SRV queries)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch (e) {
  console.warn('Failed to set custom DNS servers:', e.message)
}
import { Server } from 'socket.io'
import authRoutes from './routes/authRoutes.js'
import assessmentRoutes from './routes/assessmentRoutes.js'
import questionRoutes from './routes/questionRoutes.js'
import roadmapRoutes from './routes/roadmapRoutes.js'
import careerRoutes from './routes/careerRoutes.js'
import progressRoutes from './routes/progressRoutes.js'
import studyGroupRoutes from './routes/studyGroupRoutes.js'
import teacherRoutes from './routes/teacherRoutes.js'
import aiRoutes from './routes/aiRoutes.js'
import todoRoutes from './routes/todoRoutes.js'
import { setupChatSocket } from './sockets/chatSocket.js'
import { errorHandler } from './middleware/errorMiddleware.js'
import { env, ensureRequiredEnv } from './config/env.js'

const app = express()

// Render (and most PaaS hosts) sit behind a reverse proxy, so trust the
// first proxy hop for correct protocol/IP handling (safe no-op locally).
app.set('trust proxy', 1)

const allowedOrigins = env.CLIENT_URL
  ? env.CLIENT_URL.split(',').map((item) => item.trim()).filter(Boolean)
  : []

function isAllowedOrigin(origin) {
  if (!origin) return true
  if (allowedOrigins.length === 0) return true
  if (allowedOrigins.includes(origin)) return true
  try {
    const { hostname } = new URL(origin)
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
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/assessment', assessmentRoutes)
app.use('/api/questions', questionRoutes)
app.use('/api/roadmap', roadmapRoutes)
app.use('/api/career', careerRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/study-groups', studyGroupRoutes)
app.use('/api/teacher', teacherRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/todos', todoRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', environment: env.NODE_ENV })
})

app.use(errorHandler)

const httpServer = http.createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true
  }
})

app.set('io', io)
setupChatSocket(io)

function startServer(port, attemptsLeft = 5) {
  // Bind explicitly to 0.0.0.0 so the server is reachable inside Render's
  // container (and any other host that proxies traffic to the container).
  // Falling back to auto-increment ports only makes sense locally — on
  // Render the platform assigns PORT and expects a single fixed bind, so we
  // skip the retry/increment behavior there.
  const host = '0.0.0.0'
  const server = httpServer.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}`)
  })

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0 && !process.env.RENDER) {
      console.warn(`Port ${port} is busy. Trying ${port + 1} instead...`)
      server.close(() => {
        startServer(port + 1, attemptsLeft - 1)
      })
      return
    }

    console.error('Server startup error:', error)
    process.exit(1)
  })
}

async function connectDatabase() {
  const localMongoUri = 'mongodb://127.0.0.1:27017/catalyst'
  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: env.NODE_ENV !== 'production'
    })

    console.log('MongoDB connected successfully')

    if (!process.env.VERCEL) {
      startServer(env.PORT)
    }
  } catch (error) {
    console.warn(`Primary MongoDB connection failed (${error.message}). Trying local MongoDB fallback at ${localMongoUri}...`)
    try {
      await mongoose.connect(localMongoUri, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: env.NODE_ENV !== 'production'
      })
      console.log('Connected successfully to local MongoDB fallback!')
      if (!process.env.VERCEL) {
        startServer(env.PORT)
      }
    } catch (localError) {
      console.error('MongoDB connection error (both primary and local failed):', localError)
      process.exit(1)
    }
  }
}

if (env.NODE_ENV !== 'test') {
  ensureRequiredEnv()
  connectDatabase()
}

export default process.env.VERCEL ? serverless(app) : app
