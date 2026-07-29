import express from 'express'
import { login, register, profile, updateProfile, forgotPassword, resetPassword, googleLogin } from '../controllers/authController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()
router.post('/register', register)
router.post('/login', login)
router.post('/google', googleLogin)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.get('/profile', protect, profile)
router.put('/profile', protect, updateProfile)
export default router
