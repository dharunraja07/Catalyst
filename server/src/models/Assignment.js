import mongoose from 'mongoose'

const assignmentSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  subject: { type: String, default: 'General', trim: true },
  dueDate: { type: Date },
  attachment: {
    fileName: { type: String, default: '' },
    fileType: { type: String, default: '' },
    // Small attachments (assignment sheets, briefs) are stored inline as a
    // base64 data URL so there's no dependency on disk storage — this keeps
    // the app working unchanged on Render's ephemeral filesystem.
    dataUrl: { type: String, default: '' }
  }
}, { timestamps: true })

assignmentSchema.index({ teacher: 1, createdAt: -1 })

export default mongoose.model('Assignment', assignmentSchema)
