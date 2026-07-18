import mongoose from 'mongoose'

const studyRequestSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  // 'pair' = classic 1-on-1 study request that creates a new 2-person group.
  // 'group_invite' = invite to join an existing group; requires the invited
  // user's approval before they're added to `groupId`'s member list.
  type: { type: String, enum: ['pair', 'group_invite'], default: 'pair' },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyGroup' },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model('StudyRequest', studyRequestSchema)
