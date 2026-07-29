import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import getSocket from '../api/socket.js'
import CopyButton from '../components/CopyButton.jsx'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '👏', '🎉', '🤔']
const COLOR_SWATCHES = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#FFFFFF', '#1E293B']

export default function MeetRoomPage() {
  const { roomCode } = useParams()
  const { api, user } = useAuth()
  const navigate = useNavigate()

  const upperRoomCode = (roomCode || '').toUpperCase()
  const currentUserId = (user?.id || user?._id || '').toString()

  // Room state
  const [meetInfo, setMeetInfo] = useState(null)
  const [isValidating, setIsValidating] = useState(true)
  const [roomError, setRoomError] = useState('')
  const [mediaError, setMediaError] = useState('')

  // Media state
  const [localStream, setLocalStream] = useState(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [remoteStreams, setRemoteStreams] = useState({}) // userId -> MediaStream
  const [participants, setParticipants] = useState([]) // array of { userId, name, audioOn, videoOn }

  // UI State
  const [activeMobileTab, setActiveMobileTab] = useState('call') // 'call' | 'board'
  const [reactions, setReactions] = useState([]) // array of { id, name, emoji, xPercent }
  const [confirmEndModal, setConfirmEndModal] = useState(false)

  // Whiteboard State
  const [wbColor, setWbColor] = useState('#F59E0B')
  const [wbWidth, setWbWidth] = useState(3)
  const [wbTool, setWbTool] = useState('pen') // 'pen' | 'text'
  const [textInput, setTextInput] = useState({ open: false, x: 0, y: 0, content: '' })

  // Refs
  const localVideoRef = useRef(null)
  const peerConnectionsRef = useRef({}) // userId -> RTCPeerConnection
  const currentStrokeIdRef = useRef(null)
  const isDrawingRef = useRef(false)
  const canvasRef = useRef(null)
  const remoteBoardActionsRef = useRef([])

  // 1. Initial Validation on Mount
  useEffect(() => {
    async function validateRoom() {
      setIsValidating(true)
      setRoomError('')
      try {
        const res = await api.get(`/meets/${upperRoomCode}`)
        setMeetInfo(res.data)
      } catch (err) {
        setRoomError(err.response?.data?.error || "This meet doesn't exist or has ended")
      } finally {
        setIsValidating(false)
      }
    }
    validateRoom()
  }, [api, upperRoomCode])

  // 2. getUserMedia Media Stream Capture
  const initLocalMedia = useCallback(async () => {
    setMediaError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setLocalStream(stream)
      setAudioEnabled(true)
      setVideoEnabled(true)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      return stream
    } catch (err) {
      console.warn('getUserMedia failure:', err)
      setMediaError('Could not access camera or microphone. Please check permissions.')
      return null
    }
  }, [])

  useEffect(() => {
    if (!meetInfo) return
    initLocalMedia()

    return () => {
      // Teardown local media tracks on unmount
      setLocalStream((stream) => {
        if (stream) {
          stream.getTracks().forEach((t) => t.stop())
        }
        return null
      })
    }
  }, [meetInfo, initLocalMedia])

  // Bind local stream to video element when available
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  // 3. WebRTC Peer Connection Helper
  const createPeerConnection = useCallback((remoteUserId, streamToUse) => {
    if (peerConnectionsRef.current[remoteUserId]) {
      return peerConnectionsRef.current[remoteUserId]
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    // Attach local tracks
    const activeStream = streamToUse || localStream
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        pc.addTrack(track, activeStream)
      })
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket()
        if (socket && socket.connected) {
          socket.emit('webrtc_ice_candidate', {
            roomCode: upperRoomCode,
            toUserId: remoteUserId,
            candidate: event.candidate
          })
        }
      }
    }

    // Incoming Track handler
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        const incomingStream = event.streams[0]
        setRemoteStreams((prev) => ({
          ...prev,
          [remoteUserId]: incomingStream
        }))
      }
    }

    peerConnectionsRef.current[remoteUserId] = pc
    return pc
  }, [localStream, upperRoomCode])

  // Clean up a specific peer connection
  const closePeerConnection = useCallback((remoteUserId) => {
    const pc = peerConnectionsRef.current[remoteUserId]
    if (pc) {
      pc.close()
      delete peerConnectionsRef.current[remoteUserId]
    }
    setRemoteStreams((prev) => {
      const copy = { ...prev }
      delete copy[remoteUserId]
      return copy
    })
  }, [])

  // Clean up all peer connections
  const closeAllPeerConnections = useCallback(() => {
    Object.keys(peerConnectionsRef.current).forEach((id) => {
      peerConnectionsRef.current[id].close()
    })
    peerConnectionsRef.current = {}
    setRemoteStreams({})
  }, [])

  // 4. Whiteboard Canvas Drawing Logic & Helper
  const drawStrokeOnCanvas = useCallback((ctx, stroke) => {
    if (!ctx || !stroke) return
    const { color, width, points } = stroke
    if (!points || points.length === 0) return

    ctx.save()
    ctx.strokeStyle = color || '#F59E0B'
    ctx.lineWidth = width || 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.stroke()
    ctx.restore()
  }, [])

  const renderTextOnCanvas = useCallback((ctx, textItem) => {
    if (!ctx || !textItem) return
    const { x, y, content, color } = textItem
    if (!content) return

    ctx.save()
    ctx.fillStyle = color || '#F59E0B'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText(content, x, y)
    ctx.restore()
  }, [])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    remoteBoardActionsRef.current.forEach((item) => {
      if (item.type === 'stroke') {
        drawStrokeOnCanvas(ctx, item)
      } else if (item.type === 'text') {
        renderTextOnCanvas(ctx, item)
      }
    })
  }, [drawStrokeOnCanvas, renderTextOnCanvas])

  const replayActionHistory = useCallback((actions) => {
    remoteBoardActionsRef.current = []
    let currentStrokesMap = {}

    actions.forEach(({ event, payload }) => {
      if (event === 'wb_draw_start') {
        currentStrokesMap[payload.strokeId] = {
          type: 'stroke',
          strokeId: payload.strokeId,
          color: payload.color,
          width: payload.width,
          points: [payload.point]
        }
      } else if (event === 'wb_draw_point') {
        if (currentStrokesMap[payload.strokeId]) {
          currentStrokesMap[payload.strokeId].points.push(payload.point)
        }
      } else if (event === 'wb_draw_end') {
        if (currentStrokesMap[payload.strokeId]) {
          remoteBoardActionsRef.current.push(currentStrokesMap[payload.strokeId])
          delete currentStrokesMap[payload.strokeId]
        }
      } else if (event === 'wb_add_text') {
        remoteBoardActionsRef.current.push({
          type: 'text',
          textId: payload.textId,
          x: payload.x,
          y: payload.y,
          content: payload.content,
          color: payload.color
        })
      } else if (event === 'wb_clear') {
        remoteBoardActionsRef.current = []
        currentStrokesMap = {}
      }
    })

    redrawCanvas()
  }, [redrawCanvas])

  // 5. Socket.IO Event Handlers Lifecycle
  useEffect(() => {
    if (!meetInfo) return

    const socket = getSocket()
    if (!socket) return

    if (!socket.connected) {
      socket.connect()
    }

    socket.emit('join_meet', { roomCode: upperRoomCode })

    const handleMeetError = ({ error }) => {
      setRoomError(error || 'Meet room error')
    }

    const handleParticipantsUpdate = (list) => {
      setParticipants(list || [])
    }

    const handlePeerJoined = async ({ userId, name }) => {
      const pc = createPeerConnection(userId)
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('webrtc_offer', {
          roomCode: upperRoomCode,
          toUserId: userId,
          sdp: offer
        })
      } catch (err) {
        console.error('Error creating WebRTC offer for peer:', err)
      }
    }

    const handleWebrtcOffer = async ({ fromUserId, sdp }) => {
      const pc = createPeerConnection(fromUserId)
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('webrtc_answer', {
          roomCode: upperRoomCode,
          toUserId: fromUserId,
          sdp: answer
        })
      } catch (err) {
        console.error('Error handling WebRTC offer:', err)
      }
    }

    const handleWebrtcAnswer = async ({ fromUserId, sdp }) => {
      const pc = peerConnectionsRef.current[fromUserId]
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        } catch (err) {
          console.error('Error setting remote description from answer:', err)
        }
      }
    }

    const handleWebrtcIceCandidate = async ({ fromUserId, candidate }) => {
      const pc = peerConnectionsRef.current[fromUserId]
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.error('Error adding ICE candidate:', err)
        }
      }
    }

    const handlePeerLeft = ({ userId }) => {
      closePeerConnection(userId)
    }

    const handleReactionReceived = ({ name, emoji }) => {
      const id = `${Date.now()}_${Math.random()}`
      const xPercent = Math.floor(Math.random() * 70) + 15
      setReactions((prev) => [...prev, { id, name, emoji, xPercent }])

      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id))
      }, 2200)
    }

    const handleMeetBoardHistory = (actions) => {
      replayActionHistory(actions)
    }

    const handleWbDrawStart = (payload) => {
      remoteBoardActionsRef.current.push({
        type: 'stroke',
        strokeId: payload.strokeId,
        color: payload.color,
        width: payload.width,
        points: [payload.point]
      })
      redrawCanvas()
    }

    const handleWbDrawPoint = (payload) => {
      const stroke = remoteBoardActionsRef.current.find((s) => s.strokeId === payload.strokeId)
      if (stroke) {
        stroke.points.push(payload.point)
        redrawCanvas()
      }
    }

    const handleWbDrawEnd = () => {
      redrawCanvas()
    }

    const handleWbAddText = (payload) => {
      remoteBoardActionsRef.current.push({
        type: 'text',
        textId: payload.textId,
        x: payload.x,
        y: payload.y,
        content: payload.content,
        color: payload.color
      })
      redrawCanvas()
    }

    const handleWbClear = () => {
      remoteBoardActionsRef.current = []
      redrawCanvas()
    }

    const handleMeetEnded = () => {
      closeAllPeerConnections()
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop())
      }
      setRoomError('The host has ended this meeting.')
      setTimeout(() => {
        navigate('/meet')
      }, 3000)
    }

    socket.on('meet_error', handleMeetError)
    socket.on('meet_participants_update', handleParticipantsUpdate)
    socket.on('peer_joined', handlePeerJoined)
    socket.on('webrtc_offer', handleWebrtcOffer)
    socket.on('webrtc_answer', handleWebrtcAnswer)
    socket.on('webrtc_ice_candidate', handleWebrtcIceCandidate)
    socket.on('peer_left', handlePeerLeft)
    socket.on('reaction_received', handleReactionReceived)
    socket.on('meet_board_history', handleMeetBoardHistory)
    socket.on('wb_draw_start', handleWbDrawStart)
    socket.on('wb_draw_point', handleWbDrawPoint)
    socket.on('wb_draw_end', handleWbDrawEnd)
    socket.on('wb_add_text', handleWbAddText)
    socket.on('wb_clear', handleWbClear)
    socket.on('meet_ended', handleMeetEnded)

    return () => {
      socket.emit('leave_meet', { roomCode: upperRoomCode })
      socket.off('meet_error', handleMeetError)
      socket.off('meet_participants_update', handleParticipantsUpdate)
      socket.off('peer_joined', handlePeerJoined)
      socket.off('webrtc_offer', handleWebrtcOffer)
      socket.off('webrtc_answer', handleWebrtcAnswer)
      socket.off('webrtc_ice_candidate', handleWebrtcIceCandidate)
      socket.off('peer_left', handlePeerLeft)
      socket.off('reaction_received', handleReactionReceived)
      socket.off('meet_board_history', handleMeetBoardHistory)
      socket.off('wb_draw_start', handleWbDrawStart)
      socket.off('wb_draw_point', handleWbDrawPoint)
      socket.off('wb_draw_end', handleWbDrawEnd)
      socket.off('wb_add_text', handleWbAddText)
      socket.off('wb_clear', handleWbClear)
      socket.off('meet_ended', handleMeetEnded)

      closeAllPeerConnections()
    }
  }, [meetInfo, upperRoomCode, createPeerConnection, closePeerConnection, closeAllPeerConnections, replayActionHistory, redrawCanvas, localStream, navigate])

  // 6. Media Controls Handlers
  const toggleAudio = () => {
    if (!localStream) return
    const nextState = !audioEnabled
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = nextState
    })
    setAudioEnabled(nextState)

    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('toggle_media', {
        roomCode: upperRoomCode,
        audioOn: nextState,
        videoOn: videoEnabled
      })
    }
  }

  const toggleVideo = () => {
    if (!localStream) return
    const nextState = !videoEnabled
    localStream.getVideoTracks().forEach((t) => {
      t.enabled = nextState
    })
    setVideoEnabled(nextState)

    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('toggle_media', {
        roomCode: upperRoomCode,
        audioOn: audioEnabled,
        videoOn: nextState
      })
    }
  }

  const handleLeaveCall = () => {
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('leave_meet', { roomCode: upperRoomCode })
    }

    closeAllPeerConnections()
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop())
    }
    navigate('/meet')
  }

  const handleEndMeetForEveryone = () => {
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('end_meet_for_all', { roomCode: upperRoomCode })
    }
    setConfirmEndModal(false)
    navigate('/meet')
  }

  const sendReaction = (emoji) => {
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('send_reaction', { roomCode: upperRoomCode, emoji })
    }
  }

  // 7. Canvas Interaction Event Handlers
  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const handleCanvasPointerDown = (e) => {
    if (wbTool === 'text') {
      const { x, y } = getCanvasCoordinates(e)
      setTextInput({ open: true, x, y, content: '' })
      return
    }

    const { x, y } = getCanvasCoordinates(e)
    const strokeId = `stroke_${Date.now()}_${Math.random()}`
    currentStrokeIdRef.current = strokeId
    isDrawingRef.current = true

    const point = { x, y }
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('wb_draw_start', {
        roomCode: upperRoomCode,
        strokeId,
        color: wbColor,
        width: wbWidth,
        point
      })
    }

    remoteBoardActionsRef.current.push({
      type: 'stroke',
      strokeId,
      color: wbColor,
      width: wbWidth,
      points: [point]
    })
    redrawCanvas()
  }

  const handleCanvasPointerMove = (e) => {
    if (!isDrawingRef.current || !currentStrokeIdRef.current || wbTool !== 'pen') return
    const { x, y } = getCanvasCoordinates(e)
    const point = { x, y }
    const strokeId = currentStrokeIdRef.current

    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('wb_draw_point', {
        roomCode: upperRoomCode,
        strokeId,
        point
      })
    }

    const stroke = remoteBoardActionsRef.current.find((s) => s.strokeId === strokeId)
    if (stroke) {
      stroke.points.push(point)
      redrawCanvas()
    }
  }

  const handleCanvasPointerUp = () => {
    if (!isDrawingRef.current || !currentStrokeIdRef.current) return
    const strokeId = currentStrokeIdRef.current
    isDrawingRef.current = false
    currentStrokeIdRef.current = null

    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('wb_draw_end', {
        roomCode: upperRoomCode,
        strokeId
      })
    }
    redrawCanvas()
  }

  const handleSubmitText = (e) => {
    e.preventDefault()
    if (!textInput.content.trim()) {
      setTextInput({ open: false, x: 0, y: 0, content: '' })
      return
    }

    const textId = `text_${Date.now()}_${Math.random()}`
    const payload = {
      textId,
      x: textInput.x,
      y: textInput.y,
      content: textInput.content.trim(),
      color: wbColor
    }

    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('wb_add_text', {
        roomCode: upperRoomCode,
        ...payload
      })
    }

    remoteBoardActionsRef.current.push({
      type: 'text',
      ...payload
    })
    redrawCanvas()
    setTextInput({ open: false, x: 0, y: 0, content: '' })
  }

  const handleClearBoard = () => {
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('wb_clear', { roomCode: upperRoomCode })
    }
  }

  // 8. Render Validation / Error States
  if (isValidating) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent-color)] border-t-transparent" />
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Validating meeting room...</p>
        </div>
      </div>
    )
  }

  if (roomError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="saas-card max-w-md w-full text-center space-y-4 border border-[var(--border-main)] p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--error-bg)] text-2xl mx-auto">
            🚫
          </div>
          <h2 className="section-title text-xl font-bold">{roomError}</h2>
          <p className="caption-text text-sm">
            This study meet may have expired, been ended by the host, or the room code is invalid.
          </p>
          <Link to="/meet" className="saas-button-primary inline-flex font-bold px-6 py-2.5">
            Return to Meet Lobby
          </Link>
        </div>
      </div>
    )
  }

  const hostUserId = (meetInfo?.createdBy?._id || meetInfo?.createdBy || '').toString()
  const isHost = currentUserId && hostUserId && currentUserId === hostUserId
  const shareableUrl = `${window.location.origin}/meet/room/${upperRoomCode}`

  // Calculate Grid Layout Columns based on total participant count
  const allParticipantCount = (participants.length > 0 ? participants.length : 1)
  const gridColsClass =
    allParticipantCount <= 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : allParticipantCount <= 4
      ? 'grid-cols-2'
      : 'grid-cols-2 lg:grid-cols-3'

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--bg-primary)] relative">
      {/* Floating Animated Reaction Emojis Overlay */}
      <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
        {reactions.map((r) => (
          <div
            key={r.id}
            style={{ left: `${r.xPercent}%` }}
            className="absolute bottom-20 flex flex-col items-center animate-bounce transition-all duration-1000"
          >
            <span className="text-4xl drop-shadow-lg">{r.emoji}</span>
            <span className="rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm mt-1">
              {r.name}
            </span>
          </div>
        ))}
      </div>

      {/* Top Header Bar */}
      <div className="flex-none border-b border-[var(--border-main)] bg-[var(--bg-surface)] px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/meet"
              className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              title="Back to Lobby"
            >
              ←
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-[var(--text-primary)] truncate">
                  {meetInfo?.title || 'Study Meet'}
                </h1>
                <span className="rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] border border-[var(--accent-color)]/30 px-2 py-0.5 text-[10px] font-bold shrink-0">
                  {upperRoomCode}
                </span>
                {isHost && (
                  <span className="rounded-full bg-amber-500 text-black px-2 py-0.5 text-[10px] font-extrabold shrink-0">
                    👑 Host
                  </span>
                )}
              </div>
              <p className="caption-text text-xs truncate">Host: {meetInfo?.createdBy?.name || 'Peer'}</p>
            </div>
          </div>

          {/* Shareable Invite Link Panel */}
          <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-[12px] border border-[var(--border-main)]">
            <span className="text-xs font-semibold text-[var(--text-secondary)] hidden sm:inline">Invite Link:</span>
            <span className="font-mono text-xs text-[var(--accent-color)] font-bold truncate max-w-[160px] sm:max-w-[240px]">
              {shareableUrl}
            </span>
            <CopyButton text={shareableUrl} />
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher (<lg screens) */}
      <div className="flex border-b border-[var(--border-main)] bg-[var(--bg-secondary)] lg:hidden">
        <button
          type="button"
          onClick={() => setActiveMobileTab('call')}
          className={`flex-1 py-2 text-xs font-bold border-b-2 transition ${
            activeMobileTab === 'call'
              ? 'border-[var(--accent-color)] text-[var(--accent-color)]'
              : 'border-transparent text-[var(--text-muted)]'
          }`}
        >
          📹 Video Call ({allParticipantCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('board')}
          className={`flex-1 py-2 text-xs font-bold border-b-2 transition ${
            activeMobileTab === 'board'
              ? 'border-[var(--accent-color)] text-[var(--accent-color)]'
              : 'border-transparent text-[var(--text-muted)]'
          }`}
        >
          🎨 Shared Whiteboard
        </button>
      </div>

      {/* Media Hardware Error Toast */}
      {mediaError && (
        <div className="flex-none bg-[var(--error-bg)] border-b border-[var(--error-color)]/30 px-4 py-2 flex items-center justify-between text-xs text-[var(--error-color)]">
          <span>⚠️ {mediaError}</span>
          <button
            type="button"
            onClick={initLocalMedia}
            className="font-bold underline hover:opacity-80"
          >
            Retry Camera/Mic
          </button>
        </div>
      )}

      {/* Main Workspace Area (Desktop side-by-side / Mobile tabbed) */}
      <div className="flex-1 min-h-0 flex overflow-hidden p-3 sm:p-4 gap-4">
        {/* VIDEO CALL PANEL */}
        <div
          className={`flex-1 min-h-0 flex-col overflow-y-auto custom-scrollbar ${
            activeMobileTab === 'call' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className={`grid ${gridColsClass} gap-3 auto-rows-fr h-full min-h-[300px]`}>
            {/* Local User Tile */}
            <div className="relative rounded-[20px] border border-[var(--border-main)] bg-slate-950 overflow-hidden flex items-center justify-center shadow-md">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover transform -scale-x-100 ${!videoEnabled ? 'hidden' : ''}`}
              />
              {!videoEnabled && (
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-color)] text-black text-2xl font-bold shadow-lg">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <p className="text-xs font-bold text-slate-300">Camera Off</p>
                </div>
              )}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold">
                <span>{user?.name || 'You'} (You)</span>
                {!audioEnabled && <span className="text-red-400">🔇</span>}
              </div>
            </div>

            {/* Remote Participants Tiles */}
            {participants
              .filter((p) => p.userId !== currentUserId)
              .map((p) => {
                const stream = remoteStreams[p.userId]
                return (
                  <div
                    key={p.userId}
                    className="relative rounded-[20px] border border-[var(--border-main)] bg-slate-950 overflow-hidden flex items-center justify-center shadow-md"
                  >
                    {stream && p.videoOn ? (
                      <video
                        ref={(el) => {
                          if (el && el.srcObject !== stream) {
                            el.srcObject = stream
                          }
                        }}
                        autoPlay
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--accent-color)] text-2xl font-bold shadow-lg">
                          {p.name?.[0]?.toUpperCase() || 'P'}
                        </div>
                        <p className="text-xs font-bold text-slate-300">
                          {!p.videoOn ? 'Camera Off' : 'Connecting stream...'}
                        </p>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold">
                      <span>{p.name}</span>
                      {!p.audioOn && <span className="text-red-400">🔇</span>}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* SHARED WHITEBOARD PANEL */}
        <div
          className={`flex-1 min-h-0 flex-col rounded-[20px] border border-[var(--border-main)] bg-[var(--bg-surface)] shadow-md overflow-hidden ${
            activeMobileTab === 'board' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Whiteboard Header Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-main)] bg-[var(--bg-secondary)] p-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-primary)]">Tool:</span>
              <button
                type="button"
                onClick={() => setWbTool('pen')}
                className={`px-2.5 py-1 rounded-[8px] text-xs font-bold transition ${
                  wbTool === 'pen'
                    ? 'bg-[var(--accent-color)] text-black'
                    : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-main)]'
                }`}
              >
                ✏️ Pen
              </button>
              <button
                type="button"
                onClick={() => setWbTool('text')}
                className={`px-2.5 py-1 rounded-[8px] text-xs font-bold transition ${
                  wbTool === 'text'
                    ? 'bg-[var(--accent-color)] text-black'
                    : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-main)]'
                }`}
              >
                🔤 Text
              </button>
            </div>

            {/* Stroke Width & Color Swatches */}
            <div className="flex items-center gap-2">
              <select
                value={wbWidth}
                onChange={(e) => setWbWidth(Number(e.target.value))}
                className="saas-input text-xs py-1 px-2 min-h-[32px] bg-[var(--bg-primary)]"
              >
                <option value={2}>Thin (2px)</option>
                <option value={4}>Medium (4px)</option>
                <option value={8}>Thick (8px)</option>
              </select>

              <div className="flex items-center gap-1">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setWbColor(c)}
                    style={{ backgroundColor: c }}
                    className={`h-5 w-5 rounded-full border border-black/30 transition transform hover:scale-110 ${
                      wbColor === c ? 'ring-2 ring-[var(--accent-color)] scale-110' : ''
                    }`}
                  />
                ))}
              </div>

              {isHost && (
                <button
                  type="button"
                  onClick={handleClearBoard}
                  className="px-2.5 py-1 rounded-[8px] text-xs font-bold bg-[var(--error-bg)] text-[var(--error-color)] border border-[var(--error-color)]/30 hover:opacity-80 transition"
                  title="Clear whiteboard for everyone"
                >
                  Clear Board
                </button>
              )}
            </div>
          </div>

          {/* Canvas Canvas Workspace */}
          <div className="relative flex-1 min-h-0 bg-slate-900 overflow-hidden cursor-crosshair">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              className="h-full w-full touch-none"
            />

            {/* Floating Text Input Box */}
            {textInput.open && (
              <form
                onSubmit={handleSubmitText}
                style={{ left: `${textInput.x}px`, top: `${textInput.y}px` }}
                className="absolute z-20 flex gap-1 bg-black/80 p-1.5 rounded-[10px] border border-[var(--accent-color)]"
              >
                <input
                  type="text"
                  autoFocus
                  value={textInput.content}
                  onChange={(e) => setTextInput((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Type text..."
                  className="saas-input text-xs min-h-[30px] px-2 py-0.5 text-white"
                />
                <button type="submit" className="saas-button-primary text-xs min-h-[30px] px-2 font-bold">
                  Add
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Fixed Control Bar */}
      <div className="flex-none border-t border-[var(--border-main)] bg-[var(--bg-surface)] px-4 py-3 shadow-lg z-30">
        <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1280px] mx-auto">
          {/* Reaction Bar */}
          <div className="flex items-center gap-1 bg-[var(--bg-secondary)] px-2 py-1 rounded-[14px] border border-[var(--border-main)]">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendReaction(emoji)}
                className="p-1.5 hover:bg-[var(--bg-primary)] rounded-[10px] text-lg transition transform active:scale-125 cursor-pointer"
                title={`Send ${emoji} reaction`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Media Controls (Mute, Video, Leave, End) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleAudio}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[14px] font-bold text-xs shadow-sm transition ${
                audioEnabled
                  ? 'bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
                  : 'bg-[var(--error-color)] text-white'
              }`}
            >
              <span>{audioEnabled ? '🎙️ Mic On' : '🔇 Muted'}</span>
            </button>

            <button
              type="button"
              onClick={toggleVideo}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[14px] font-bold text-xs shadow-sm transition ${
                videoEnabled
                  ? 'bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
                  : 'bg-[var(--error-color)] text-white'
              }`}
            >
              <span>{videoEnabled ? '📹 Camera On' : '📷 Cam Off'}</span>
            </button>

            <button
              type="button"
              onClick={handleLeaveCall}
              className="px-5 py-2.5 rounded-[14px] font-bold text-xs bg-[var(--bg-secondary)] text-[var(--error-color)] border border-[var(--error-color)]/30 hover:bg-[var(--error-bg)] transition shadow-sm"
            >
              Leave Call
            </button>

            {isHost && (
              <button
                type="button"
                onClick={() => setConfirmEndModal(true)}
                className="px-5 py-2.5 rounded-[14px] font-extrabold text-xs bg-[var(--error-color)] text-white hover:bg-[var(--error-color)]/90 transition shadow-md"
              >
                End Meet for Everyone
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Host End Meeting Confirmation Modal */}
      {confirmEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
          <div className="saas-card max-w-md w-full p-6 space-y-4 border-2 border-[var(--error-color)]/40 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="section-title text-lg font-bold">End Meet for Everyone?</h3>
                <p className="caption-text">This will disconnect all participants and end this session.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-main)]">
              <button
                type="button"
                onClick={() => setConfirmEndModal(false)}
                className="saas-button-secondary font-semibold text-xs min-h-[38px] px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEndMeetForEveryone}
                className="saas-button-primary bg-[var(--error-color)] text-white hover:bg-[var(--error-color)]/90 font-bold text-xs min-h-[38px] px-5"
              >
                End Meet Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
