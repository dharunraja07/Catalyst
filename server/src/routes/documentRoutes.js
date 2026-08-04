import express from 'express'
import {
  uploadMiddleware,
  uploadDocument,
  getDocuments,
  serveFile,
  downloadFile,
  deleteDocument
} from '../controllers/documentController.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

// Public or auth file preview
router.get('/file/:filename', serveFile)

// Authenticated document routes
router.use(authMiddleware)

router.post('/upload', (req, res, next) => {
  uploadMiddleware.array('files', 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'File upload failed' })
    }
    next()
  })
}, uploadDocument)

router.get('/', getDocuments)
router.get('/download/:id', downloadFile)
router.delete('/:id', deleteDocument)

export default router
