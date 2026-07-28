import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import StudyGroup from '../models/StudyGroup.js'
import Message from '../models/Message.js'
import StudyRequest from '../models/StudyRequest.js'
import { chatCompletion } from '../services/ai/aiService.js'

// Track presence: roomKey -> Map<userId, { userId: string, name: string, sockets: Set<socketId> }>
const roomPresence = new Map()
// Track socket -> Set<roomKey>
const socketJoinedRooms = new Map()

export async function getUnreadCount(userId) {
  if (!userId) return 0
  return await StudyRequest.countDocuments({
    receiver: userId,
    status: 'pending'
  })
}

export async function emitNotificationCount(io, userId) {
  if (!io || !userId) return
  const count = await getUnreadCount(userId)
  io.to(`user:${userId.toString()}`).emit('notification_count_updated', { unreadCount: count })
}

function broadcastPresence(io, groupId) {
  const roomKey = groupId.toString()
  const userMap = roomPresence.get(roomKey)
  if (!userMap || userMap.size === 0) {
    io.to(roomKey).emit('presence_update', [])
    return
  }

  const onlineMembers = []
  for (const [userId, info] of userMap.entries()) {
    if (info.sockets && info.sockets.size > 0) {
      onlineMembers.push({
        userId,
        name: info.name
      })
    }
  }

  io.to(roomKey).emit('presence_update', onlineMembers)
}

function removeSocketFromRoom(io, socket, groupId) {
  const roomKey = groupId.toString()
  socket.leave(roomKey)

  if (socketJoinedRooms.has(socket.id)) {
    socketJoinedRooms.get(socket.id).delete(roomKey)
  }

  const userMap = roomPresence.get(roomKey)
  if (userMap && socket.user) {
    const userId = socket.user._id.toString()
    const userInfo = userMap.get(userId)
    if (userInfo) {
      userInfo.sockets.delete(socket.id)
      if (userInfo.sockets.size === 0) {
        userMap.delete(userId)
      }
    }
    if (userMap.size === 0) {
      roomPresence.delete(roomKey)
    }
  }

  broadcastPresence(io, roomKey)
}

export function setupChatSocket(io) {
  // 1. JWT Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization
      if (!authToken) {
        return next(new Error('Authentication error: Token missing'))
      }

      const token = authToken.startsWith('Bearer ') ? authToken.split(' ')[1] : authToken
      const secret = (process.env.JWT_SECRET || 'supersecretjwtkey').trim()
      const decoded = jwt.verify(token, secret)
      const user = await User.findById(decoded.id).select('-password')
      if (!user) {
        return next(new Error('Authentication error: User not found'))
      }

      socket.user = user
      next()
    } catch (error) {
      next(new Error('Authentication error: Invalid token'))
    }
  })

  // 2. Connection and Event Handlers
  io.on('connection', (socket) => {
    socketJoinedRooms.set(socket.id, new Set())

    // Join personal user room for private real-time notifications
    const personalRoom = `user:${socket.user._id.toString()}`
    socket.join(personalRoom)

    // Emit initial unread notification count
    emitNotificationCount(io, socket.user._id)

    // Event: invite_sent
    socket.on('invite_sent', async ({ groupId, targetUserId }) => {
      if (!groupId || !targetUserId) return
      try {
        const group = await StudyGroup.findById(groupId)
        if (!group) {
          return socket.emit('invite_error', { error: 'Group not found' })
        }

        const isMember = group.members.some((m) => m.toString() === socket.user._id.toString())
        if (!isMember) {
          return socket.emit('invite_error', { error: 'You are not a member of this group' })
        }

        if (group.members.some((m) => m.toString() === targetUserId.toString())) {
          return socket.emit('invite_error', { error: 'User is already a member of this group' })
        }

        if (group.members.length >= group.maxMembers) {
          return socket.emit('invite_error', { error: 'This group is full' })
        }

        const pendingInvite = await StudyRequest.findOne({
          sender: socket.user._id,
          receiver: targetUserId,
          status: 'pending',
          group: group._id
        })

        if (pendingInvite) {
          return socket.emit('invite_error', { error: 'A pending invite already exists for this user' })
        }

        const request = await StudyRequest.create({
          sender: socket.user._id,
          receiver: targetUserId,
          group: group._id,
          isRead: false
        })

        await request.populate('sender', 'name email avatar')
        await request.populate('receiver', 'name email avatar')
        await request.populate('group', 'groupName createdBy joinCode')

        // Emit invite_received instantly to target user
        io.to(`user:${targetUserId.toString()}`).emit('invite_received', request)
        await emitNotificationCount(io, targetUserId)

        socket.emit('invite_sent_success', request)
      } catch (error) {
        console.error('Socket invite_sent error:', error)
        socket.emit('invite_error', { error: 'Failed to send invite' })
      }
    })

    // Event: accept_invite
    socket.on('accept_invite', async ({ requestId }) => {
      if (!requestId) return
      try {
        const request = await StudyRequest.findOne({
          _id: requestId,
          receiver: socket.user._id,
          status: 'pending'
        })
          .populate('sender', 'name email avatar')
          .populate('group')

        if (!request) return

        request.status = 'accepted'
        request.isRead = true
        await request.save()

        if (request.group) {
          const group = await StudyGroup.findById(request.group._id)
          if (group) {
            const isAlreadyMember = group.members.some((m) => m.toString() === socket.user._id.toString())
            if (!isAlreadyMember && group.members.length < group.maxMembers) {
              group.members.push(socket.user._id)
              await group.save()
            }
          }
          await group.populate([
            { path: 'members', select: 'name email educationLevel' },
            { path: 'createdBy', select: 'name email' }
          ])

          // Post permanent join system message
          try {
            const systemMsg = await Message.create({
              groupId: group._id,
              sender: socket.user._id,
              message: `🟢 ${socket.user.name} joined the study group`,
              isSystem: true,
              systemEventType: 'join'
            })
            const populatedMsg = await systemMsg.populate('sender', 'name email')
            io.to(group._id.toString()).emit('receive_message', populatedMsg)
            io.to(group._id.toString()).emit('member_joined', { userId: socket.user._id.toString(), name: socket.user.name, groupId: group._id.toString() })
            io.to(group._id.toString()).emit('group_updated', group)
          } catch (err) {
            console.error('Error creating join system message in accept_invite:', err)
          }

          const payload = {
            requestId: request._id,
            group,
            acceptedBy: { _id: socket.user._id, name: socket.user.name }
          }

          io.to(`user:${request.receiver._id.toString()}`).emit('invite_accepted', payload)
          io.to(`user:${request.sender._id.toString()}`).emit('invite_accepted', payload)
          io.emit('group_updated', group)

          await emitNotificationCount(io, request.receiver._id)
          await emitNotificationCount(io, request.sender._id)
        }
      } catch (error) {
        console.error('Socket accept_invite error:', error)
      }
    })

    // Event: decline_invite
    socket.on('decline_invite', async ({ requestId }) => {
      if (!requestId) return
      try {
        const request = await StudyRequest.findOne({
          _id: requestId,
          receiver: socket.user._id,
          status: 'pending'
        })
        if (!request) return

        request.status = 'rejected'
        request.isRead = true
        await request.save()

        const payload = {
          requestId: request._id,
          groupId: request.group,
          declinedBy: { _id: socket.user._id, name: socket.user.name }
        }

        io.to(`user:${socket.user._id.toString()}`).emit('invite_declined', payload)
        io.to(`user:${request.sender.toString()}`).emit('invite_declined', payload)

        await emitNotificationCount(io, socket.user._id)
        await emitNotificationCount(io, request.sender)
      } catch (error) {
        console.error('Socket decline_invite error:', error)
      }
    })

    // join_group (Socket Presence Navigation Only - NO System Messages)
    socket.on('join_group', async ({ groupId }) => {
      if (!groupId) return
      try {
        const group = await StudyGroup.findOne({ _id: groupId, members: socket.user._id })
        if (!group) return

        const roomKey = groupId.toString()
        socket.join(roomKey)

        if (!roomPresence.has(roomKey)) {
          roomPresence.set(roomKey, new Map())
        }
        const userMap = roomPresence.get(roomKey)
        const userId = socket.user._id.toString()

        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId,
            name: socket.user.name,
            sockets: new Set()
          })
        }
        userMap.get(userId).sockets.add(socket.id)
        if (!socketJoinedRooms.has(socket.id)) {
          socketJoinedRooms.set(socket.id, new Set())
        }
        socketJoinedRooms.get(socket.id).add(roomKey)

        // Broadcast presence update (green dots) only
        broadcastPresence(io, roomKey)
      } catch (error) {
        console.error('Socket join_group error:', error)
      }
    })

    // leave_group (Socket Presence Navigation Only - NO System Messages)
    socket.on('leave_group', ({ groupId }) => {
      if (!groupId) return
      removeSocketFromRoom(io, socket, groupId)
    })

    // send_message
    socket.on('send_message', async ({ groupId, message, provider }) => {
      if (!groupId || !message?.trim()) return
      try {
        const group = await StudyGroup.findOne({ _id: groupId, members: socket.user._id })
        if (!group) return

        const trimmed = message.trim()
        const newMessage = await Message.create({
          groupId: group._id,
          sender: socket.user._id,
          message: trimmed
        })
        const populated = await newMessage.populate('sender', 'name email')

        io.to(groupId.toString()).emit('receive_message', populated)

        // Process @ai prompt if included
        if (trimmed.toLowerCase().includes('@ai')) {
          const aiQuery = trimmed.replace(/@ai/gi, '').trim() || 'Hello!'
          const recentMsgs = await Message.find({ groupId: group._id })
            .sort({ createdAt: -1 })
            .limit(10)

          const historyContext = recentMsgs.reverse().map((m) => ({
            role: m.sender?.toString() === socket.user._id.toString() ? 'user' : 'assistant',
            content: m.message
          }))

          try {
            const aiReply = await chatCompletion(historyContext, aiQuery, { provider })
            if (aiReply && aiReply.trim()) {
              const aiMsg = await Message.create({
                groupId: group._id,
                sender: socket.user._id,
                message: `🤖 [AI Companion]\n${aiReply.trim()}`
              })
              const populatedAiMsg = await aiMsg.populate('sender', 'name email')
              io.to(groupId.toString()).emit('receive_message', populatedAiMsg)
            }
          } catch (aiErr) {
            console.error('Group @ai error:', aiErr.message)
          }
        }
      } catch (error) {
        console.error('Socket send_message error:', error)
      }
    })

    // typing
    socket.on('typing', ({ groupId }) => {
      if (!groupId) return
      socket.to(groupId.toString()).emit('user_typing', {
        userId: socket.user._id.toString(),
        name: socket.user.name
      })
    })

    // stop_typing
    socket.on('stop_typing', ({ groupId }) => {
      if (!groupId) return
      socket.to(groupId.toString()).emit('user_stop_typing', {
        userId: socket.user._id.toString(),
        name: socket.user.name
      })
    })

    // disconnect
    socket.on('disconnect', () => {
      const rooms = socketJoinedRooms.get(socket.id)
      if (rooms) {
        for (const roomKey of rooms) {
          removeSocketFromRoom(io, socket, roomKey)
        }
        socketJoinedRooms.delete(socket.id)
      }
    })
  })
}
