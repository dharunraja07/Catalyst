import mongoose from 'mongoose'

const meetSchema = new mongoose.Schema({
  roomCode: { type: String, unique: true, required: true },
  title: { type: String, default: 'Study Meet' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true })

meetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

meetSchema.pre('validate', async function(next) {
  if (this.roomCode) return next()

  let code = ''
  let attempts = 0

  while (attempts < 10) {
    code = Math.random().toString(36).slice(2, 10).toUpperCase()
    const existing = await this.constructor.findOne({ roomCode: code })
    if (!existing) {
      this.roomCode = code
      return next()
    }
    attempts += 1
  }

  return next(new Error('Unable to generate a unique room code'))
})

export default mongoose.model('Meet', meetSchema)
