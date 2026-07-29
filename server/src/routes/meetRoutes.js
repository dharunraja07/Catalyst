import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import {
  createMeet,
  getMeet,
  joinMeet,
  getMyMeets,
  endMeet
} from '../controllers/meetController.js'

const router = express.Router()

router.use(protect)

router.post('/create', createMeet)
router.get('/mine', getMyMeets)
router.get('/:roomCode', getMeet)
router.post('/:roomCode/join', joinMeet)
router.post('/:roomCode/end', endMeet)

export default router
