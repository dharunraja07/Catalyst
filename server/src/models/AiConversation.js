import mongoose from 'mongoose'

const aiConversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'New Chat' }
  },
  { timestamps: true }
)

export default mongoose.model('AiConversation', aiConversationSchema)
