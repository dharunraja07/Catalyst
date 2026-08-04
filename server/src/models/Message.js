import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyGroup', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  isSystem: { type: Boolean, default: false },
  systemEventType: { type: String, default: null },
  isDeleted: { type: Boolean, default: false },
  deletedForEveryone: { type: Boolean, default: false },
  deletedForUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model('Message', messageSchema)
