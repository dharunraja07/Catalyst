import mongoose from 'mongoose'
import { env } from './env.js'

export async function connectDatabase() {
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
