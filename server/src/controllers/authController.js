import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import LearningProgress from '../models/LearningProgress.js'
import { sendResetPasswordEmail } from '../utils/sendEmail.js'

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

function serializeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    educationLevel: user.educationLevel,
    interestedSubjects: user.interestedSubjects,
    careerInterests: user.careerInterests,
    learningStyle: user.learningStyle,
    dailyGoalMinutes: user.dailyGoalMinutes || 60,
    studySessions: user.studySessions || []
  }
}

export async function register(req, res, next) {
  try {
    const { name, email, password, educationLevel, interestedSubjects, careerInterests, learningStyle } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }
    const normalizedEmail = email.trim().toLowerCase()
    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) return res.status(400).json({ error: 'User already exists' })
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      educationLevel,
      interestedSubjects,
      careerInterests,
      learningStyle,
      role: 'student'
    })
    await LearningProgress.create({ user: user._id })
    const token = generateToken(user._id)
    res.json({ token, user: serializeUser(user) })
  } catch (error) {
    next(error)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const normalizedEmail = email.trim().toLowerCase()
    const user = await User.findOne({ email: normalizedEmail })
    if (!user) return res.status(400).json({ error: 'Invalid credentials' })
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' })
    const token = generateToken(user._id)
    res.json({ token, user: serializeUser(user) })
  } catch (error) {
    next(error)
  }
}

export async function profile(req, res, next) {
  try {
    res.json(serializeUser(req.user))
  } catch (error) {
    next(error)
  }
}

export async function updateProfile(req, res, next) {
  try {
    const updates = {}

    if (Object.prototype.hasOwnProperty.call(req.body, 'dailyGoalMinutes')) {
      const parsedGoal = Number(req.body.dailyGoalMinutes)
      updates.dailyGoalMinutes = Number.isFinite(parsedGoal) && parsedGoal > 0 ? Math.floor(parsedGoal) : 60
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'studySessions')) {
      if (Array.isArray(req.body.studySessions)) {
        updates.studySessions = req.body.studySessions.filter((entry) => entry && entry.date && Number.isFinite(Number(entry.minutes)))
      } else {
        updates.studySessions = []
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    ).select('-password')

    res.json(serializeUser(user))
  } catch (error) {
    next(error)
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await User.findOne({ email: normalizedEmail })

    if (user) {
      const unhashedToken = crypto.randomBytes(32).toString('hex')
      const hashedToken = crypto.createHash('sha256').update(unhashedToken).digest('hex')
      
      user.resetPasswordToken = hashedToken
      user.resetPasswordExpires = Date.now() + 15 * 60 * 1000 // 15 minutes
      await user.save()

      try {
        await sendResetPasswordEmail({ to: user.email, token: unhashedToken })
      } catch (emailError) {
        console.error('Failed to send reset password email:', emailError)
      }
    }

    // Always return generic success message to prevent email enumeration
    res.json({ message: 'If an account exists, a reset link has been sent.' })
  } catch (error) {
    next(error)
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' })
    }

    // Validate password strength: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=~`[\]{}|:;"'<>,.?/])[A-Za-z\d@$!%*?&#^()_\-+=~`[\]{}|:;"'<>,.?/]{8,}$/
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.'
      })
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    })

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' })
    }

    user.password = await bcrypt.hash(password, 10)
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()

    res.json({ message: 'Password updated successfully.' })
  } catch (error) {
    next(error)
  }
}
