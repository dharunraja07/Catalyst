import dotenv from 'dotenv'

dotenv.config()

export const env = {
  get NODE_ENV() { return process.env.NODE_ENV || 'development' },
  get PORT() { return Number(process.env.PORT || 4000) },
  get MONGO_URI() { return process.env.MONGO_URI || process.env.MONGODB_URI || '' },
  get JWT_SECRET() { return process.env.JWT_SECRET || '' },
  get GEMINI_API_KEY() { return process.env.GEMINI_API_KEY || '' },
  get CLIENT_URL() { return process.env.CLIENT_URL || '' },
  get USE_MEMORY_MONGO() { return process.env.USE_MEMORY_MONGO === 'true' }
}

export function ensureRequiredEnv() {
  const missing = []

  if (!env.MONGO_URI && !env.USE_MEMORY_MONGO) missing.push('MONGO_URI (MongoDB Atlas connection string)')
  if (!env.JWT_SECRET) missing.push('JWT_SECRET')
  if (!env.GEMINI_API_KEY) missing.push('GEMINI_API_KEY')

  if (missing.length > 0 && env.NODE_ENV !== 'test') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
