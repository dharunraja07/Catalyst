import dotenv from 'dotenv'

dotenv.config()

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4000),
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  CLIENT_URL: process.env.CLIENT_URL || '',

  // AI Provider Keys
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  AI_PROVIDER_DEFAULT: process.env.AI_PROVIDER_DEFAULT || 'gemini',

  // SMTP / Email
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: process.env.SMTP_PORT || '587',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_SECURE: process.env.SMTP_SECURE || 'false',
  EMAIL_FROM: process.env.EMAIL_FROM || '',

  // Study Groups
  MAX_GROUP_MEMBERS: Number(process.env.MAX_GROUP_MEMBERS || 70)
}

export function ensureRequiredEnv() {
  const missing = []

  if (!env.MONGO_URI) missing.push('MONGO_URI')
  if (!env.JWT_SECRET) missing.push('JWT_SECRET')

  // At least one AI key must be configured
  const hasAnyAIKey = env.GEMINI_API_KEY || env.GROQ_API_KEY
  if (!hasAnyAIKey) missing.push('GEMINI_API_KEY or GROQ_API_KEY')

  if (missing.length > 0 && env.NODE_ENV !== 'test') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
