import mongoose from 'mongoose'

let memoryServerPromise = null

// Lazily import mongodb-memory-server only when it's actually needed. This
// package is a devDependency meant for quick local testing when no Atlas
// connection string is available yet — it should never be required in
// production/deployment, and Render's production install (NODE_ENV=production)
// won't even have it installed.
async function connectLocalMongo() {
  if (memoryServerPromise) return memoryServerPromise

  memoryServerPromise = (async () => {
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    return MongoMemoryServer.create({ instance: { dbName: 'ai-learning-local' } })
  })()

  return memoryServerPromise
}

/**
 * Connects to MongoDB Atlas (or any MONGO_URI you provide) whenever one is
 * configured — this is the path used in every deployed environment (Render)
 * and is also the recommended path for local development, so your local
 * app and your deployment always talk to the same Atlas cluster.
 *
 * Only if MONGO_URI is completely empty AND USE_MEMORY_MONGO=true is set
 * explicitly do we fall back to a disposable in-memory MongoDB instance —
 * handy for a quick spin-up without ever touching Atlas, but never used
 * unless you opt in.
 */
export async function connectDatabase(env) {
  const mongoUri = env.MONGO_URI || process.env.MONGO_URI || ''

  if (mongoUri) {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 20,
      autoIndex: env.NODE_ENV !== 'production'
    })
    return { uri: mongoUri, isMemory: false }
  }

  if (env.USE_MEMORY_MONGO) {
    const localServer = await connectLocalMongo()
    await mongoose.connect(localServer.getUri(), {
      dbName: 'ai-learning-local',
      serverSelectionTimeoutMS: 8000,
      autoIndex: true
    })
    return { uri: localServer.getUri(), isMemory: true }
  }

  throw new Error(
    'No MONGO_URI provided. Set MONGO_URI to your MongoDB Atlas connection string ' +
    '(see server/.env.example), or set USE_MEMORY_MONGO=true for a temporary in-memory database.'
  )
}
