import express from 'express'
import {
  generateAssessment,
  generatePractice,
  chatWithAI,
  getUserConversations,
  createConversation,
  renameConversation,
  deleteConversation,
  getConversationMessages,
  sendConversationMessage
} from '../controllers/aiController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/generate-assessment', protect, generateAssessment)
router.post('/generate-practice', protect, generatePractice)
router.post('/chat', protect, chatWithAI)

router.get('/conversations', protect, getUserConversations)
router.post('/conversations', protect, createConversation)
router.patch('/conversations/:id', protect, renameConversation)
router.delete('/conversations/:id', protect, deleteConversation)

router.get('/conversations/:id/messages', protect, getConversationMessages)
router.post('/conversations/:id/messages', protect, sendConversationMessage)

export default router
