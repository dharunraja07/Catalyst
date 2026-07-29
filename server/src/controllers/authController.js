import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import User from '../models/User.js'
import LearningProgress from '../models/LearningProgress.js'
import { sendResetPasswordEmail } from '../utils/sendEmail.js'

const googleClient = new OAuth2Client()

function generateToken(userId) {
  const secret = (process.env.JWT_SECRET || 'supersecretjwtkey').trim()
  return jwt.sign({ id: userId }, secret, { expiresIn: '7d' })
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
    avatar: user.avatar || '',
    dailyGoalMinutes: user.dailyGoalMinutes || 60,
    studySessions: user.studySessions || []
  }
}

export async function register(req, res, next) {
  try {
    const { name, email, password, educationLevel, interestedSubjects, careerInterests, learningStyle } = req.body || {}
    if (!name || !email || !password || typeof email !== 'string' || typeof name !== 'string' || typeof password !== 'string') {
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
    const { email, password } = req.body || {}
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' })
    }
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

    if (Object.prototype.hasOwnProperty.call(req.body, 'educationLevel')) {
      if (typeof req.body.educationLevel === 'string') {
        updates.educationLevel = req.body.educationLevel.trim()
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'interestedSubjects')) {
      if (Array.isArray(req.body.interestedSubjects)) {
        updates.interestedSubjects = req.body.interestedSubjects
          .filter((entry) => typeof entry === 'string')
          .map((entry) => entry.trim())
          .filter(Boolean)
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'careerInterests')) {
      if (Array.isArray(req.body.careerInterests)) {
        updates.careerInterests = req.body.careerInterests
          .filter((entry) => typeof entry === 'string')
          .map((entry) => entry.trim())
          .filter(Boolean)
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'learningStyle')) {
      if (typeof req.body.learningStyle === 'string') {
        const trimmedStyle = req.body.learningStyle.trim()
        if (['Visual', 'Reading', 'Practice', 'Mixed'].includes(trimmedStyle)) {
          updates.learningStyle = trimmedStyle
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'avatar')) {
      if (typeof req.body.avatar === 'string') {
        updates.avatar = req.body.avatar.trim()
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

      // Send email asynchronously in background so response returns instantly
      sendResetPasswordEmail({ to: user.email, token: unhashedToken }).catch(emailError => {
        console.error('Failed to send reset password email:', emailError)
      })
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

export async function googleLogin(req, res, next) {
  try {
    const { token, credential } = req.body || {}
    const googleToken = token || credential
    if (!googleToken) {
      return res.status(400).json({ error: 'Google token is required' })
    }

    let email, name, googleId, picture

    if (googleToken.startsWith('eyJ')) {
      const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim()
      const ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience: clientId
      })
      const payload = ticket.getPayload()
      if (!payload || !payload.email) {
        return res.status(400).json({ error: 'Invalid Google ID token payload' })
      }
      email = payload.email
      name = payload.name
      googleId = payload.sub
      picture = payload.picture
    } else {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${googleToken}` }
      })
      if (!response.ok) {
        return res.status(400).json({ error: 'Failed to verify Google access token' })
      }
      const data = await response.json()
      email = data.email
      name = data.name
      googleId = data.sub
      picture = data.picture
    }

    if (!email) {
      return res.status(400).json({ error: 'Google account email not found' })
    }

    const normalizedEmail = email.trim().toLowerCase()

    let user = await User.findOne({
      $or: [{ googleId }, { email: normalizedEmail }]
    })

    if (!user) {
      user = await User.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        googleId,
        authProvider: 'google',
        avatar: picture || '',
        role: 'student'
      })
      await LearningProgress.create({ user: user._id })
    } else {
      let updated = false
      if (!user.googleId) {
        user.googleId = googleId
        updated = true
      }
      if (user.authProvider !== 'google' && !user.password) {
        user.authProvider = 'google'
        updated = true
      }
      if (!user.avatar && picture) {
        user.avatar = picture
        updated = true
      }
      if (updated) {
        await user.save()
      }
    }

    const jwtToken = generateToken(user._id)
    res.json({ token: jwtToken, user: serializeUser(user) })
  } catch (error) {
    console.error('Google Auth Error:', error)
    return res.status(400).json({ error: 'Google authentication failed: ' + (error.message || 'Invalid token') })
  }
}

