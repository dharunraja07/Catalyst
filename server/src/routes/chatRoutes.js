import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import {
  listConversations,
  getConversation,
  createConversation,
  appendMessage,
  deleteConversation
} from '../controllers/chatController.js'

const router = express.Router()

router.get('/', protect, listConversations)
router.post('/', protect, createConversation)
router.get('/:id', protect, getConversation)
router.post('/:id/messages', protect, appendMessage)
router.delete('/:id', protect, deleteConversation)

export default router
