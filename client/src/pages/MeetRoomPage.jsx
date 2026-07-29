import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import getSocket from '../api/socket.js'
import CopyButton from '../components/CopyButton.jsx'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '👏', '🎉', '🤔', '✋', '🔥']
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

  // UI Panels / Toggles State
  const [showWhiteboard, setShowWhiteboard] = useState(false)
  const [showParticipantsList, setShowParticipantsList] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showReactionsPicker, setShowReactionsPicker] = useState(false)
  const [confirmEndModal, setConfirmEndModal] = useState(false)
  const [reactions, setReactions] = useState([]) // array of { id, name, emoji, xPercent }
  const [activeTileReactions, setActiveTileReactions] = useState({}) // userId -> { emoji, id }

  // Screen Sharing State
  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const [screenSharingUser, setScreenSharingUser] = useState(null) // { userId, name } if remote is sharing

  // Phase 7: Share to Group Modal State
  const [showShareGroupModal, setShowShareGroupModal] = useState(false)
  const [userGroups, setUserGroups] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [selectedShareGroupId, setSelectedShareGroupId] = useState('')
  const [shareSuccessMsg, setShareSuccessMsg] = useState('')
  const [sharingGroup, setSharingGroup] = useState(false)

  // Whiteboard State
  const [wbColor, setWbColor] = useState('#F59E0B')
  const [wbWidth, setWbWidth] = useState(3)
  const [wbTool, setWbTool] = useState('pen') // 'pen' | 'text' | 'eraser'
  const [textInput, setTextInput] = useState({ open: false, x: 0, y: 0, content: '' })

  // Refs
  const localStreamRef = useRef(null)
  const localScreenStreamRef = useRef(null)
  const peerConnectionsRef = useRef({}) // userId -> RTCPeerConnection
  const candidateQueuesRef = useRef({}) // userId -> Array<RTCIceCandidateInit>

  const processQueuedIceCandidates = useCallback(async (remoteUserId, pc) => {
    const queue = candidateQueuesRef.current[remoteUserId] || []
    while (queue.length > 0) {
      const candidate = queue.shift()
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.error('Error adding queued ICE candidate:', err)
      }
    }
  }, [])

  const canvasRef = useRef(null)
  const canvasContainerRef = useRef(null)
  const currentStrokeIdRef = useRef(null)
  const isDrawingRef = useRef(false)
  const remoteBoardActionsRef = useRef([])
  const undoStackRef = useRef([]) // local user's actions for undo
  const redoStackRef = useRef([]) // local user's actions for redo

  // Helper to trigger reaction locally and for remote participants
  const triggerReaction = useCallback(({ userId, name, emoji }) => {
    const id = `${Date.now()}_${Math.random()}`

    if (userId || name) {
      setActiveTileReactions((prev) => {
        const next = { ...prev }
        if (userId) next[userId] = { emoji, id }
        if (name) next[name] = { emoji, id }
        return next
      })

      setTimeout(() => {
        setActiveTileReactions((prev) => {
          const next = { ...prev }
          if (userId && next[userId]?.id === id) delete next[userId]
          if (name && next[name]?.id === id) delete next[name]
          return next
        })
      }, 3500)
    }

    const newParticles = [0, 1, 2].map((idx) => ({
      id: `${id}_${idx}`,
      name: name || 'Peer',
      emoji,
      xPercent: Math.floor(Math.random() * 65) + 15,
      delayMs: idx * 180
    }))

    setReactions((prev) => [...prev, ...newParticles])

    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => !r.id.startsWith(id)))
    }, 2800)
  }, [])

  const getTileReaction = useCallback(
    (userId, name) => {
      if (userId && activeTileReactions[userId]) {
        return activeTileReactions[userId].emoji
      }
      if (name && activeTileReactions[name]) {
        return activeTileReactions[name].emoji
      }
      return null
    },
    [activeTileReactions]
  )

  // Helper to reliably attach media streams to video elements on mount/re-render
  const attachStream = useCallback((node, stream) => {
    if (node && stream && node.srcObject !== stream) {
      node.srcObject = stream
    }
  }, [])

  // Keep localStreamRef updated
  useEffect(() => {
    localStreamRef.current = localStream
  }, [localStream])

  // 1. Initial Room Validation on Mount
  useEffect(() => {
    if (!user) return
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
  }, [api, upperRoomCode, user])

  // 2. getUserMedia Media Stream Capture (Resilient with fallbacks and instant prompt)
  const initLocalMedia = useCallback(async () => {
    setMediaError('')

    const hostname = window.location.hostname
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
    const isHTTPS = window.location.protocol === 'https:'

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (!isHTTPS && !isLocalhost) {
        setMediaError(
          `Chrome/Edge security policy disables camera & mic on plain HTTP IP (http://${hostname}:5173). To enable for local Wi-Fi testing: open chrome://flags/#unsafely-treat-insecure-origin-as-secure on your friend's laptop, add http://${hostname}:5173, and click Relaunch!`
        )
      } else {
        setMediaError('Media devices API is not supported by your browser.')
      }
      return null
    }

    try {
      // Attempt both video and audio
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setLocalStream(stream)
      setAudioEnabled(true)
      setVideoEnabled(true)
      return stream
    } catch (err) {
      console.warn('getUserMedia audio+video failed, attempting fallbacks:', err)

      // Fallback 1: Audio only
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
        setLocalStream(audioOnly)
        setAudioEnabled(true)
        setVideoEnabled(false)
        setMediaError('Camera not detected. Connected using Microphone only.')
        return audioOnly
      } catch (audioErr) {
        console.warn('Audio fallback failed, attempting video only:', audioErr)

        // Fallback 2: Video only
        try {
          const videoOnly = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          setLocalStream(videoOnly)
          setAudioEnabled(false)
          setVideoEnabled(true)
          setMediaError('Microphone not detected. Connected using Camera only.')
          return videoOnly
        } catch (videoErr) {
          console.error('All getUserMedia attempts failed:', videoErr)
          setMediaError('Camera/Microphone permission denied. Please allow permissions in your browser address bar.')
          return null
        }
      }
    }
  }, [])

  // Prompt for media immediately on mount (parallel with room validation)
  useEffect(() => {
    initLocalMedia()

    return () => {
      // Teardown local media tracks on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (localScreenStreamRef.current) {
        localScreenStreamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [initLocalMedia])

  // Phase 5 Safety Net: Late permission / stream resolution handling
  useEffect(() => {
    if (!localStream) return

    Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
      const senders = pc.getSenders()
      const tracksToAdd = localStream.getTracks()
      let needsOffer = false

      tracksToAdd.forEach((track) => {
        const existingSender = senders.find((s) => s.track?.kind === track.kind)
        if (existingSender) {
          if (existingSender.track !== track) {
            existingSender.replaceTrack(track).catch(() => {})
          }
        } else {
          pc.addTrack(track, localStream)
          needsOffer = true
        }
      })

      if (needsOffer) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            const socket = getSocket()
            if (socket && socket.connected) {
              socket.emit('webrtc_offer', {
                roomCode: upperRoomCode,
                toUserId: peerId,
                sdp: pc.localDescription
              })
            }
          })
          .catch((err) => console.error('Error re-negotiating offer after delayed getUserMedia:', err))
      }
    })
  }, [localStream, upperRoomCode])

  // 3. WebRTC Peer Connection Helper
  const createPeerConnection = useCallback((remoteUserId, streamToUse) => {
    if (peerConnectionsRef.current[remoteUserId]) {
      return peerConnectionsRef.current[remoteUserId]
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    })

    // Attach local tracks (screen track if sharing, else camera/mic stream)
    const activeStream = streamToUse || localStreamRef.current
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
  }, [upperRoomCode])

  // Clean up a specific peer connection
  const closePeerConnection = useCallback((remoteUserId) => {
    const pc = peerConnectionsRef.current[remoteUserId]
    if (pc) {
      pc.close()
      delete peerConnectionsRef.current[remoteUserId]
    }
    delete candidateQueuesRef.current[remoteUserId]
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
    candidateQueuesRef.current = {}
    setRemoteStreams({})
  }, [])

  // 4. Whiteboard Canvas Rendering & Redraw Logic
  const drawStrokeOnCanvas = useCallback((ctx, stroke) => {
    if (!ctx || !stroke) return
    const { tool, color, width, points } = stroke
    if (!points || points.length === 0) return

    ctx.save()
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = width || 20
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color || '#F59E0B'
      ctx.lineWidth = width || 3
    }
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
    ctx.globalCompositeOperation = 'source-over'
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

    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

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
      if (!payload) return
      if (event === 'wb_draw_start') {
        currentStrokesMap[payload.strokeId] = {
          type: 'stroke',
          strokeId: payload.strokeId,
          tool: payload.tool || 'pen',
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

  // Phase 2 Canvas ResizeObserver for HiDPI sharpness and accurate cursor positioning
  useEffect(() => {
    const container = canvasContainerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const clientWidth = container.clientWidth
      const clientHeight = container.clientHeight

      if (clientWidth === 0 || clientHeight === 0) return

      canvas.width = clientWidth * dpr
      canvas.height = clientHeight * dpr
      canvas.style.width = `${clientWidth}px`
      canvas.style.height = `${clientHeight}px`

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
      }
      redrawCanvas()
    }

    const observer = new ResizeObserver(() => {
      resizeCanvas()
    })

    observer.observe(container)
    resizeCanvas()

    return () => {
      observer.disconnect()
    }
  }, [redrawCanvas, showWhiteboard])

  // 5. Socket.IO Event Handlers Lifecycle (Phase 5 fix: localStream removed from dependencies)
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
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
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
        if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp))
          await processQueuedIceCandidates(fromUserId, pc)
          const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
          await pc.setLocalDescription(answer)
          socket.emit('webrtc_answer', {
            roomCode: upperRoomCode,
            toUserId: fromUserId,
            sdp: answer
          })
        }
      } catch (err) {
        console.error('Error handling WebRTC offer:', err)
      }
    }

    const handleWebrtcAnswer = async ({ fromUserId, sdp }) => {
      const pc = peerConnectionsRef.current[fromUserId]
      if (pc) {
        try {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp))
            await processQueuedIceCandidates(fromUserId, pc)
          }
        } catch (err) {
          console.error('Error setting remote description from answer:', err)
        }
      }
    }

    const handleWebrtcIceCandidate = async ({ fromUserId, candidate }) => {
      const pc = peerConnectionsRef.current[fromUserId]
      if (pc && candidate) {
        try {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          } else {
            if (!candidateQueuesRef.current[fromUserId]) {
              candidateQueuesRef.current[fromUserId] = []
            }
            candidateQueuesRef.current[fromUserId].push(candidate)
          }
        } catch (err) {
          console.error('Error adding ICE candidate:', err)
        }
      }
    }

    const handlePeerLeft = ({ userId }) => {
      closePeerConnection(userId)
    }

    const handleReactionReceived = ({ userId, name, emoji }) => {
      triggerReaction({ userId, name, emoji })
    }

    const handleMeetBoardHistory = (actions) => {
      replayActionHistory(actions)
    }

    const handleWbDrawStart = (payload) => {
      remoteBoardActionsRef.current.push({
        type: 'stroke',
        strokeId: payload.strokeId,
        tool: payload.tool || 'pen',
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

    const handleWbRemoveAction = ({ actionId }) => {
      remoteBoardActionsRef.current = remoteBoardActionsRef.current.filter((item) => {
        if (item.strokeId) return item.strokeId !== actionId
        if (item.textId) return item.textId !== actionId
        return true
      })
      redrawCanvas()
    }

    const handleWbClear = () => {
      remoteBoardActionsRef.current = []
      undoStackRef.current = []
      redoStackRef.current = []
      redrawCanvas()
    }

    const handleScreenShareStatus = ({ userId, name, sharing }) => {
      if (sharing) {
        setScreenSharingUser({ userId, name })
      } else {
        setScreenSharingUser((prev) => (prev?.userId === userId ? null : prev))
      }
    }

    const handleMeetEnded = () => {
      closeAllPeerConnections()
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
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
    socket.on('wb_remove_action', handleWbRemoveAction)
    socket.on('wb_clear', handleWbClear)
    socket.on('screen_share_status', handleScreenShareStatus)
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
      socket.off('wb_remove_action', handleWbRemoveAction)
      socket.off('wb_clear', handleWbClear)
      socket.off('screen_share_status', handleScreenShareStatus)
      socket.off('meet_ended', handleMeetEnded)

      closeAllPeerConnections()
    }
  }, [meetInfo, upperRoomCode, createPeerConnection, closePeerConnection, closeAllPeerConnections, replayActionHistory, redrawCanvas, navigate])

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

  // Phase 4 Screen Sharing Handler
  const handleToggleScreenShare = async () => {
    if (isSharingScreen) {
      stopScreenShare()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      const screenTrack = stream.getVideoTracks()[0]
      if (!screenTrack) return

      localScreenStreamRef.current = stream
      setIsSharingScreen(true)

      // Swap outgoing video track for all peers
      Object.values(peerConnectionsRef.current).forEach((pc) => {
        const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video')
        if (videoSender) {
          videoSender.replaceTrack(screenTrack)
        }
      })

      const socket = getSocket()
      if (socket && socket.connected) {
        socket.emit('screen_share_status', { roomCode: upperRoomCode, sharing: true })
      }

      // Handle user clicking native browser "Stop sharing" button
      screenTrack.onended = () => {
        stopScreenShare()
      }
    } catch (err) {
      // User cancelled picker or error - gracefully stay in call
      console.log('Screen sharing cancelled or not granted:', err)
    }
  }

  const stopScreenShare = () => {
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((t) => t.stop())
      localScreenStreamRef.current = null
    }
    setIsSharingScreen(false)

    // Restore original camera track to all peers
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null
    Object.values(peerConnectionsRef.current).forEach((pc) => {
      const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video')
      if (videoSender && cameraTrack) {
        videoSender.replaceTrack(cameraTrack)
      }
    })

    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('screen_share_status', { roomCode: upperRoomCode, sharing: false })
    }
  }

  const handleLeaveCall = () => {
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('leave_meet', { roomCode: upperRoomCode })
    }

    closeAllPeerConnections()
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
    }
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((t) => t.stop())
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

  // Close reactions picker when clicking outside
  useEffect(() => {
    if (!showReactionsPicker) return
    const handleClickOutside = (e) => {
      if (!e.target.closest('.reaction-picker-container')) {
        setShowReactionsPicker(false)
      }
    }
    window.addEventListener('pointerdown', handleClickOutside)
    return () => window.removeEventListener('pointerdown', handleClickOutside)
  }, [showReactionsPicker])

  const sendReaction = (emoji) => {
    triggerReaction({
      userId: currentUserId,
      name: user?.name || 'You',
      emoji
    })

    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('send_reaction', { roomCode: upperRoomCode, emoji })
    }
    setShowReactionsPicker(false)
  }

  // 7. Whiteboard Canvas Interaction Handlers
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
    const effectiveWidth = wbTool === 'eraser' ? 20 : wbWidth

    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('wb_draw_start', {
        roomCode: upperRoomCode,
        strokeId,
        tool: wbTool,
        color: wbColor,
        width: effectiveWidth,
        point
      })
    }

    const newStroke = {
      type: 'stroke',
      strokeId,
      tool: wbTool,
      color: wbColor,
      width: effectiveWidth,
      points: [point]
    }

    remoteBoardActionsRef.current.push(newStroke)
    redrawCanvas()
  }

  const handleCanvasPointerMove = (e) => {
    if (!isDrawingRef.current || !currentStrokeIdRef.current) return
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

    // Push to local user's undo stack
    const action = remoteBoardActionsRef.current.find((s) => s.strokeId === strokeId)
    if (action) {
      undoStackRef.current.push({
        actionId: strokeId,
        actionType: 'stroke',
        action
      })
      redoStackRef.current = [] // clear redo stack on new action
    }

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

    const textItem = {
      type: 'text',
      ...payload
    }

    remoteBoardActionsRef.current.push(textItem)
    undoStackRef.current.push({
      actionId: textId,
      actionType: 'text',
      action: textItem
    })
    redoStackRef.current = []

    redrawCanvas()
    setTextInput({ open: false, x: 0, y: 0, content: '' })
  }

  const handleClearBoard = () => {
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('wb_clear', { roomCode: upperRoomCode })
    }
  }

  // Phase 2: Undo / Redo Scoped Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showWhiteboard) return

      // Don't intercept if user is typing in a form input/textarea
      const targetTag = document.activeElement?.tagName?.toUpperCase()
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) return

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      if (!isCmdOrCtrl) return

      const key = e.key.toLowerCase()

      // UNDO: Ctrl+Z / Cmd+Z
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (undoStackRef.current.length === 0) return

        const lastAction = undoStackRef.current.pop()
        redoStackRef.current.push(lastAction)

        const socket = getSocket()
        if (socket && socket.connected) {
          socket.emit('wb_remove_action', {
            roomCode: upperRoomCode,
            actionId: lastAction.actionId,
            actionType: lastAction.actionType
          })
        }

        remoteBoardActionsRef.current = remoteBoardActionsRef.current.filter((item) => {
          if (item.strokeId) return item.strokeId !== lastAction.actionId
          if (item.textId) return item.textId !== lastAction.actionId
          return true
        })
        redrawCanvas()
      }

      // REDO: Ctrl+Y or Ctrl+Shift+Z
      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault()
        if (redoStackRef.current.length === 0) return

        const redoAction = redoStackRef.current.pop()
        undoStackRef.current.push(redoAction)

        const socket = getSocket()
        const { action } = redoAction

        if (action.type === 'stroke') {
          if (socket && socket.connected) {
            socket.emit('wb_draw_start', {
              roomCode: upperRoomCode,
              strokeId: action.strokeId,
              tool: action.tool || 'pen',
              color: action.color,
              width: action.width,
              point: action.points[0]
            })
            for (let i = 1; i < action.points.length; i++) {
              socket.emit('wb_draw_point', {
                roomCode: upperRoomCode,
                strokeId: action.strokeId,
                point: action.points[i]
              })
            }
            socket.emit('wb_draw_end', {
              roomCode: upperRoomCode,
              strokeId: action.strokeId
            })
          }
        } else if (action.type === 'text') {
          if (socket && socket.connected) {
            socket.emit('wb_add_text', {
              roomCode: upperRoomCode,
              textId: action.textId,
              x: action.x,
              y: action.y,
              content: action.content,
              color: action.color
            })
          }
        }

        remoteBoardActionsRef.current.push(action)
        redrawCanvas()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showWhiteboard, upperRoomCode, redrawCanvas])

  // Phase 7: Fetch Study Groups & Share to Group Chat
  const handleOpenShareGroupModal = async () => {
    setShowShareGroupModal(true)
    setShareSuccessMsg('')
    setLoadingGroups(true)
    try {
      const res = await api.get('/study-groups/groups')
      const groups = res.data || []
      setUserGroups(groups)
      if (groups.length > 0) {
        setSelectedShareGroupId(groups[0]._id)
      }
    } catch (err) {
      console.error('Failed to load study groups:', err)
    } finally {
      setLoadingGroups(false)
    }
  }

  const handleSendInviteToGroup = async (e) => {
    e.preventDefault()
    if (!selectedShareGroupId) return

    setSharingGroup(true)
    setShareSuccessMsg('')

    const shareableUrl = `${window.location.origin}/meet/room/${upperRoomCode}`
    const messageBody = `📹 Join our study meet: ${shareableUrl} (Code: ${upperRoomCode})`

    try {
      // Send via HTTP endpoint
      await api.post(`/study-groups/groups/${selectedShareGroupId}/messages`, {
        message: messageBody
      })

      // Also emit via chat socket if connected
      const socket = getSocket()
      if (socket && socket.connected) {
        socket.emit('send_message', {
          groupId: selectedShareGroupId,
          message: messageBody
        })
      }

      setShareSuccessMsg('Invite shared successfully into group chat!')
      setTimeout(() => {
        setShowShareGroupModal(false)
      }, 1800)
    } catch (err) {
      console.error('Failed to share invite to group:', err)
    } finally {
      setSharingGroup(false)
    }
  }

  // 8. Render Validation / Error States
  if (isValidating) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)] p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent-color)] border-t-transparent" />
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Validating meeting room...</p>
        </div>
      </div>
    )
  }

  if (roomError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)] p-6">
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
  const isHost = Boolean(currentUserId && hostUserId && currentUserId === hostUserId)
  const shareableUrl = `${window.location.origin}/meet/room/${upperRoomCode}`

  // Participant counts & Presentation mode condition
  const allParticipantCount = participants.length > 0 ? participants.length : 1
  const isPresentationMode = showWhiteboard || isSharingScreen || Boolean(screenSharingUser)

  // Responsive Grid Columns density mapping for Phase 1
  const gridColsClass =
    allParticipantCount <= 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : allParticipantCount <= 4
      ? 'grid-cols-2 lg:grid-cols-2'
      : 'grid-cols-2 md:grid-cols-3'

  return (
    <div className="flex h-screen w-screen min-h-0 flex-col overflow-hidden bg-[var(--bg-primary)] relative select-none">
      {/* Floating Animated Reaction Emojis Overlay (Zoom style) */}
      <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
        {reactions.map((r) => (
          <div
            key={r.id}
            style={{
              left: `${r.xPercent}%`,
              animationDelay: `${r.delayMs || 0}ms`
            }}
            className="absolute bottom-20 flex flex-col items-center animate-zoomFloat"
          >
            <span className="text-5xl drop-shadow-2xl filter transform hover:scale-125 transition">
              {r.emoji}
            </span>
            <span className="rounded-full bg-black/85 border border-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xl mt-1">
              {r.name}
            </span>
          </div>
        ))}
      </div>

      {/* Standalone Minimal Top Header Bar (Phase 6) */}
      <header className="flex-none border-b border-[var(--border-main)] bg-[var(--bg-surface)] px-4 py-2.5 shadow-xs z-30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/meet"
              className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition shrink-0"
              title="Back to Meet Lobby"
            >
              ←
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-[var(--text-primary)] truncate">
                  {meetInfo?.title || 'Study Meet'}
                </h1>
                <span className="rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] border border-[var(--accent-color)]/30 px-2.5 py-0.5 text-[10px] font-mono font-bold shrink-0">
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

          {/* Presenting Screen Banner */}
          {screenSharingUser && (
            <div className="hidden sm:flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
              <span>💻 {screenSharingUser.name} is presenting screen</span>
            </div>
          )}

          {/* Top Quick Actions (Invite & Header Buttons) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-main)] hover:border-[var(--accent-color)] text-xs font-bold transition cursor-pointer"
            >
              <span>🔗 Invite</span>
            </button>

            <button
              type="button"
              onClick={() => setShowParticipantsList((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-main)] hover:border-[var(--accent-color)] text-xs font-bold transition cursor-pointer"
            >
              <span>👥 {allParticipantCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Media Hardware Error Toast */}
      {mediaError && (
        <div className="flex-none bg-[var(--error-bg)] border-b border-[var(--error-color)]/30 px-4 py-2 flex items-center justify-between text-xs text-[var(--error-color)] z-30">
          <span>⚠️ {mediaError}</span>
          <button
            type="button"
            onClick={initLocalMedia}
            className="font-bold underline hover:opacity-80 cursor-pointer"
          >
            Retry Camera/Mic
          </button>
        </div>
      )}

      {/* MAIN CONTENT WORKSPACE AREA */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-3 sm:p-4 gap-3 relative">
        {/* PRESENTATION MODE LAYOUT (Phase 3 & Phase 4) */}
        {isPresentationMode ? (
          <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
            {/* Top Main Presentation Feature Canvas / Video */}
            <div className="flex-1 min-h-0 rounded-[20px] border border-[var(--border-main)] bg-slate-950 overflow-hidden relative shadow-lg">
              {showWhiteboard ? (
                <div className="h-full w-full flex flex-col bg-[var(--bg-surface)] overflow-hidden">
                  {/* Whiteboard Header Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-main)] bg-[var(--bg-secondary)] p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)]">Tool:</span>
                      <button
                        type="button"
                        onClick={() => setWbTool('pen')}
                        className={`px-3 py-1 rounded-[8px] text-xs font-bold transition cursor-pointer ${
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
                        className={`px-3 py-1 rounded-[8px] text-xs font-bold transition cursor-pointer ${
                          wbTool === 'text'
                            ? 'bg-[var(--accent-color)] text-black'
                            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-main)]'
                        }`}
                      >
                        🔤 Text
                      </button>
                      <button
                        type="button"
                        onClick={() => setWbTool('eraser')}
                        className={`px-3 py-1 rounded-[8px] text-xs font-bold transition cursor-pointer ${
                          wbTool === 'eraser'
                            ? 'bg-[var(--accent-color)] text-black'
                            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-main)]'
                        }`}
                      >
                        🧹 Eraser
                      </button>
                    </div>

                    {/* Stroke Width & Color Swatches */}
                    <div className="flex items-center gap-2">
                      {wbTool !== 'eraser' && (
                        <>
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
                                className={`h-5 w-5 rounded-full border border-black/30 transition transform hover:scale-110 cursor-pointer ${
                                  wbColor === c ? 'ring-2 ring-[var(--accent-color)] scale-110' : ''
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}

                      <span className="text-[10px] text-[var(--text-muted)] font-semibold hidden md:inline">
                        (Ctrl+Z Undo / Ctrl+Y Redo)
                      </span>

                      {isHost && (
                        <button
                          type="button"
                          onClick={handleClearBoard}
                          className="px-2.5 py-1 rounded-[8px] text-xs font-bold bg-[var(--error-bg)] text-[var(--error-color)] border border-[var(--error-color)]/30 hover:opacity-80 transition cursor-pointer"
                          title="Clear whiteboard for everyone"
                        >
                          Clear Board
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowWhiteboard(false)}
                        className="px-2.5 py-1 rounded-[8px] text-xs font-bold bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-main)] hover:text-[var(--text-primary)] transition cursor-pointer"
                      >
                        ✕ Close
                      </button>
                    </div>
                  </div>

                  {/* Canvas Container Workspace */}
                  <div ref={canvasContainerRef} className="relative flex-1 min-h-0 bg-slate-900 overflow-hidden cursor-crosshair">
                    <canvas
                      ref={canvasRef}
                      onPointerDown={handleCanvasPointerDown}
                      onPointerMove={handleCanvasPointerMove}
                      onPointerUp={handleCanvasPointerUp}
                      className="touch-none"
                    />

                    {/* Floating Text Input Box */}
                    {textInput.open && (
                      <form
                        onSubmit={handleSubmitText}
                        style={{ left: `${textInput.x}px`, top: `${textInput.y}px` }}
                        className="absolute z-20 flex gap-1 bg-black/80 p-1.5 rounded-[10px] border border-[var(--accent-color)] shadow-xl"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={textInput.content}
                          onChange={(e) => setTextInput((prev) => ({ ...prev, content: e.target.value }))}
                          placeholder="Type text..."
                          className="saas-input text-xs min-h-[30px] px-2 py-0.5 text-white"
                        />
                        <button type="submit" className="saas-button-primary text-xs min-h-[30px] px-2 font-bold cursor-pointer">
                          Add
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ) : isSharingScreen ? (
                /* Sharer Local Preview */
                <div className="h-full w-full flex flex-col items-center justify-center bg-black relative">
                  <video
                    ref={(node) => attachStream(node, localScreenStreamRef.current)}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-contain"
                  />
                  <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold">
                    💻 You are sharing your screen
                  </div>
                </div>
              ) : screenSharingUser ? (
                /* Remote Presenter Video Stream */
                <div className="h-full w-full flex flex-col items-center justify-center bg-black relative">
                  {remoteStreams[screenSharingUser.userId] ? (
                    <video
                      ref={(node) => attachStream(node, remoteStreams[screenSharingUser.userId])}
                      autoPlay
                      playsInline
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-white">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
                      <p className="text-sm font-bold">{screenSharingUser.name}'s screen feed loading...</p>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold">
                    💻 {screenSharingUser.name}'s Screen
                  </div>
                </div>
              ) : null}
            </div>

            {/* Bottom Horizontal Participant Strip (Phase 3) */}
            <div className="flex-none h-28 flex gap-2.5 overflow-x-auto custom-scrollbar pb-1">
              {/* Local User Tile */}
              <div className="relative h-full w-36 shrink-0 rounded-[16px] border border-[var(--border-main)] bg-slate-950 overflow-hidden flex items-center justify-center shadow-md">
                {getTileReaction(currentUserId, user?.name) && (
                  <div className="absolute top-1.5 right-1.5 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-400/50 shadow-md animate-bounce text-sm">
                    {getTileReaction(currentUserId, user?.name)}
                  </div>
                )}
                {localStream ? (
                  <video
                    ref={(node) => attachStream(node, localStream)}
                    autoPlay
                    playsInline
                    muted
                    className={`h-full w-full object-cover transform -scale-x-100 ${!videoEnabled ? 'hidden' : ''}`}
                  />
                ) : null}

                {!localStream ? (
                  <button
                    type="button"
                    onClick={initLocalMedia}
                    className="flex flex-col items-center justify-center text-center p-2 hover:bg-slate-900 w-full h-full transition cursor-pointer"
                  >
                    <span className="text-base mb-1">📹</span>
                    <span className="text-[10px] font-bold text-amber-400">Allow Media</span>
                  </button>
                ) : !videoEnabled ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-color)] text-black text-sm font-bold shadow-md">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                ) : null}

                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full text-white text-[10px] font-bold truncate">
                  <span className="truncate">{user?.name || 'You'}</span>
                  {!audioEnabled && <span className="text-red-400">🔇</span>}
                </div>
              </div>

              {/* Remote Participants Horizontal Tiles */}
              {participants
                .filter((p) => p.userId !== currentUserId)
                .map((p) => {
                  const stream = remoteStreams[p.userId]
                  return (
                    <div
                      key={p.userId}
                      className="relative h-full w-36 shrink-0 rounded-[16px] border border-[var(--border-main)] bg-slate-950 overflow-hidden flex items-center justify-center shadow-md"
                    >
                      {getTileReaction(p.userId, p.name) && (
                        <div className="absolute top-1.5 right-1.5 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-400/50 shadow-md animate-bounce text-sm">
                          {getTileReaction(p.userId, p.name)}
                        </div>
                      )}
                      {stream && p.videoOn ? (
                        <video
                          ref={(node) => attachStream(node, stream)}
                          autoPlay
                          playsInline
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--accent-color)] text-sm font-bold shadow-md">
                          {p.name?.[0]?.toUpperCase() || 'P'}
                        </div>
                      )}
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full text-white text-[10px] font-bold truncate">
                        <span className="truncate">{p.name}</span>
                        {!p.audioOn && <span className="text-red-400">🔇</span>}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        ) : (
          /* PHASE 1 DEFAULT ZOOM-STYLE GRID LAYOUT */
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <div className={`grid ${gridColsClass} gap-3 auto-rows-fr h-full min-h-[340px]`}>
              {/* Local User Tile */}
              <div className="relative rounded-[20px] border border-[var(--border-main)] bg-slate-950 overflow-hidden flex items-center justify-center shadow-md min-h-[200px]">
                {getTileReaction(currentUserId, user?.name) && (
                  <div className="absolute top-3 right-3 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-400/50 shadow-2xl animate-bounce">
                    <span className="text-2xl">{getTileReaction(currentUserId, user?.name)}</span>
                  </div>
                )}
                {localStream ? (
                  <video
                    ref={(node) => attachStream(node, localStream)}
                    autoPlay
                    playsInline
                    muted
                    className={`h-full w-full object-cover transform -scale-x-100 ${!videoEnabled ? 'hidden' : ''}`}
                  />
                ) : null}

                {!localStream ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-2xl font-bold animate-pulse">
                      📹
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">Camera & Microphone Access</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 max-w-[220px]">
                        Click below to allow browser camera and mic permissions to join call
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={initLocalMedia}
                      className="saas-button-primary text-xs font-bold px-4 py-2 rounded-xl shadow-md cursor-pointer"
                    >
                      Allow Camera & Mic →
                    </button>
                  </div>
                ) : !videoEnabled ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-color)] text-black text-2xl font-bold shadow-lg">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <p className="text-xs font-bold text-slate-300">Camera Off</p>
                  </div>
                ) : null}

                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold shadow-sm">
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
                      className="relative rounded-[20px] border border-[var(--border-main)] bg-slate-950 overflow-hidden flex items-center justify-center shadow-md min-h-[200px]"
                    >
                      {getTileReaction(p.userId, p.name) && (
                        <div className="absolute top-3 right-3 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-400/50 shadow-2xl animate-bounce">
                          <span className="text-2xl">{getTileReaction(p.userId, p.name)}</span>
                        </div>
                      )}
                      {stream && p.videoOn ? (
                        <video
                          ref={(node) => attachStream(node, stream)}
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
                      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold shadow-sm">
                        <span>{p.name}</span>
                        {!p.audioOn && <span className="text-red-400">🔇</span>}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      {/* PHASE 1 BOTTOM FIXED CONTROL BAR */}
      <div className="flex-none border-t border-[var(--border-main)] bg-[var(--bg-surface)] px-4 py-3 shadow-2xl z-30">
        <div className="flex items-center justify-between gap-2 max-w-[1280px] mx-auto overflow-x-auto custom-scrollbar">
          {/* Left Media Group: Mic & Camera */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleAudio}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-[14px] font-bold text-xs shadow-sm transition cursor-pointer ${
                audioEnabled
                  ? 'bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
                  : 'bg-[var(--error-color)] text-white'
              }`}
            >
              <span>{audioEnabled ? '🎙️ Mute' : '🔇 Unmute'}</span>
            </button>

            <button
              type="button"
              onClick={toggleVideo}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-[14px] font-bold text-xs shadow-sm transition cursor-pointer ${
                videoEnabled
                  ? 'bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
                  : 'bg-[var(--error-color)] text-white'
              }`}
            >
              <span>{videoEnabled ? '📹 Stop Video' : '📷 Start Video'}</span>
            </button>
          </div>

          {/* Center Collaboration Tools Group: Invite, Participants, Share Screen, Reactions, Whiteboard */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[14px] font-bold text-xs bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)] transition cursor-pointer"
            >
              <span>🔗 Invite</span>
            </button>

            <button
              type="button"
              onClick={() => setShowParticipantsList((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-[14px] font-bold text-xs border transition cursor-pointer ${
                showParticipantsList
                  ? 'bg-[var(--accent-color)] text-black border-transparent'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
              }`}
            >
              <span>👥 Participants ({allParticipantCount})</span>
            </button>

            {/* Share Screen (Phase 4) */}
            <button
              type="button"
              onClick={handleToggleScreenShare}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-[14px] font-bold text-xs border transition cursor-pointer ${
                isSharingScreen
                  ? 'bg-amber-500 text-black border-transparent font-extrabold'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
              }`}
            >
              <span>{isSharingScreen ? '🛑 Stop Share' : '💻 Share Screen'}</span>
            </button>

            {/* Reactions Trigger Button */}
            <div className="relative reaction-picker-container">
              <button
                type="button"
                onClick={() => setShowReactionsPicker((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-[14px] font-bold text-xs border transition cursor-pointer ${
                  showReactionsPicker
                    ? 'bg-[var(--accent-color)] text-black border-transparent font-extrabold shadow-md scale-105'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
                }`}
              >
                <span>😊 Reactions</span>
              </button>

              {/* Reactions Emoji Picker Popover (Fixed Overlay prevents overflow clipping) */}
              {showReactionsPicker && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[var(--bg-surface)] p-2.5 rounded-[20px] border-2 border-[var(--accent-color)] shadow-2xl z-[100] animate-fadeIn">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => sendReaction(emoji)}
                      className="p-2.5 hover:bg-[var(--bg-secondary)] hover:scale-125 rounded-[12px] text-2xl transition transform active:scale-150 cursor-pointer"
                      title={`Send ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Whiteboard Toggle (Replaces reference Breakout Rooms slot) */}
            <button
              type="button"
              onClick={() => setShowWhiteboard((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-[14px] font-bold text-xs border transition cursor-pointer ${
                showWhiteboard
                  ? 'bg-[var(--accent-color)] text-black border-transparent font-extrabold'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
              }`}
            >
              <span>🎨 Whiteboard</span>
            </button>
          </div>

          {/* Right Edge: Red End / Leave Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLeaveCall}
              className="px-4 py-2.5 rounded-[14px] font-bold text-xs bg-[var(--error-bg)] text-[var(--error-color)] border border-[var(--error-color)]/30 hover:opacity-90 transition cursor-pointer shadow-sm"
            >
              Leave
            </button>

            {isHost && (
              <button
                type="button"
                onClick={() => setConfirmEndModal(true)}
                className="px-4 py-2.5 rounded-[14px] font-extrabold text-xs bg-[var(--error-color)] text-white hover:opacity-90 transition cursor-pointer shadow-md"
              >
                End Meeting
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PARTICIPANTS LIST DRAWER / MODAL */}
      {showParticipantsList && (
        <div className="fixed inset-y-0 right-0 z-50 w-72 bg-[var(--bg-surface)] border-l border-[var(--border-main)] shadow-2xl p-4 flex flex-col animate-slideLeft">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Participants ({allParticipantCount})
            </h3>
            <button
              type="button"
              onClick={() => setShowParticipantsList(false)}
              className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-2">
            {/* Local User */}
            <div className="flex items-center justify-between p-2.5 rounded-[12px] bg-[var(--bg-secondary)] border border-[var(--border-main)]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-color)] text-black text-xs font-bold">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {user?.name || 'You'} (You)
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {!audioEnabled ? <span>🔇</span> : <span>🎙️</span>}
                {!videoEnabled ? <span>📷</span> : <span>📹</span>}
              </div>
            </div>

            {/* Remote Participants */}
            {participants
              .filter((p) => p.userId !== currentUserId)
              .map((p) => (
                <div
                  key={p.userId}
                  className="flex items-center justify-between p-2.5 rounded-[12px] bg-[var(--bg-secondary)] border border-[var(--border-main)]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-primary)] border border-[var(--border-main)] text-[var(--accent-color)] text-xs font-bold">
                      {p.name?.[0]?.toUpperCase() || 'P'}
                    </div>
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {p.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    {!p.audioOn ? <span>🔇</span> : <span>🎙️</span>}
                    {!p.videoOn ? <span>📷</span> : <span>📹</span>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* INVITE MODAL (Phase 7 Integration) */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
          <div className="saas-card max-w-md w-full p-6 space-y-4 border border-[var(--border-main)] shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="section-title text-lg font-bold">Invite Peers</h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Shareable Meeting URL:
              </label>
              <div className="flex items-center gap-2 bg-[var(--bg-secondary)] p-2.5 rounded-[12px] border border-[var(--border-main)]">
                <span className="font-mono text-xs text-[var(--accent-color)] font-bold truncate flex-1">
                  {shareableUrl}
                </span>
                <CopyButton text={shareableUrl} />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[var(--border-main)]">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Room Code:
              </label>
              <div className="flex items-center justify-between bg-[var(--bg-secondary)] p-2.5 rounded-[12px] border border-[var(--border-main)]">
                <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
                  {upperRoomCode}
                </span>
                <CopyButton text={upperRoomCode} />
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-main)] flex justify-between gap-3">
              <button
                type="button"
                onClick={handleOpenShareGroupModal}
                className="saas-button-primary flex-1 font-bold text-xs min-h-[38px] cursor-pointer"
              >
                📢 Share to Group Chat
              </button>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="saas-button-secondary font-semibold text-xs min-h-[38px] px-4 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 7: SHARE TO STUDY GROUP MODAL */}
      {showShareGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
          <div className="saas-card max-w-md w-full p-6 space-y-4 border border-[var(--border-main)] shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="section-title text-lg font-bold">Share to Study Group</h3>
              <button
                type="button"
                onClick={() => setShowShareGroupModal(false)}
                className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {shareSuccessMsg ? (
              <p className="rounded-[12px] bg-[var(--success-bg)] border border-[var(--success-color)]/30 p-3 text-xs text-[var(--success-color)] font-bold">
                {shareSuccessMsg}
              </p>
            ) : loadingGroups ? (
              <p className="caption-text text-xs italic">Loading your study groups...</p>
            ) : userGroups.length === 0 ? (
              <p className="body-text text-xs text-[var(--text-muted)] italic">
                You haven't joined any study groups yet.
              </p>
            ) : (
              <form onSubmit={handleSendInviteToGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Select Study Group:
                  </label>
                  <select
                    value={selectedShareGroupId}
                    onChange={(e) => setSelectedShareGroupId(e.target.value)}
                    className="saas-input w-full text-xs min-h-[42px]"
                  >
                    {userGroups.map((g) => (
                      <option key={g._id} value={g._id}>
                        {g.groupName || g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-[12px] bg-[var(--bg-secondary)] border border-[var(--border-main)] text-xs text-[var(--text-secondary)] space-y-1">
                  <p className="font-bold text-[var(--text-primary)]">Message Preview:</p>
                  <p className="font-mono text-[11px]">
                    📹 Join our study meet: {shareableUrl} (Code: {upperRoomCode})
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShareGroupModal(false)}
                    className="saas-button-secondary text-xs min-h-[38px] px-4 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sharingGroup}
                    className="saas-button-primary font-bold text-xs min-h-[38px] px-5 cursor-pointer disabled:opacity-50"
                  >
                    {sharingGroup ? 'Sending...' : 'Send to Group'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Host End Meeting Confirmation Modal */}
      {confirmEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
          <div className="saas-card max-w-md w-full p-6 space-y-4 border-2 border-[var(--error-color)]/40 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="section-title text-lg font-bold">End Meeting for Everyone?</h3>
                <p className="caption-text text-xs">This will disconnect all participants and end this session.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-main)]">
              <button
                type="button"
                onClick={() => setConfirmEndModal(false)}
                className="saas-button-secondary font-semibold text-xs min-h-[38px] px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEndMeetForEveryone}
                className="saas-button-primary bg-[var(--error-color)] text-white hover:bg-[var(--error-color)]/90 font-bold text-xs min-h-[38px] px-5 cursor-pointer"
              >
                End Meeting Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
