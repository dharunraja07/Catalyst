import mongoose from 'mongoose'

const aiMessageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AiConversation', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, index: true }
  }
)

aiMessageSchema.index({ conversationId: 1, user: 1, createdAt: -1 })

export default mongoose.model('AiMessage', aiMessageSchema)
