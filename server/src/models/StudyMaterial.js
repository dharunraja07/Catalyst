import mongoose from 'mongoose'

const studyMaterialSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyGroup', required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, default: 'application/octet-stream' },
  // Stored as a base64 data URL so materials work with zero disk dependency
  // (Render's filesystem is ephemeral) — fine for the reasonably small
  // study notes/PDFs/images this feature targets.
  dataUrl: { type: String, required: true },
  filePath: { type: String },
  uploadedAt: { type: Date, default: Date.now }
})

studyMaterialSchema.index({ groupId: 1, uploadedAt: -1 })

export default mongoose.model('StudyMaterial', studyMaterialSchema)
