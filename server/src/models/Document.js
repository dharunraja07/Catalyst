import mongoose from 'mongoose'

const documentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploaderName: { type: String, default: 'User' },
  module: {
    type: String,
    enum: ['assessment', 'practice', 'group', 'meet'],
    required: true
  },
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', default: null },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyGroup', default: null },
  meetId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true })

export default mongoose.model('Document', documentSchema)
