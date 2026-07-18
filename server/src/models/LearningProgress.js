import mongoose from 'mongoose'

const dailyActivitySchema = new mongoose.Schema({
  date: { type: String, required: true },
  hasAssessment: { type: Boolean, default: false },
  hasPractice: { type: Boolean, default: false },
  studyMinutes: { type: Number, default: 0 }
}, { _id: false })

const progressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completedTopics: { type: [String], default: [] },
  scoreHistory: { type: [{ score: Number, date: Date }], default: [] },
  lastReviewed: { type: Map, of: Date, default: {} },
  dailyActivity: { type: [dailyActivitySchema], default: [] }
}, { timestamps: true })

export default mongoose.model('LearningProgress', progressSchema)
