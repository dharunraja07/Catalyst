import express from 'express'
import { login, register, profile, updateProfile, forgotPassword, resetPassword } from '../controllers/authController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()
router.post('/register', register)
router.post('/login', login)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.get('/profile', protect, profile)
router.put('/profile', protect, updateProfile)
export default router
