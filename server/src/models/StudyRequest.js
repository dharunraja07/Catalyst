import mongoose from 'mongoose'

const studyRequestSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyGroup', default: null },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
})

studyRequestSchema.index({ receiver: 1, status: 1 })
studyRequestSchema.index({ receiver: 1, isRead: 1 })

export default mongoose.model('StudyRequest', studyRequestSchema)
