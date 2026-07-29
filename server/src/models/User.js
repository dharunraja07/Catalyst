import mongoose from 'mongoose'

const studySessionSchema = new mongoose.Schema({
  date: { type: String, required: true },
  minutes: { type: Number, default: 0 }
}, { _id: false })

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: false },
  googleId: { type: String },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  educationLevel: { type: String, default: 'College' },
  interestedSubjects: { type: [String], default: [] },
  careerInterests: { type: [String], default: [] },
  learningStyle: { type: String, enum: ['Visual', 'Reading', 'Practice', 'Mixed'], default: 'Mixed' },
  avatar: { type: String, default: '' },
  history: { type: [String], default: [] },
  dailyGoalMinutes: { type: Number, default: 60 },
  studySessions: { type: [studySessionSchema], default: [] },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
}, { timestamps: true })

export default mongoose.model('User', userSchema)
