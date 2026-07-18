import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { env } from './config/env.js'
import User from './models/User.js'
import StudyGroup from './models/StudyGroup.js'

let io = null
const connectedUsers = new Map()

async function broadcastPresence(groupId) {
  if (!io) return
  const group = await StudyGroup.findById(groupId).select('members')
  if (!group) return
  const memberIds = group.members.map((member) => member.toString())
  const onlineMemberIds = memberIds.filter((memberId) => connectedUsers.has(memberId))
  io.to(`group:${groupId}`).emit('presence-update', { groupId, members: onlineMemberIds })
}

/**
 * Initializes Socket.IO on top of the existing HTTP server.
 * Reuses the same CORS origin logic as the REST API so preview/production
 * Vercel URLs both work without extra config.
 */
export function initSocket(httpServer, isAllowedOrigin) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) callback(null, true)
        else callback(new Error('Not allowed by CORS'))
      },
      credentials: true
    }
  })

  // Authenticate every socket connection using the same JWT the REST API uses.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('Authentication required'))

      const decoded = jwt.verify(token, env.JWT_SECRET)
      const user = await User.findById(decoded.id).select('-password')
      if (!user) return next(new Error('User not found'))

      socket.user = user
      connectedUsers.set(user._id.toString(), socket.id)
      const groups = await StudyGroup.find({ members: user._id }).select('_id')
      await Promise.all(groups.map((group) => broadcastPresence(group._id)))
      next()
    } catch (error) {
      next(new Error('Invalid or expired token'))
    }
  })

  io.on('connection', (socket) => {
    socket.on('join-group', async (groupId) => {
      try {
        const group = await StudyGroup.findOne({ _id: groupId, members: socket.user._id })
        if (!group) return // silently ignore - user isn't a member, don't leak group existence
        socket.join(`group:${groupId}`)
        await broadcastPresence(groupId)
      } catch {
        // ignore malformed groupId etc.
      }
    })

    socket.on('leave-group', async (groupId) => {
      socket.leave(`group:${groupId}`)
      await broadcastPresence(groupId)
    })

    socket.on('typing', ({ groupId, isTyping }) => {
      if (!groupId) return
      socket.to(`group:${groupId}`).emit('typing', {
        userId: socket.user._id,
        name: socket.user.name,
        isTyping: Boolean(isTyping)
      })
    })

    socket.on('disconnect', async () => {
      connectedUsers.delete(socket.user?._id?.toString())
      const groups = await StudyGroup.find({ members: socket.user?._id }).select('_id')
      await Promise.all(groups.map((group) => broadcastPresence(group._id)))
    })
  })

  return io
}

/** Broadcasts a newly-created message to everyone currently in that group's room. */
export function emitNewMessage(groupId, message) {
  if (!io) return
  io.to(`group:${groupId}`).emit('new-message', message)
}

/** Broadcasts a group-membership change (e.g. someone accepted an invite) so member lists refresh live. */
export function emitGroupUpdated(groupId, group) {
  if (!io) return
  io.to(`group:${groupId}`).emit('group-updated', group)
}
