import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false })

const chatConversationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, trim: true, default: 'New chat' },
  messages: { type: [messageSchema], default: [] }
}, { timestamps: true })

chatConversationSchema.index({ user: 1, updatedAt: -1 })

export default mongoose.model('ChatConversation', chatConversationSchema)
