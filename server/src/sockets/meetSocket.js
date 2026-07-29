import Meet from '../models/Meet.js'

// In-memory state
// meetPresence: Map<roomCode, Map<userId, { userId: string, name: string, socketId: string, audioOn: boolean, videoOn: boolean }>>
const meetPresence = new Map()
// meetBoards: Map<roomCode, Array<Action>>
const meetBoards = new Map()
// meetChats: Map<roomCode, Array<Message>>
const meetChats = new Map()
// socketMeetRooms: Map<socketId, Set<roomCode>>
const socketMeetRooms = new Map()

const ALLOWED_EMOJIS = new Set(['👍', '❤️', '😂', '👏', '🎉', '🤔', '✋', '🔥'])

function broadcastParticipants(io, roomCode) {
  const roomMap = meetPresence.get(roomCode)
  if (!roomMap || roomMap.size === 0) {
    io.to(roomCode).emit('meet_participants_update', [])
    return
  }

  const participants = []
  for (const info of roomMap.values()) {
    participants.push({
      userId: info.userId,
      name: info.name,
      audioOn: info.audioOn,
      videoOn: info.videoOn
    })
  }

  io.to(roomCode).emit('meet_participants_update', participants)
}

function removeSocketFromMeetRoom(io, socket, roomCode) {
  socket.leave(roomCode)

  if (socketMeetRooms.has(socket.id)) {
    socketMeetRooms.get(socket.id).delete(roomCode)
  }

  const roomMap = meetPresence.get(roomCode)
  if (roomMap && socket.user) {
    const userId = socket.user._id.toString()
    const info = roomMap.get(userId)
    if (info && info.socketId === socket.id) {
      roomMap.delete(userId)
    }
    if (roomMap.size === 0) {
      meetPresence.delete(roomCode)
    }
  }

  broadcastParticipants(io, roomCode)
  io.to(roomCode).emit('peer_left', { userId: socket.user._id.toString() })
}

export function setupMeetSocket(io) {
  io.on('connection', (socket) => {
    if (!socket.user) return
    socketMeetRooms.set(socket.id, new Set())

    // 1. Join Meet
    socket.on('join_meet', async ({ roomCode }) => {
      if (!roomCode) return
      const code = roomCode.trim().toUpperCase()

      try {
        const meet = await Meet.findOne({ roomCode: code })
        if (!meet || !meet.isActive || new Date(meet.expiresAt) < new Date()) {
          return socket.emit('meet_error', { error: "This meet doesn't exist or has ended" })
        }

        // Add user to DB participants list
        await Meet.updateOne(
          { _id: meet._id },
          { $addToSet: { participants: socket.user._id } }
        )

        socket.join(code)
        socketMeetRooms.get(socket.id).add(code)

        if (!meetPresence.has(code)) {
          meetPresence.set(code, new Map())
        }
        const roomMap = meetPresence.get(code)
        const userId = socket.user._id.toString()

        roomMap.set(userId, {
          userId,
          name: socket.user.name,
          socketId: socket.id,
          audioOn: true,
          videoOn: true
        })

        // Replay whiteboard history to joining socket
        const history = meetBoards.get(code) || []
        socket.emit('meet_board_history', history)

        // Replay meet chat history to joining socket
        const chatHistory = meetChats.get(code) || []
        socket.emit('meet_chat_history', chatHistory)

        // Broadcast updated participants to everyone in room
        broadcastParticipants(io, code)

        // Broadcast peer_joined to existing participants
        socket.to(code).emit('peer_joined', {
          userId,
          name: socket.user.name
        })
      } catch (error) {
        console.error('Socket join_meet error:', error)
        socket.emit('meet_error', { error: 'Failed to join meet' })
      }
    })

    // 2. Leave Meet
    socket.on('leave_meet', ({ roomCode }) => {
      if (!roomCode) return
      const code = roomCode.trim().toUpperCase()
      removeSocketFromMeetRoom(io, socket, code)
    })

    // 3. Real-Time In-Meeting Chat
    socket.on('send_meet_message', ({ roomCode, message }) => {
      if (!roomCode || !message || typeof message !== 'string') return
      const text = message.trim()
      if (!text) return

      const code = roomCode.trim().toUpperCase()
      if (!meetChats.has(code)) {
        meetChats.set(code, [])
      }

      const msgPayload = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: socket.user._id.toString(),
        name: socket.user.name,
        message: text,
        timestamp: new Date().toISOString()
      }

      meetChats.get(code).push(msgPayload)
      io.to(code).emit('receive_meet_message', msgPayload)
    })

    // 4. Toggle Media (Mic/Camera)
    socket.on('toggle_media', ({ roomCode, audioOn, videoOn }) => {
      if (!roomCode) return
      const code = roomCode.trim().toUpperCase()
      const roomMap = meetPresence.get(code)
      if (!roomMap) return

      const userId = socket.user._id.toString()
      const info = roomMap.get(userId)
      if (info) {
        info.audioOn = Boolean(audioOn)
        info.videoOn = Boolean(videoOn)
        broadcastParticipants(io, code)
      }
    })

    // 5. Send Emoji Reaction
    socket.on('send_reaction', ({ roomCode, emoji }) => {
      if (!roomCode || !emoji || !ALLOWED_EMOJIS.has(emoji)) return
      const code = roomCode.trim().toUpperCase()
      io.to(code).emit('reaction_received', {
        userId: socket.user._id.toString(),
        name: socket.user.name,
        emoji
      })
    })

    // 6. Whiteboard Events
    const appendAndBroadcastWbEvent = (event, roomCode, payload) => {
      const code = roomCode.trim().toUpperCase()
      if (!meetBoards.has(code)) {
        meetBoards.set(code, [])
      }
      meetBoards.get(code).push({ event, payload })
      socket.to(code).emit(event, payload)
    }

    socket.on('wb_draw_start', ({ roomCode, strokeId, tool, color, width, point }) => {
      if (!roomCode) return
      appendAndBroadcastWbEvent('wb_draw_start', roomCode, { strokeId, tool, color, width, point })
    })

    socket.on('wb_draw_point', ({ roomCode, strokeId, point }) => {
      if (!roomCode) return
      appendAndBroadcastWbEvent('wb_draw_point', roomCode, { strokeId, point })
    })

    socket.on('wb_draw_end', ({ roomCode, strokeId }) => {
      if (!roomCode) return
      appendAndBroadcastWbEvent('wb_draw_end', roomCode, { strokeId })
    })

    socket.on('wb_add_text', ({ roomCode, textId, x, y, nx, ny, content, color }) => {
      if (!roomCode) return
      appendAndBroadcastWbEvent('wb_add_text', roomCode, { textId, x, y, nx, ny, content, color })
    })

    socket.on('wb_clear', async ({ roomCode }) => {
      if (!roomCode) return
      const code = roomCode.trim().toUpperCase()
      try {
        const meet = await Meet.findOne({ roomCode: code })
        if (!meet || meet.createdBy.toString() !== socket.user._id.toString()) {
          return socket.emit('meet_error', { error: 'Only host can clear the whiteboard' })
        }

        meetBoards.set(code, [])
        io.to(code).emit('wb_clear', {})
      } catch (err) {
        console.error('Socket wb_clear error:', err)
      }
    })

    socket.on('wb_remove_action', ({ roomCode, actionId, actionType }) => {
      if (!roomCode || !actionId) return
      const code = roomCode.trim().toUpperCase()
      const history = meetBoards.get(code)
      if (history) {
        const updatedHistory = history.filter((item) => {
          if (item.payload?.strokeId) {
            return item.payload.strokeId !== actionId
          }
          if (item.payload?.textId) {
            return item.payload.textId !== actionId
          }
          return true
        })
        meetBoards.set(code, updatedHistory)
      }
      io.to(code).emit('wb_remove_action', { actionId, actionType })
    })

    socket.on('screen_share_status', ({ roomCode, sharing }) => {
      if (!roomCode) return
      const code = roomCode.trim().toUpperCase()
      socket.to(code).emit('screen_share_status', {
        userId: socket.user._id.toString(),
        name: socket.user.name,
        sharing: Boolean(sharing)
      })
    })

    // 7. End Meet for Everyone (Host Only)
    socket.on('end_meet_for_all', async ({ roomCode }) => {
      if (!roomCode) return
      const code = roomCode.trim().toUpperCase()
      try {
        const meet = await Meet.findOne({ roomCode: code })
        if (!meet || meet.createdBy.toString() !== socket.user._id.toString()) {
          return socket.emit('meet_error', { error: 'Only host can end the meet' })
        }

        meet.isActive = false
        await meet.save()

        io.to(code).emit('meet_ended', { roomCode: code })

        meetPresence.delete(code)
        meetBoards.delete(code)
        meetChats.delete(code)
      } catch (err) {
        console.error('Socket end_meet_for_all error:', err)
      }
    })

    // 8. Disconnect Cleanup
    socket.on('disconnect', () => {
      const rooms = socketMeetRooms.get(socket.id)
      if (rooms) {
        for (const code of rooms) {
          removeSocketFromMeetRoom(io, socket, code)
        }
        socketMeetRooms.delete(socket.id)
      }
    })
  })
}
