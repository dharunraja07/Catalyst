import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyGroup', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

messageSchema.index({ groupId: 1, createdAt: 1 })

export default mongoose.model('Message', messageSchema)
