import fs from 'fs'
import path from 'path'
import multer from 'multer'
import Document from '../models/Document.js'
import StudyGroup from '../models/StudyGroup.js'
import Meet from '../models/Meet.js'

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.ppt', '.pptx',
  '.xls', '.xlsx', '.txt', '.csv', '.zip',
  '.jpg', '.jpeg', '.png', '.webp', '.gif'
]

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${uniqueSuffix}${ext}`)
  }
})

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Supported types: PDF, Word, PPT, Excel, Text, CSV, ZIP, Images.`))
  }
}

const MAX_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50', 10)

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 }
})

export async function uploadDocument(req, res, next) {
  try {
    if (!req.files && !req.file) {
      return res.status(400).json({ error: 'No files were uploaded' })
    }

    const files = req.files || [req.file]
    const { module: moduleName, assessmentId, questionId, groupId, meetId } = req.body

    if (!moduleName || !['assessment', 'practice', 'group', 'meet'].includes(moduleName)) {
      return res.status(400).json({ error: 'Invalid or missing module type' })
    }

    const createdDocs = []
    for (const file of files) {
      const doc = await Document.create({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/api/documents/file/${file.filename}`,
        uploadedBy: req.user._id,
        uploaderName: req.user.name || 'User',
        module: moduleName,
        assessmentId: assessmentId || null,
        questionId: questionId || null,
        groupId: groupId || null,
        meetId: meetId || null
      })
      await doc.populate('uploadedBy', 'name email')
      createdDocs.push(doc)

      // Broadcast socket event if io is attached
      if (req.app.get('io')) {
        const io = req.app.get('io')
        if (groupId) {
          io.to(groupId.toString()).emit('document_uploaded', doc)
        }
        if (meetId) {
          io.to(`meet:${meetId.toUpperCase()}`).emit('document_uploaded', doc)
        }
      }
    }

    res.status(201).json(createdDocs)
  } catch (error) {
    next(error)
  }
}

export async function getDocuments(req, res, next) {
  try {
    const { module: moduleName, assessmentId, questionId, groupId, meetId, search } = req.query
    const filter = {}

    if (moduleName) filter.module = moduleName
    if (assessmentId) filter.assessmentId = assessmentId
    if (questionId) filter.questionId = questionId
    if (groupId) filter.groupId = groupId
    if (meetId) filter.meetId = meetId.toUpperCase()

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i')
      filter.$or = [
        { originalName: regex },
        { filename: regex },
        { uploaderName: regex }
      ]
    }

    const docs = await Document.find(filter)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name email')

    res.json(docs)
  } catch (error) {
    next(error)
  }
}

export async function serveFile(req, res, next) {
  try {
    const { filename } = req.params
    const filePath = path.join(UPLOAD_DIR, path.basename(filename))

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' })
    }

    const ext = path.extname(filename).toLowerCase()

    // Serve with appropriate content disposition for preview vs download
    if (['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.txt', '.csv'].includes(ext)) {
      res.setHeader('Content-Disposition', 'inline')
    }

    res.sendFile(filePath)
  } catch (error) {
    next(error)
  }
}

export async function downloadFile(req, res, next) {
  try {
    const doc = await Document.findById(req.params.id)
    if (!doc) {
      return res.status(404).json({ error: 'Document record not found' })
    }

    const filePath = path.join(UPLOAD_DIR, path.basename(doc.filename))
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server storage' })
    }

    res.download(filePath, doc.originalName)
  } catch (error) {
    next(error)
  }
}

export async function deleteDocument(req, res, next) {
  try {
    const doc = await Document.findById(req.params.id)
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // Permission Check: Uploader, Group Admin, Meeting Host, or Site Admin
    const isUploader = doc.uploadedBy.toString() === req.user._id.toString()
    let isAuthorized = isUploader

    if (!isAuthorized && doc.module === 'group' && doc.groupId) {
      const group = await StudyGroup.findById(doc.groupId)
      if (group && group.createdBy.toString() === req.user._id.toString()) {
        isAuthorized = true
      }
    }

    if (!isAuthorized && doc.module === 'meet' && doc.meetId) {
      const meet = await Meet.findOne({ roomCode: doc.meetId.toUpperCase() })
      if (meet && meet.hostUserId?.toString() === req.user._id.toString()) {
        isAuthorized = true
      }
    }

    if (!isAuthorized && (req.user.role === 'admin' || req.user.role === 'instructor')) {
      isAuthorized = true
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized to delete this document' })
    }

    // Remove from disk storage
    const filePath = path.join(UPLOAD_DIR, path.basename(doc.filename))
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
      } catch (e) {
        console.error('File unlink error:', e)
      }
    }

    await doc.deleteOne()

    // Real-time Socket Broadcast
    if (req.app.get('io')) {
      const io = req.app.get('io')
      if (doc.groupId) {
        io.to(doc.groupId.toString()).emit('document_deleted', { documentId: doc._id.toString() })
      }
      if (doc.meetId) {
        io.to(`meet:${doc.meetId.toUpperCase()}`).emit('document_deleted', { documentId: doc._id.toString() })
      }
    }

    res.json({ success: true, documentId: doc._id })
  } catch (error) {
    next(error)
  }
}
