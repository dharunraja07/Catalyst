import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
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
import meetRoutes from './routes/meetRoutes.js'
import { setupChatSocket } from './sockets/chatSocket.js'
import { setupMeetSocket } from './sockets/meetSocket.js'
import { errorHandler } from './middleware/errorMiddleware.js'
import { env, ensureRequiredEnv } from './config/env.js'

const app = express()

// Trust reverse proxies (Render, Vercel, Nginx, Heroku)
app.set('trust proxy', 1)

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}))

// Gzip compression for API responses
app.use(compression())

// Global API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
})

app.use('/api/', apiLimiter)

const allowedOrigins = env.CLIENT_URL
  ? env.CLIENT_URL.split(',').map((item) => item.trim()).filter(Boolean)
  : []

function isAllowedOrigin(origin) {
  if (!origin) return true
  if (env.NODE_ENV !== 'production') return true
  if (allowedOrigins.length === 0) return true
  if (allowedOrigins.includes(origin)) return true
  try {
    const { hostname } = new URL(origin)
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true
    if (hostname.endsWith('.vercel.app') || hostname.endsWith('.onrender.com')) return true
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
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

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
app.use('/api/meets', meetRoutes)

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
        callback(null, false)
      }
    },
    credentials: true
  }
})

app.set('io', io)
setupChatSocket(io)
setupMeetSocket(io)

function startServer(port, attemptsLeft = 5) {
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

  // Graceful shutdown handling
  const shutdown = (signal) => {
    console.log(`[${signal}] Shutting down gracefully...`)
    server.close(async () => {
      try {
        await mongoose.connection.close()
        console.log('Database connection closed.')
      } catch (err) {
        console.error('Error closing database connection:', err)
      }
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

async function connectDatabase() {
  const localMongoUri = 'mongodb://127.0.0.1:27017/catalyst'
  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: env.NODE_ENV !== 'production'
    })
    console.log('MongoDB connected successfully (Cloud Atlas)')
  } catch (err) {
    console.warn('MongoDB Atlas connection failed, trying local fallback:', err.message)
    try {
      await mongoose.connect(localMongoUri, {
        serverSelectionTimeoutMS: 3000,
        autoIndex: env.NODE_ENV !== 'production'
      })
      console.log('MongoDB connected successfully (Local Fallback)')
    } catch {
      console.log('MongoDB connection pending...')
    }
  }
}

if (env.NODE_ENV !== 'test') {
  ensureRequiredEnv()
  if (!process.env.VERCEL) {
    startServer(env.PORT)
  }
  connectDatabase()
}

export default process.env.VERCEL ? serverless(app) : app
