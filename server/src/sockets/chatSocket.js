import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import StudyGroup from '../models/StudyGroup.js'
import Message from '../models/Message.js'

// Track presence: roomKey -> Map<userId, { name: string, sockets: Set<socketId> }>
const roomPresence = new Map()
// Track socket -> Set<roomKey>
const socketJoinedRooms = new Map()

function broadcastPresence(io, groupId) {
  const roomKey = groupId.toString()
  const userMap = roomPresence.get(roomKey)
  if (!userMap || userMap.size === 0) {
    io.to(roomKey).emit('presence_update', [])
    return
  }

  const onlineMembers = []
  for (const [userId, info] of userMap.entries()) {
    if (info.sockets.size > 0) {
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
  if (userMap) {
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
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

    // join_group
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
            name: socket.user.name,
            sockets: new Set()
          })
        }
        userMap.get(userId).sockets.add(socket.id)
        socketJoinedRooms.get(socket.id).add(roomKey)

        broadcastPresence(io, roomKey)
      } catch (error) {
        console.error('Socket join_group error:', error)
      }
    })

    // leave_group
    socket.on('leave_group', ({ groupId }) => {
      if (!groupId) return
      removeSocketFromRoom(io, socket, groupId)
    })

    // send_message
    socket.on('send_message', async ({ groupId, message }) => {
      if (!groupId || !message?.trim()) return
      try {
        const group = await StudyGroup.findOne({ _id: groupId, members: socket.user._id })
        if (!group) return

        const newMessage = await Message.create({
          groupId: group._id,
          sender: socket.user._id,
          message: message.trim()
        })
        const populated = await newMessage.populate('sender', 'name email')

        io.to(groupId.toString()).emit('receive_message', populated)
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
          const userMap = roomPresence.get(roomKey)
          if (userMap) {
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
        socketJoinedRooms.delete(socket.id)
      }
    })
  })
}
