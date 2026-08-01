import mongoose from 'mongoose'

const roadmapSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: { type: [mongoose.Schema.Types.Mixed], default: [] },
  score: { type: Number, default: 0 },
  scoreTier: { type: String, default: 'Beginner' },
  strengths: { type: [String], default: [] },
  weaknesses: { type: [String], default: [] }
}, { timestamps: true })

export default mongoose.model('Roadmap', roadmapSchema)
