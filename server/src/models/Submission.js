import mongoose from 'mongoose'

const submissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '', trim: true },
  attachment: {
    fileName: { type: String, default: '' },
    fileType: { type: String, default: '' },
    dataUrl: { type: String, default: '' }
  },
  status: { type: String, enum: ['submitted', 'graded'], default: 'submitted' },
  grade: { type: String, default: '' },
  feedback: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true })

// One submission per student per assignment — resubmitting overwrites it.
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true })

export default mongoose.model('Submission', submissionSchema)
