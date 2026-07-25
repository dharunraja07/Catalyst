import mongoose from 'mongoose'

const studyGroupSchema = new mongoose.Schema({
  groupName: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joinCode: { type: String, unique: true, sparse: true },
  maxMembers: { type: Number, default: 15 },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true })

studyGroupSchema.pre('validate', async function(next) {
  if (this.joinCode) return next()

  let code = ''
  let attempts = 0

  while (attempts < 10) {
    code = Math.random().toString(36).slice(2, 10).toUpperCase()
    const existing = await this.constructor.findOne({ joinCode: code })
    if (!existing) {
      this.joinCode = code
      return next()
    }
    attempts += 1
  }

  return next(new Error('Unable to generate a unique join code'))
})

export default mongoose.model('StudyGroup', studyGroupSchema)
