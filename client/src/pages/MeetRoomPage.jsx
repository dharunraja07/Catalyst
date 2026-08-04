import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import getSocket from '../api/socket.js'
import CopyButton from '../components/CopyButton.jsx'
import { useJitsiMeet } from '../hooks/useJitsiMeet.js'
import MeetChatPanel from '../components/MeetChatPanel.jsx'
import FileCard from '../components/FileCard.jsx'
import FileUploadZone from '../components/FileUploadZone.jsx'
import FilePreviewModal from '../components/FilePreviewModal.jsx'

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

  // Media state
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [participants, setParticipants] = useState([]) // array of { userId, name, audioOn, videoOn }

  // Side Panel State ('participants' | 'chat' | 'whiteboard' | 'resources' | null)
  const [activeSidePanel, setActiveSidePanel] = useState(null)
  const activeSidePanelRef = useRef(activeSidePanel)

  // Meeting Resources & Shared Documents State
  const [meetDocuments, setMeetDocuments] = useState([])
  const [previewFile, setPreviewFile] = useState(null)
  const [meetDocSearch, setMeetDocSearch] = useState('')

  const handleDeleteMeetDocument = async (file) => {
    try {
      await api.delete(`/documents/${file._id || file.id}`)
      setMeetDocuments((prev) => prev.filter((d) => (d._id || d.id) !== (file._id || file.id)))
    } catch {
      // Ignored
    }
  }

  // In-Meeting Real-Time Chat State & Incoming Toasts
  const [meetMessages, setMeetMessages] = useState([])
  const [chatToasts, setChatToasts] = useState([])

  useEffect(() => {
    activeSidePanelRef.current = activeSidePanel
    if (activeSidePanel === 'chat') {
      setChatToasts([])
    }
  }, [activeSidePanel])

  // Floating UI Modals State
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showReactionsPicker, setShowReactionsPicker] = useState(false)
  const [confirmEndModal, setConfirmEndModal] = useState(false)
  const [reactions, setReactions] = useState([]) // array of { id, name, emoji, xPercent }
  const [activeTileReactions, setActiveTileReactions] = useState({}) // userId -> { emoji, id }

  // Screen Sharing State
  const [isSharingScreen, setIsSharingScreen] = useState(false)

  // Share to Group Modal State
  const [showShareGroupModal, setShowShareGroupModal] = useState(false)
  const [userGroups, setUserGroups] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [selectedShareGroupId, setSelectedShareGroupId] = useState('')
  const [shareSuccessMsg, setShareSuccessMsg] = useState('')
  const [sharingGroup, setSharingGroup] = useState(false)

  // Auto-Hide Controls & Mobile More Menu State (Zoom/YouTube style)
  const [showControls, setShowControls] = useState(true)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const hideControlsTimerRef = useRef(null)

  // Whiteboard State & Shape Tool
  const [wbColor, setWbColor] = useState('#F59E0B')
  const [wbWidth, setWbWidth] = useState(3)
  const [wbEraserWidth, setWbEraserWidth] = useState(30)
  const [wbTool, setWbTool] = useState('pen') // 'pen' | 'line' | 'rect' | 'ellipse' | 'arrow' | 'text' | 'eraser'
  const [textInput, setTextInput] = useState({ open: false, x: 0, y: 0, nx: 0, ny: 0, content: '' })
  const [eraserCursor, setEraserCursor] = useState({ x: 0, y: 0, visible: false })
  const [draggingTextId, setDraggingTextId] = useState(null)
  const [wbAllowedUserIds, setWbAllowedUserIds] = useState([])
  const [showWbPermPopover, setShowWbPermPopover] = useState(false)

  // Auto-hide controls reset helper (Only auto-hides on mobile <768px; laptop/desktop keeps bars permanently visible)
  const isInputOrModalOpen = textInput.open || showInviteModal || showReactionsPicker || confirmEndModal || showShareGroupModal || showWbPermPopover || showMoreMenu || activeSidePanel === 'chat'

  const resetHideControlsTimer = useCallback(() => {
    setShowControls(true)
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current)
    }
    // Laptop/Desktop screens (>=768px) keep top and bottom bars PERMANENTLY visible
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      return
    }
    if (!isInputOrModalOpen) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [isInputOrModalOpen])

  useEffect(() => {
    resetHideControlsTimer()
    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current)
    }
  }, [resetHideControlsTimer])

  // Jitsi Container Node State
  const [jitsiContainerEl, setJitsiContainerEl] = useState(null)

  // Jitsi Engine Custom Hook
  const {
    isJoined: isJitsiJoined,
    isLoading: isJitsiLoading,
    error: jitsiError,
    toggleAudio: toggleJitsiAudio,
    toggleVideo: toggleJitsiVideo,
    toggleShareScreen: toggleJitsiShareScreen,
    hangup: hangupJitsi
  } = useJitsiMeet({
    roomName: upperRoomCode,
    containerEl: jitsiContainerEl,
    displayName: user?.name,
    onLeave: () => {
      handleLeaveCall()
    }
  })

  // Room Container Ref for Fullscreen API
  const roomContainerRef = useRef(null)

  // Fullscreen API & Landscape Orientation Handling
  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkAndRequestFullscreen = () => {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches || window.innerWidth > window.innerHeight
      const isMobileOrTablet = window.innerWidth < 1024

      const doc = document
      const isCurrentlyFullscreen = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      )

      if (isLandscape && isMobileOrTablet) {
        if (!isCurrentlyFullscreen && roomContainerRef.current) {
          const elem = roomContainerRef.current
          const req = elem.requestFullscreen ||
                      elem.webkitRequestFullscreen ||
                      elem.mozRequestFullScreen ||
                      elem.msRequestFullscreen
          if (req) {
            try {
              const p = req.call(elem)
              if (p && typeof p.catch === 'function') {
                p.catch(() => {}) // Gracefully handle iOS Safari or browser restriction
              }
            } catch (_) {}
          }
        }
      } else if (!isLandscape && isCurrentlyFullscreen) {
        const exit = doc.exitFullscreen ||
                     doc.webkitExitFullscreen ||
                     doc.mozCancelFullScreen ||
                     doc.msExitFullscreen
        if (exit) {
          try {
            const p = exit.call(doc)
            if (p && typeof p.catch === 'function') {
              p.catch(() => {})
            }
          } catch (_) {}
        }
      }
    }

    checkAndRequestFullscreen()

    const handleResizeOrOrientation = () => {
      checkAndRequestFullscreen()
    }

    window.addEventListener('resize', handleResizeOrOrientation)
    window.addEventListener('orientationchange', handleResizeOrOrientation)

    return () => {
      window.removeEventListener('resize', handleResizeOrOrientation)
      window.removeEventListener('orientationchange', handleResizeOrOrientation)

      // Clean exit from fullscreen on unmount / leaving meeting
      const doc = document
      const isCurrentlyFullscreen = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      )
      if (isCurrentlyFullscreen) {
        const exit = doc.exitFullscreen ||
                     doc.webkitExitFullscreen ||
                     doc.mozCancelFullScreen ||
                     doc.msExitFullscreen
        if (exit) {
          try {
            const p = exit.call(doc)
            if (p && typeof p.catch === 'function') p.catch(() => {})
          } catch (_) {}
        }
      }
    }
  }, [])

  // Whiteboard Canvas Refs
  const canvasRef = useRef(null)
  const canvasContainerRef = useRef(null)
  const currentStrokeIdRef = useRef(null)
  const isDrawingRef = useRef(false)
  const shapeStartPtRef = useRef(null)
  const draggingTextRef = useRef(null)
  const remoteBoardActionsRef = useRef([])
  const undoStackRef = useRef([])
  const redoStackRef = useRef([])

  // Helper to trigger floating reaction
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

  // 1. Initial Room Validation on Mount
  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    async function validateRoom() {
      setIsValidating(true)
      setRoomError('')
      try {
        const [res, docsRes] = await Promise.all([
          api.get(`/meets/${upperRoomCode}`),
          api.get('/documents', { params: { module: 'meet', meetId: upperRoomCode } })
        ])
        setMeetInfo(res.data)
        setMeetDocuments(docsRes.data || [])
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/login')
          return
        }
        setRoomError(err.response?.data?.error || "This meet doesn't exist or has ended")
      } finally {
        setIsValidating(false)
      }
    }
    validateRoom()
  }, [api, upperRoomCode, user, navigate])

  // 2. Whiteboard Canvas Rendering & Redraw Logic
  const drawStrokeOnCanvas = useCallback((ctx, stroke) => {
    if (!ctx || !stroke) return
    const { tool, color, width, points } = stroke
    if (!points || points.length === 0) return

    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    const cWidth = canvas ? canvas.width / dpr : 800
    const cHeight = canvas ? canvas.height / dpr : 600

    ctx.save()
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = width || 30
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color || '#F59E0B'
      ctx.lineWidth = width || 3
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const getPt = (pt) => ({
      x: pt.nx !== undefined ? pt.nx * cWidth : pt.x,
      y: pt.ny !== undefined ? pt.ny * cHeight : pt.y
    })

    ctx.beginPath()
    const startPt = getPt(points[0])
    ctx.moveTo(startPt.x, startPt.y)

    if (points.length === 1) {
      ctx.lineTo(startPt.x, startPt.y)
    } else {
      for (let i = 1; i < points.length; i++) {
        const pt = getPt(points[i])
        ctx.lineTo(pt.x, pt.y)
      }
    }
    ctx.stroke()
    ctx.restore()
  }, [])

  const drawShapeOnCanvas = useCallback((ctx, stroke) => {
    if (!ctx || !stroke || !stroke.points || stroke.points.length < 2) return
    const { tool, color, width, points } = stroke
    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    const cWidth = canvas ? canvas.width / dpr : 800
    const cHeight = canvas ? canvas.height / dpr : 600

    const getPt = (pt) => ({
      x: pt.nx !== undefined ? pt.nx * cWidth : pt.x,
      y: pt.ny !== undefined ? pt.ny * cHeight : pt.y
    })

    const p1 = getPt(points[0])
    const p2 = getPt(points[1])

    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = color || '#F59E0B'
    ctx.fillStyle = color || '#F59E0B'
    ctx.lineWidth = width || 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    if (tool === 'line') {
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    } else if (tool === 'rect') {
      ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y)
      ctx.stroke()
    } else if (tool === 'ellipse') {
      const rx = Math.abs(p2.x - p1.x) / 2
      const ry = Math.abs(p2.y - p1.y) / 2
      const cx = p1.x + (p2.x - p1.x) / 2
      const cy = p1.y + (p2.y - p1.y) / 2
      if (rx > 0 && ry > 0) {
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI)
        ctx.stroke()
      }
    } else if (tool === 'arrow') {
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()

      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)
      const headLen = Math.max(12, (width || 3) * 3)
      ctx.beginPath()
      ctx.moveTo(p2.x, p2.y)
      ctx.lineTo(p2.x - headLen * Math.cos(angle - Math.PI / 6), p2.y - headLen * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(p2.x - headLen * Math.cos(angle + Math.PI / 6), p2.y - headLen * Math.sin(angle + Math.PI / 6))
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }, [])

  const renderTextOnCanvas = useCallback((ctx, textItem) => {
    if (!ctx || !textItem) return
    const { x, y, nx, ny, content, color, textId } = textItem
    if (!content) return

    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    const cWidth = canvas ? canvas.width / dpr : 800
    const cHeight = canvas ? canvas.height / dpr : 600

    const tx = nx !== undefined ? nx * cWidth : x
    const ty = ny !== undefined ? ny * cHeight : y

    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = color || '#F59E0B'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText(content, tx, ty)

    // Optional drag highlight frame
    if (draggingTextId === textId) {
      const metrics = ctx.measureText(content)
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.strokeRect(tx - 4, ty - 16, metrics.width + 8, 22)
    }
    ctx.restore()
  }, [draggingTextId])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

    remoteBoardActionsRef.current.forEach((item) => {
      if (item.type === 'stroke') {
        if (['line', 'rect', 'ellipse', 'arrow'].includes(item.tool)) {
          drawShapeOnCanvas(ctx, item)
        } else {
          drawStrokeOnCanvas(ctx, item)
        }
      } else if (item.type === 'text') {
        renderTextOnCanvas(ctx, item)
      }
    })
  }, [drawStrokeOnCanvas, drawShapeOnCanvas, renderTextOnCanvas])

  const replayActionHistory = useCallback(
    (actions) => {
      remoteBoardActionsRef.current = []
      let currentStrokesMap = {}

      actions.forEach(({ event, payload }) => {
        if (!payload) return
        if (event === 'wb_draw_start') {
          const isShape = ['line', 'rect', 'ellipse', 'arrow'].includes(payload.tool)
          currentStrokesMap[payload.strokeId] = {
            type: 'stroke',
            strokeId: payload.strokeId,
            tool: payload.tool || 'pen',
            color: payload.color,
            width: payload.width,
            points: isShape ? [payload.point, payload.point] : [payload.point]
          }
        } else if (event === 'wb_draw_point') {
          if (currentStrokesMap[payload.strokeId]) {
            if (['line', 'rect', 'ellipse', 'arrow'].includes(currentStrokesMap[payload.strokeId].tool)) {
              currentStrokesMap[payload.strokeId].points[1] = payload.point
            } else {
              currentStrokesMap[payload.strokeId].points.push(payload.point)
            }
          }
        } else if (event === 'wb_draw_end') {
          if (currentStrokesMap[payload.strokeId]) {
            remoteBoardActionsRef.current.push(currentStrokesMap[payload.strokeId])
            delete currentStrokesMap[payload.strokeId]
          }
        } else if (event === 'wb_add_text') {
          // If textId already exists, update position (repositionable text feature!)
          const existingIdx = remoteBoardActionsRef.current.findIndex((i) => i.textId === payload.textId)
          const textItem = {
            type: 'text',
            textId: payload.textId,
            x: payload.x,
            y: payload.y,
            nx: payload.nx,
            ny: payload.ny,
            content: payload.content,
            color: payload.color
          }
          if (existingIdx !== -1) {
            remoteBoardActionsRef.current[existingIdx] = textItem
          } else {
            remoteBoardActionsRef.current.push(textItem)
          }
        } else if (event === 'wb_clear') {
          remoteBoardActionsRef.current = []
          currentStrokesMap = {}
        }
      })

      redrawCanvas()
    },
    [redrawCanvas]
  )

  // ResizeObserver for Whiteboard Canvas
  useEffect(() => {
    if (activeSidePanel !== 'whiteboard') return

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
  }, [redrawCanvas, activeSidePanel])

  // 3. Socket.IO Event Handlers Lifecycle
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

    const handleReactionReceived = ({ userId, name, emoji }) => {
      if (userId !== currentUserId) {
        triggerReaction({ userId, name, emoji })
      }
    }

    const handleMeetBoardHistory = (actions) => {
      replayActionHistory(actions)
    }

    const handleWbDrawStart = (payload) => {
      const isShape = ['line', 'rect', 'ellipse', 'arrow'].includes(payload.tool)
      remoteBoardActionsRef.current.push({
        type: 'stroke',
        strokeId: payload.strokeId,
        tool: payload.tool || 'pen',
        color: payload.color,
        width: payload.width,
        points: isShape ? [payload.point, payload.point] : [payload.point]
      })
      redrawCanvas()
    }

    const handleWbDrawPoint = (payload) => {
      const stroke = remoteBoardActionsRef.current.find((s) => s.strokeId === payload.strokeId)
      if (stroke) {
        if (['line', 'rect', 'ellipse', 'arrow'].includes(stroke.tool)) {
          stroke.points[1] = payload.point
        } else {
          stroke.points.push(payload.point)
        }
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
        nx: payload.nx,
        ny: payload.ny,
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

    const handleMeetChatHistory = (history) => {
      setMeetMessages(history || [])
    }

    const handleReceiveMeetMessage = (msg) => {
      setMeetMessages((prev) => [...prev, msg])

      const msgSenderId = (msg.userId || msg.senderId || msg.sender?._id || msg.sender || '').toString()
      const isSelf = msgSenderId && msgSenderId === currentUserId

      if (!isSelf && activeSidePanelRef.current !== 'chat') {
        const toastId = `${Date.now()}_${Math.random()}`
        const newToast = {
          id: toastId,
          userId: msgSenderId,
          name: msg.name || msg.sender?.name || 'Participant',
          message: msg.message || '',
          avatar: msg.avatar || msg.profilePic || null,
          timestamp: msg.timestamp || msg.createdAt || new Date().toISOString()
        }

        setChatToasts((prev) => [...prev.slice(-2), newToast])

        setTimeout(() => {
          setChatToasts((prev) => prev.filter((t) => t.id !== toastId))
        }, 4000)
      }
    }

    const handleMeetEnded = () => {
      try {
        hangupJitsi()
      } catch (_) {}
      navigate('/meet')
    }

    const handleWbToggle = ({ isOpen }) => {
      if (isOpen) {
        setActiveSidePanel('whiteboard')
      } else {
        setActiveSidePanel((prev) => (prev === 'whiteboard' ? null : prev))
      }
    }

    const handleWbPermissionsUpdated = ({ allowedUserIds }) => {
      setWbAllowedUserIds(allowedUserIds || [])
    }

    const handleDocumentUploaded = (doc) => {
      if ((doc.meetId || '').toUpperCase() === upperRoomCode) {
        setMeetDocuments((prev) => [doc, ...prev.filter((d) => (d._id || d.id) !== (doc._id || doc.id))])
      }
    }

    const handleDocumentDeleted = ({ documentId }) => {
      setMeetDocuments((prev) => prev.filter((d) => (d._id || d.id) !== documentId))
    }

    socket.on('meet_error', handleMeetError)
    socket.on('meet_participants_update', handleParticipantsUpdate)
    socket.on('reaction_received', handleReactionReceived)
    socket.on('document_uploaded', handleDocumentUploaded)
    socket.on('document_deleted', handleDocumentDeleted)
    socket.on('meet_board_history', handleMeetBoardHistory)
    socket.on('wb_toggle', handleWbToggle)
    socket.on('wb_permissions_updated', handleWbPermissionsUpdated)
    socket.on('wb_draw_start', handleWbDrawStart)
    socket.on('wb_draw_point', handleWbDrawPoint)
    socket.on('wb_draw_end', handleWbDrawEnd)
    socket.on('wb_add_text', handleWbAddText)
    socket.on('wb_remove_action', handleWbRemoveAction)
    socket.on('wb_clear', handleWbClear)
    socket.on('meet_chat_history', handleMeetChatHistory)
    socket.on('receive_meet_message', handleReceiveMeetMessage)
    socket.on('meet_ended', handleMeetEnded)

    return () => {
      socket.off('meet_error', handleMeetError)
      socket.off('meet_participants_update', handleParticipantsUpdate)
      socket.off('reaction_received', handleReactionReceived)
      socket.off('document_uploaded', handleDocumentUploaded)
      socket.off('document_deleted', handleDocumentDeleted)
      socket.off('meet_board_history', handleMeetBoardHistory)
      socket.off('wb_toggle', handleWbToggle)
      socket.off('wb_permissions_updated', handleWbPermissionsUpdated)
      socket.off('wb_draw_start', handleWbDrawStart)
      socket.off('wb_draw_point', handleWbDrawPoint)
      socket.off('wb_draw_end', handleWbDrawEnd)
      socket.off('wb_add_text', handleWbAddText)
      socket.off('wb_remove_action', handleWbRemoveAction)
      socket.off('wb_clear', handleWbClear)
      socket.off('meet_chat_history', handleMeetChatHistory)
      socket.off('receive_meet_message', handleReceiveMeetMessage)
      socket.off('meet_ended', handleMeetEnded)
    }
  }, [meetInfo, upperRoomCode, replayActionHistory, redrawCanvas, navigate, hangupJitsi, triggerReaction])

  // Custom Control Bar Handlers
  const handleToggleAudio = () => {
    toggleJitsiAudio()
    const nextState = !audioEnabled
    setAudioEnabled(nextState)
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('toggle_media', { roomCode: upperRoomCode, audioOn: nextState, videoOn: videoEnabled })
    }
  }

  const handleToggleVideo = () => {
    toggleJitsiVideo()
    const nextState = !videoEnabled
    setVideoEnabled(nextState)
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('toggle_media', { roomCode: upperRoomCode, audioOn: audioEnabled, videoOn: nextState })
    }
  }

  const handleToggleScreenShare = () => {
    toggleJitsiShareScreen()
    setIsSharingScreen((prev) => !prev)
  }

  const handleLeaveCall = () => {
    try {
      hangupJitsi()
    } catch (_) {}
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('leave_meet', { roomCode: upperRoomCode })
    }
    navigate('/meet')
  }

  const handleEndMeetForEveryone = () => {
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('end_meet_for_all', { roomCode: upperRoomCode })
    }
    try {
      hangupJitsi()
    } catch (_) {}
    setConfirmEndModal(false)
    navigate('/meet')
  }

  const handleSendMeetMessage = (msgText) => {
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('send_meet_message', { roomCode: upperRoomCode, message: msgText })
    }
  }

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

  const hostUserId = (meetInfo?.createdBy?._id || meetInfo?.createdBy || '').toString()
  const isHost = Boolean(currentUserId && hostUserId && currentUserId === hostUserId)
  const canDraw = Boolean(isHost || wbAllowedUserIds.includes(currentUserId))

  const handleToggleWhiteboard = () => {
    const nextOpen = activeSidePanel !== 'whiteboard'
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('wb_toggle', { roomCode: upperRoomCode, isOpen: nextOpen })
    }
  }

  const handleToggleWbPermission = (targetUserId) => {
    if (!isHost || !targetUserId) return
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('wb_toggle_permission', { roomCode: upperRoomCode, targetUserId })
    }
  }

  // Whiteboard Canvas Interaction Handlers
  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0, nx: 0, ny: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const w = rect.width || 1
    const h = rect.height || 1
    return {
      x,
      y,
      nx: Math.max(0, Math.min(1, x / w)),
      ny: Math.max(0, Math.min(1, y / h))
    }
  }

  const handleCanvasPointerDown = (e) => {
    resetHideControlsTimer()
    if (!canDraw) return
    const point = getCanvasCoordinates(e)

    // Check if user clicked an existing text object to drag/reposition
    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    const cWidth = canvas ? canvas.width / dpr : 800
    const cHeight = canvas ? canvas.height / dpr : 600

    const clickedText = remoteBoardActionsRef.current.find((item) => {
      if (item.type !== 'text') return false
      const tx = item.nx !== undefined ? item.nx * cWidth : item.x
      const ty = item.ny !== undefined ? item.ny * cHeight : item.y
      // Bounding box approximation (~120px width, 24px height)
      return point.x >= tx - 10 && point.x <= tx + 150 && point.y >= ty - 20 && point.y <= ty + 10
    })

    if (clickedText && wbTool !== 'eraser') {
      try { e.target?.setPointerCapture?.(e.pointerId) } catch (_) {}
      draggingTextRef.current = clickedText
      setDraggingTextId(clickedText.textId)
      redrawCanvas()
      return
    }

    if (wbTool === 'text') {
      setTextInput({ open: true, x: point.x, y: point.y, nx: point.nx, ny: point.ny, content: '' })
      return
    }

    try {
      e.target?.setPointerCapture?.(e.pointerId)
    } catch (_) {}

    const strokeId = `stroke_${Date.now()}_${Math.random()}`
    currentStrokeIdRef.current = strokeId
    isDrawingRef.current = true

    const effectiveWidth = wbTool === 'eraser' ? wbEraserWidth : wbWidth

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

    const isShape = ['line', 'rect', 'ellipse', 'arrow'].includes(wbTool)
    const newStroke = {
      type: 'stroke',
      strokeId,
      tool: wbTool,
      color: wbColor,
      width: effectiveWidth,
      points: isShape ? [point, point] : [point]
    }

    remoteBoardActionsRef.current.push(newStroke)
    redrawCanvas()
  }

  const handleCanvasPointerMove = (e) => {
    resetHideControlsTimer()
    const point = getCanvasCoordinates(e)

    if (wbTool === 'eraser') {
      setEraserCursor({ x: point.x, y: point.y, visible: true })
    }

    if (draggingTextRef.current) {
      draggingTextRef.current.nx = point.nx
      draggingTextRef.current.ny = point.ny
      draggingTextRef.current.x = point.x
      draggingTextRef.current.y = point.y
      redrawCanvas()
      return
    }

    if (!canDraw || !isDrawingRef.current || !currentStrokeIdRef.current) return
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
      if (['line', 'rect', 'ellipse', 'arrow'].includes(stroke.tool)) {
        stroke.points[1] = point
      } else {
        stroke.points.push(point)
      }
      redrawCanvas()
    }
  }

  const handleCanvasPointerUp = (e) => {
    resetHideControlsTimer()
    if (wbTool === 'eraser') {
      setEraserCursor((prev) => ({ ...prev, visible: false }))
    }

    if (draggingTextRef.current) {
      try { if (e?.target?.releasePointerCapture && e?.pointerId) e.target.releasePointerCapture(e.pointerId) } catch (_) {}
      const textItem = draggingTextRef.current
      draggingTextRef.current = null
      setDraggingTextId(null)

      const socket = getSocket()
      if (socket && socket.connected && textItem) {
        socket.emit('wb_add_text', {
          roomCode: upperRoomCode,
          ...textItem
        })
      }
      redrawCanvas()
      return
    }

    if (!isDrawingRef.current || !currentStrokeIdRef.current) return
    const strokeId = currentStrokeIdRef.current
    isDrawingRef.current = false
    currentStrokeIdRef.current = null

    try {
      if (e?.target?.releasePointerCapture && e?.pointerId) {
        e.target.releasePointerCapture(e.pointerId)
      }
    } catch (_) {}

    const action = remoteBoardActionsRef.current.find((s) => s.strokeId === strokeId)
    if (action) {
      undoStackRef.current.push({
        actionId: strokeId,
        actionType: 'stroke',
        action
      })
      redoStackRef.current = []
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
    if (!canDraw || !textInput.content.trim()) {
      setTextInput({ open: false, x: 0, y: 0, nx: 0, ny: 0, content: '' })
      return
    }

    const textId = `text_${Date.now()}_${Math.random()}`
    const payload = {
      textId,
      x: textInput.x,
      y: textInput.y,
      nx: textInput.nx !== undefined ? textInput.nx : 0,
      ny: textInput.ny !== undefined ? textInput.ny : 0,
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
    setTextInput({ open: false, x: 0, y: 0, nx: 0, ny: 0, content: '' })
  }

  const handleClearBoard = () => {
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('wb_clear', { roomCode: upperRoomCode })
    }
  }

  // Fetch Study Groups for Share Modal
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
      await api.post(`/study-groups/groups/${selectedShareGroupId}/messages`, {
        message: messageBody
      })

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

  // Render Validation / Error States
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

  const shareableUrl = `${window.location.origin}/meet/room/${upperRoomCode}`
  const allParticipantCount = participants.length > 0 ? participants.length : 1

  return (
    <div
      ref={roomContainerRef}
      style={{ height: '100dvh' }}
      className="flex h-[100dvh] w-full max-w-full min-h-0 flex-col overflow-hidden overflow-x-hidden overflow-y-hidden bg-[var(--bg-primary)] relative select-none"
    >
      {/* Floating Animated Reaction Emojis Overlay */}
      <div className="fixed inset-0 z-[150] pointer-events-none overflow-hidden">
        {reactions.map((r) => (
          <div
            key={r.id}
            style={{
              left: `${r.xPercent}%`,
              animationDelay: `${r.delayMs || 0}ms`
            }}
            className="absolute bottom-24 flex flex-col items-center animate-zoomFloat"
          >
            <span className="text-4xl sm:text-5xl drop-shadow-2xl filter transform hover:scale-125 transition">
              {r.emoji}
            </span>
            <span className="rounded-full bg-black/85 border border-white/20 px-2 py-0.5 text-[10px] font-bold text-white shadow-xl mt-1">
              {r.name}
            </span>
          </div>
        ))}
      </div>

      {/* Standalone Minimal Top Header Bar (Auto-Hides on Mobile <768px Only, Permanent on Laptop/Desktop) */}
      <header
        className={`flex-none border-b border-[var(--border-main)] bg-[var(--bg-surface)] px-3 py-2 sm:px-4 sm:py-2.5 shadow-xs z-30 transition-all duration-300 ease-in-out ${
          showControls ? 'opacity-100 translate-y-0' : 'max-md:opacity-0 max-md:-translate-y-full max-md:pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Link
              to="/meet"
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition shrink-0"
              title="Back to Meet Lobby"
            >
              ←
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-xs sm:text-base font-extrabold text-[var(--text-primary)] truncate max-w-[110px] sm:max-w-[320px]">
                  {meetInfo?.title || 'Study Meet'}
                </h1>
                <span className="rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] border border-[var(--accent-color)]/30 px-2 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold shrink-0">
                  {upperRoomCode}
                </span>
                {isHost && (
                  <span className="rounded-full bg-amber-500 text-black px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold shrink-0">
                    👑 Host
                  </span>
                )}
              </div>
              <p className="caption-text text-[10px] sm:text-xs truncate">Host: {meetInfo?.createdBy?.name || 'Peer'}</p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-[12px] bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-main)] hover:border-[var(--accent-color)] text-xs font-bold transition cursor-pointer min-h-[38px]"
            >
              <span>🔗</span>
              <span className="hidden sm:inline">Invite</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSidePanel((prev) => (prev === 'participants' ? null : 'participants'))}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-[12px] text-xs font-bold border transition cursor-pointer min-h-[38px] ${
                activeSidePanel === 'participants'
                  ? 'bg-[var(--accent-color)] text-black border-transparent font-extrabold'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
              }`}
            >
              <span>👥</span>
              <span>{allParticipantCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Jitsi Engine Initialization Error Toast */}
      {jitsiError && (
        <div className="flex-none bg-[var(--error-bg)] border-b border-[var(--error-color)]/30 px-4 py-2 flex items-center justify-between text-xs text-[var(--error-color)] z-30">
          <span>⚠️ {jitsiError}</span>
        </div>
      )}

      {/* MAIN CONTENT WORKSPACE AREA (Reflow Container) */}
      <div
        onClick={resetHideControlsTimer}
        onPointerMove={resetHideControlsTimer}
        className="flex-1 min-h-0 flex overflow-hidden p-1 sm:p-3 gap-2 sm:gap-3 relative bg-slate-950 max-w-full overflow-x-hidden"
      >
        {/* LEFT MAIN VIDEO AREA (Reflows Width When Panel Opens, Locked to 16:9 Video Canvas) */}
        <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden relative rounded-[20px] border border-slate-800 bg-slate-950 shadow-2xl transition-all duration-300 ease-in-out p-0.5 sm:p-2 max-w-full">
          {/* Locked 16:9 Aspect Ratio Video Box */}
          <div
            style={{
              aspectRatio: '16 / 9',
              maxWidth: '100%',
              maxHeight: '100%',
              width: '100%',
              height: 'auto'
            }}
            className="relative flex items-center justify-center bg-black overflow-hidden rounded-[16px] border border-slate-800/80 shadow-md aspect-video max-w-full max-h-full"
          >
            {/* Jitsi Engine IFrame Mount Node */}
            <div ref={setJitsiContainerEl} className="w-full h-full relative" />

            {/* Jitsi Loading Overlay */}
            {isJitsiLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xs z-10 space-y-3 pointer-events-none transition-opacity duration-300">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--accent-color)] border-t-transparent" />
                <p className="text-xs font-semibold text-[var(--text-secondary)]">Connecting to video room...</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE PANEL AREA (Participants & Chat) */}
        {activeSidePanel && activeSidePanel !== 'whiteboard' && (
          <div className="w-full sm:w-[360px] md:w-[380px] shrink-0 h-full flex flex-col rounded-[20px] border border-[var(--border-main)] bg-[var(--bg-surface)] overflow-hidden shadow-2xl transition-all duration-300 ease-in-out z-20">
            {/* 1. PARTICIPANTS PANEL */}
            {activeSidePanel === 'participants' && (
              <div className="flex flex-col h-full bg-[var(--bg-surface)] overflow-hidden">
                <div className="flex items-center justify-between p-3.5 border-b border-[var(--border-main)] bg-[var(--bg-secondary)]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👥</span>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      Participants ({allParticipantCount})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSidePanel(null)}
                    className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                  {/* Local User */}
                  <div className="flex items-center justify-between p-2.5 rounded-[12px] bg-[var(--bg-secondary)] border border-[var(--border-main)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-color)] text-black text-xs font-bold shrink-0">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {user?.name || 'You'} (You)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
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
                        className="flex items-center justify-between p-2.5 rounded-[12px] bg-[var(--bg-secondary)] border border-[var(--border-main)] gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-primary)] border border-[var(--border-main)] text-[var(--accent-color)] text-xs font-bold shrink-0">
                            {p.name?.[0]?.toUpperCase() || 'P'}
                          </div>
                          <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {p.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs shrink-0">
                          {isHost ? (
                            <button
                              type="button"
                              onClick={() => handleToggleWbPermission(p.userId)}
                              className={`px-2 py-1 rounded-[8px] text-[10px] font-bold transition cursor-pointer ${
                                wbAllowedUserIds.includes(p.userId)
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-red-500/20 hover:text-red-400'
                                  : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-main)] hover:border-[var(--accent-color)]'
                              }`}
                              title={
                                wbAllowedUserIds.includes(p.userId)
                                  ? 'Click to Revoke Whiteboard Write Access'
                                  : 'Click to Grant Whiteboard Write Access'
                              }
                            >
                              {wbAllowedUserIds.includes(p.userId) ? '✏️ Granted' : '+ Allow Draw'}
                            </button>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-primary)] border border-[var(--border-main)] text-[var(--text-secondary)]">
                              {wbAllowedUserIds.includes(p.userId) ? '✏️ Draw' : '🔒 View'}
                            </span>
                          )}
                          {!p.audioOn ? <span>🔇</span> : <span>🎙️</span>}
                          {!p.videoOn ? <span>📷</span> : <span>📹</span>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 2. IN-MEETING CHAT PANEL */}
            {activeSidePanel === 'chat' && (
              <MeetChatPanel
                messages={meetMessages}
                currentUserId={currentUserId}
                onSendMessage={handleSendMeetMessage}
                onClose={() => setActiveSidePanel(null)}
              />
            )}

            {/* 3. IN-MEETING RESOURCES & DOCUMENTS PANEL */}
            {activeSidePanel === 'resources' && (
              <div className="w-full md:w-80 h-full flex flex-col bg-[var(--bg-secondary)] border-l border-[var(--border-main)] p-3 sm:p-4 animate-fadeIn shadow-2xl z-40 overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-2.5 mb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📁</span>
                    <div>
                      <h3 className="section-title text-sm font-bold text-[var(--text-primary)]">Meeting Resources</h3>
                      <p className="caption-text text-[11px] text-[var(--text-muted)]">Live meeting documents & files</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSidePanel(null)}
                    className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-3 shrink-0">
                  <FileUploadZone
                    api={api}
                    moduleName="meet"
                    meetId={upperRoomCode}
                    compact
                    onUploadSuccess={(newDocs) => {
                      setMeetDocuments((prev) => [...newDocs, ...prev])
                    }}
                  />
                </div>

                <div className="mb-3 shrink-0">
                  <input
                    type="text"
                    value={meetDocSearch}
                    onChange={(e) => setMeetDocSearch(e.target.value)}
                    placeholder="Search resources..."
                    className="saas-input py-1.5 px-3 text-xs w-full"
                  />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 custom-scrollbar pr-0.5">
                  {meetDocuments.filter((d) => {
                    if (!meetDocSearch.trim()) return true
                    const q = meetDocSearch.toLowerCase().trim()
                    return (
                      (d.originalName || d.filename || '').toLowerCase().includes(q) ||
                      (d.uploaderName || '').toLowerCase().includes(q)
                    )
                  }).length > 0 ? (
                    meetDocuments.filter((d) => {
                      if (!meetDocSearch.trim()) return true
                      const q = meetDocSearch.toLowerCase().trim()
                      return (
                        (d.originalName || d.filename || '').toLowerCase().includes(q) ||
                        (d.uploaderName || '').toLowerCase().includes(q)
                      )
                    }).map((doc) => (
                      <FileCard
                        key={doc._id || doc.id}
                        file={doc}
                        compact
                        onPreview={setPreviewFile}
                        onDelete={handleDeleteMeetDocument}
                        canDelete={isHost || doc.uploadedBy?._id === currentUserId || doc.uploadedBy === currentUserId}
                      />
                    ))
                  ) : (
                    <div className="flex h-32 items-center justify-center">
                      <p className="text-xs text-[var(--text-muted)] italic text-center">No meeting resources shared yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FULL SCREEN WHITEBOARD OVERLAY (Fills Full Available Vertical Space) */}
        {activeSidePanel === 'whiteboard' && (
          <div className="absolute inset-0 z-40 flex flex-col bg-slate-950 p-1 sm:p-2 animate-fadeIn w-full h-full min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 flex flex-col bg-slate-900 overflow-hidden rounded-[16px] border border-slate-800 shadow-2xl w-full h-full">
              {/* Whiteboard Header Toolbar (Slim, Pinned to Top) */}
              <div className="flex-none flex items-center justify-between gap-1.5 border-b border-[var(--border-main)] bg-[var(--bg-secondary)] p-1.5 sm:p-2 z-20 overflow-x-auto no-scrollbar custom-scrollbar">
                {/* Left Tools Group: Pen / Text / Eraser + Shapes */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setWbTool('pen')}
                    disabled={!canDraw}
                    className={`px-2 py-1 rounded-[8px] text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                      wbTool === 'pen'
                        ? 'bg-[var(--accent-color)] text-black font-extrabold'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-main)]'
                    }`}
                    title="Pen Tool"
                  >
                    <span>✏️</span>
                    <span className="hidden md:inline ml-1">Pen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWbTool('text')}
                    disabled={!canDraw}
                    className={`px-2 py-1 rounded-[8px] text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                      wbTool === 'text'
                        ? 'bg-[var(--accent-color)] text-black font-extrabold'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-main)]'
                    }`}
                    title="Text Tool"
                  >
                    <span>🔤</span>
                    <span className="hidden md:inline ml-1">Text</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWbTool('eraser')}
                    disabled={!canDraw}
                    className={`px-2 py-1 rounded-[8px] text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                      wbTool === 'eraser'
                        ? 'bg-[var(--accent-color)] text-black font-extrabold'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-main)]'
                    }`}
                    title="Eraser Tool"
                  >
                    <span>🧹</span>
                    <span className="hidden md:inline ml-1">Eraser</span>
                  </button>

                  {/* Shape Tools */}
                  <div className="flex items-center gap-0.5 border-l border-[var(--border-main)] pl-1 ml-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setWbTool('line')}
                      disabled={!canDraw}
                      className={`p-1 rounded-[6px] text-xs font-bold transition cursor-pointer disabled:opacity-40 ${
                        wbTool === 'line' ? 'bg-[var(--accent-color)] text-black' : 'hover:bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                      }`}
                      title="Line Tool"
                    >
                      📏
                    </button>
                    <button
                      type="button"
                      onClick={() => setWbTool('rect')}
                      disabled={!canDraw}
                      className={`p-1 rounded-[6px] text-xs font-bold transition cursor-pointer disabled:opacity-40 ${
                        wbTool === 'rect' ? 'bg-[var(--accent-color)] text-black' : 'hover:bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                      }`}
                      title="Rectangle Tool"
                    >
                      🔲
                    </button>
                    <button
                      type="button"
                      onClick={() => setWbTool('ellipse')}
                      disabled={!canDraw}
                      className={`p-1 rounded-[6px] text-xs font-bold transition cursor-pointer disabled:opacity-40 ${
                        wbTool === 'ellipse' ? 'bg-[var(--accent-color)] text-black' : 'hover:bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                      }`}
                      title="Ellipse Tool"
                    >
                      ⭕
                    </button>
                    <button
                      type="button"
                      onClick={() => setWbTool('arrow')}
                      disabled={!canDraw}
                      className={`p-1 rounded-[6px] text-xs font-bold transition cursor-pointer disabled:opacity-40 ${
                        wbTool === 'arrow' ? 'bg-[var(--accent-color)] text-black' : 'hover:bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                      }`}
                      title="Arrow Tool"
                    >
                      ➔
                    </button>
                  </div>
                </div>

                {/* Center Status / Host Permission Popover Toggle */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {!canDraw ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                      🔒 <span className="hidden sm:inline">Read-Only</span>
                    </span>
                  ) : !isHost ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                      ✏️ <span className="hidden sm:inline">Drawing Granted</span>
                    </span>
                  ) : null}

                  {isHost && (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowWbPermPopover((prev) => !prev)}
                        className="px-2 py-1 rounded-[8px] text-[11px] sm:text-xs font-bold bg-[var(--accent-color)] text-black flex items-center gap-1 cursor-pointer hover:opacity-90 transition shrink-0"
                      >
                        <span>✏️ Perms ({wbAllowedUserIds.length})</span>
                      </button>
                      {showWbPermPopover && (
                        <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 top-9 w-64 p-3 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-[14px] shadow-2xl z-50 space-y-2">
                          <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-main)]">
                            <span className="text-xs font-bold text-[var(--text-primary)]">
                              Whiteboard Access
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowWbPermPopover(false)}
                              className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar">
                            {participants
                              .filter((p) => p.userId !== currentUserId)
                              .map((p) => {
                                const isAllowed = wbAllowedUserIds.includes(p.userId)
                                return (
                                  <div
                                    key={p.userId}
                                    className="flex items-center justify-between p-1.5 rounded-[8px] bg-[var(--bg-secondary)] text-xs border border-[var(--border-main)]"
                                  >
                                    <span className="truncate font-medium text-[var(--text-primary)] max-w-[120px]">
                                      {p.name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleWbPermission(p.userId)}
                                      className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold cursor-pointer transition ${
                                        isAllowed
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-red-500/20 hover:text-red-400'
                                          : 'bg-[var(--bg-primary)] border border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                      }`}
                                    >
                                      {isAllowed ? '✓ Allowed' : '+ Allow'}
                                    </button>
                                  </div>
                                )
                              })}
                            {participants.filter((p) => p.userId !== currentUserId).length === 0 && (
                              <p className="text-[11px] text-[var(--text-muted)] italic text-center py-1">
                                No other participants in room
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {canDraw && (
                    <>
                      {wbTool === 'eraser' ? (
                        <select
                          value={wbEraserWidth}
                          onChange={(e) => setWbEraserWidth(Number(e.target.value))}
                          className="saas-input text-[11px] py-0.5 px-1 bg-[var(--bg-primary)] cursor-pointer"
                          title="Eraser Size"
                        >
                          <option value={15}>15px</option>
                          <option value={30}>30px</option>
                          <option value={50}>50px</option>
                        </select>
                      ) : (
                        <>
                          <select
                            value={wbWidth}
                            onChange={(e) => setWbWidth(Number(e.target.value))}
                            className="saas-input text-[11px] py-0.5 px-1 bg-[var(--bg-primary)] cursor-pointer"
                            title="Pen Thickness"
                          >
                            <option value={2}>2px</option>
                            <option value={4}>4px</option>
                            <option value={8}>8px</option>
                          </select>

                          <div className="flex items-center gap-0.5">
                            {COLOR_SWATCHES.slice(0, 5).map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setWbColor(c)}
                                style={{ backgroundColor: c }}
                                className={`h-4 w-4 rounded-full border border-black/30 transition transform hover:scale-110 cursor-pointer ${
                                  wbColor === c ? 'ring-2 ring-[var(--accent-color)] scale-110' : ''
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {isHost && (
                    <button
                      type="button"
                      onClick={handleClearBoard}
                      className="px-2 py-1 rounded-[6px] text-[10px] font-bold bg-[var(--error-bg)] text-[var(--error-color)] border border-[var(--error-color)]/30 hover:opacity-80 transition cursor-pointer shrink-0"
                      title="Clear whiteboard for everyone"
                    >
                      Clear
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleToggleWhiteboard}
                    className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
                    title="Close Whiteboard"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Canvas Workspace Container: Flex-1 Min-H-0 to fill ALL remaining vertical space */}
              <div
                ref={canvasContainerRef}
                className={`relative flex-1 min-h-0 w-full h-full bg-slate-900 overflow-hidden ${
                  canDraw ? 'cursor-crosshair' : 'cursor-not-allowed'
                }`}
              >
                {!canDraw && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-black/80 border border-amber-500/50 text-amber-300 text-xs font-semibold shadow-lg backdrop-blur-md pointer-events-none flex items-center gap-1.5">
                    <span>🔒 View-Only Mode</span>
                    <span className="text-[10px] text-slate-400">(Host permission required to draw)</span>
                  </div>
                )}

                {/* NEW FEATURE 2: Visible Circular Eraser Cursor Preview */}
                {wbTool === 'eraser' && eraserCursor.visible && (
                  <div
                    style={{
                      left: `${eraserCursor.x}px`,
                      top: `${eraserCursor.y}px`,
                      width: `${wbEraserWidth}px`,
                      height: `${wbEraserWidth}px`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    className="absolute z-30 pointer-events-none rounded-full border-2 border-red-500 bg-red-500/20 shadow-md"
                  />
                )}

                <canvas
                  ref={canvasRef}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerCancel={handleCanvasPointerUp}
                  onPointerLeave={handleCanvasPointerUp}
                  className="touch-none w-full h-full block"
                />

                {/* Floating Text Input Box */}
                {textInput.open && canDraw && (
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
                      className="saas-input text-xs py-1 px-2 bg-slate-900 min-w-[120px]"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 text-xs font-bold bg-[var(--accent-color)] text-black rounded-[6px]"
                    >
                      Add
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM CUSTOM CONTROL BAR (Fixed Bottom, Always Visible on Laptop, Auto-Hides on Mobile Only) */}
      <div
        className={`flex-none border-t border-[var(--border-main)] bg-[var(--bg-surface)] p-2 sm:p-3 z-30 relative transition-all duration-300 ease-in-out max-w-full overflow-hidden overflow-x-hidden ${
          showControls ? 'opacity-100 translate-y-0' : 'max-md:opacity-0 max-md:translate-y-full max-md:pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-1 sm:gap-2 max-w-[1280px] mx-auto w-full">
          {/* Left Media Group: Mic & Camera */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 h-10 w-10 sm:h-auto sm:w-auto min-h-[40px] rounded-[14px] font-bold text-xs shadow-xs transition cursor-pointer shrink-0 ${
                audioEnabled
                  ? 'bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
                  : 'bg-[var(--error-color)] text-white'
              }`}
              title={audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              <span className="text-sm">{audioEnabled ? '🎙️' : '🔇'}</span>
              <span className="hidden md:inline">{audioEnabled ? 'Mute' : 'Unmute'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleVideo}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 h-10 w-10 sm:h-auto sm:w-auto min-h-[40px] rounded-[14px] font-bold text-xs shadow-xs transition cursor-pointer shrink-0 ${
                videoEnabled
                  ? 'bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
                  : 'bg-[var(--error-color)] text-white'
              }`}
              title={videoEnabled ? 'Stop Video' : 'Start Video'}
            >
              <span className="text-sm">{videoEnabled ? '📹' : '📷'}</span>
              <span className="hidden md:inline">{videoEnabled ? 'Stop Video' : 'Start Video'}</span>
            </button>
          </div>

          {/* Center Collaboration Tools Group */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 h-10 w-10 sm:h-auto sm:w-auto min-h-[40px] rounded-[14px] font-bold text-xs bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)] transition cursor-pointer shrink-0"
              title="Invite Peers"
            >
              <span className="text-sm">🔗</span>
              <span className="hidden md:inline">Invite</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSidePanel((prev) => (prev === 'participants' ? null : 'participants'))}
              className={`flex items-center justify-center gap-1 px-2.5 sm:px-3.5 py-2 sm:py-2.5 h-10 min-w-[40px] sm:h-auto sm:w-auto min-h-[40px] rounded-[14px] font-bold text-xs border transition cursor-pointer shrink-0 ${
                activeSidePanel === 'participants'
                  ? 'bg-[var(--accent-color)] text-black border-transparent font-extrabold'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
              }`}
              title="Toggle Participants Panel"
            >
              <span className="text-sm">👥</span>
              <span className="text-xs font-bold">{allParticipantCount}</span>
            </button>

            {/* In-Meeting Chat Trigger */}
            <button
              type="button"
              onClick={() => setActiveSidePanel((prev) => (prev === 'chat' ? null : 'chat'))}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 h-10 w-10 sm:h-auto sm:w-auto min-h-[40px] rounded-[14px] font-bold text-xs border transition cursor-pointer shrink-0 ${
                activeSidePanel === 'chat'
                  ? 'bg-[var(--accent-color)] text-black border-transparent font-extrabold'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
              }`}
              title="Toggle Chat Panel"
            >
              <span className="text-sm">💬</span>
              <span className="hidden md:inline">Chat</span>
            </button>

            {/* Meeting Resources & Files Panel Toggle */}
            <button
              type="button"
              onClick={() => setActiveSidePanel((prev) => (prev === 'resources' ? null : 'resources'))}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 h-10 w-10 sm:h-auto sm:w-auto min-h-[40px] rounded-[14px] font-bold text-xs border transition cursor-pointer shrink-0 ${
                activeSidePanel === 'resources'
                  ? 'bg-[var(--accent-color)] text-black border-transparent font-extrabold'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
              }`}
              title="Meeting Resources & Documents"
            >
              <span className="text-sm">📁</span>
              <span className="hidden md:inline">Resources</span>
            </button>

            {/* Share Screen Button */}
            <button
              type="button"
              onClick={handleToggleScreenShare}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 h-10 w-10 sm:h-auto sm:w-auto min-h-[40px] rounded-[14px] font-bold text-xs border transition cursor-pointer shrink-0 ${
                isSharingScreen
                  ? 'bg-amber-500 text-black border-transparent font-extrabold shadow-md'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
              }`}
              title={isSharingScreen ? 'Stop Sharing Screen' : 'Share Screen'}
            >
              <span className="text-sm">💻</span>
              <span className="hidden md:inline">{isSharingScreen ? 'Stop Share' : 'Share Screen'}</span>
            </button>

            {/* Whiteboard Toggle */}
            <button
              type="button"
              onClick={handleToggleWhiteboard}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 h-10 w-10 sm:h-auto sm:w-auto min-h-[40px] rounded-[14px] font-bold text-xs border transition cursor-pointer shrink-0 ${
                activeSidePanel === 'whiteboard'
                  ? 'bg-[var(--accent-color)] text-black border-transparent font-extrabold'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
              }`}
              title="Toggle Whiteboard"
            >
              <span className="text-sm">🎨</span>
              <span className="hidden md:inline">Whiteboard</span>
            </button>

            {/* Desktop Reactions Trigger */}
            <div className="hidden sm:block relative reaction-picker-container shrink-0">
              <button
                type="button"
                onClick={() => setShowReactionsPicker((prev) => !prev)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] rounded-[14px] font-bold text-xs border transition cursor-pointer ${
                  showReactionsPicker
                    ? 'bg-[var(--accent-color)] text-black border-transparent font-extrabold shadow-md scale-105'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-main)] text-[var(--text-primary)] hover:border-[var(--accent-color)]'
                }`}
                title="Send Reactions"
              >
                <span className="text-sm">😊</span>
                <span className="hidden md:inline">Reactions</span>
              </button>

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

            {/* Mobile "More" (•••) Sheet Popover Toggle (BUG 3 Fix: Zero Horizontal Scroll) */}
            <div className="sm:hidden relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                className={`flex items-center justify-center h-10 w-10 min-h-[40px] rounded-[14px] font-extrabold text-sm border transition cursor-pointer ${
                  showMoreMenu
                    ? 'bg-[var(--accent-color)] text-black border-transparent'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-main)] text-[var(--text-primary)]'
                }`}
                title="More Options"
              >
                •••
              </button>

              {showMoreMenu && (
                <div className="fixed bottom-16 right-3 w-56 p-2 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-[16px] shadow-2xl z-50 space-y-1 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReactionsPicker(true)
                      setShowMoreMenu(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-[10px] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                  >
                    <span>😊 Send Reactions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleScreenShare()
                      setShowMoreMenu(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-[10px] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                  >
                    <span>💻 {isSharingScreen ? 'Stop Share' : 'Share Screen'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenShareGroupModal()
                      setShowMoreMenu(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-[10px] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                  >
                    <span>📢 Share to Group</span>
                  </button>
                  {isHost && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmEndModal(true)
                        setShowMoreMenu(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-[10px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <span>⚠️ End Meeting</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Edge: Red End / Leave Button */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLeaveCall}
              className="px-3 sm:px-4 py-2 sm:py-2.5 h-10 sm:h-auto min-h-[40px] rounded-[14px] font-bold text-xs bg-[var(--error-bg)] text-[var(--error-color)] border border-[var(--error-color)]/30 hover:opacity-90 transition cursor-pointer shadow-xs shrink-0"
            >
              Leave
            </button>

            {isHost && (
              <button
                type="button"
                onClick={() => setConfirmEndModal(true)}
                className="hidden sm:inline-block px-3.5 sm:px-4 py-2 sm:py-2.5 min-h-[40px] rounded-[14px] font-extrabold text-xs bg-[var(--error-color)] text-white hover:opacity-90 transition cursor-pointer shadow-md shrink-0"
              >
                End
              </button>
            )}
          </div>
        </div>
      </div>

      {/* INVITE MODAL */}
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

      {/* SHARE TO STUDY GROUP MODAL */}
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

      {/* INCOMING MEETING CHAT TOAST NOTIFICATIONS (Bottom-Right) */}
      {chatToasts.length > 0 && activeSidePanel !== 'chat' && (
        <div className="fixed bottom-20 right-6 z-50 flex flex-col gap-2.5 max-w-xs sm:max-w-sm w-full pointer-events-none">
          {chatToasts.map((toast) => {
            const initial = (toast.name?.[0] || 'U').toUpperCase()
            const formattedTime = new Date(toast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

            return (
              <div
                key={toast.id}
                onClick={() => {
                  setActiveSidePanel('chat')
                  setChatToasts([])
                }}
                className="pointer-events-auto cursor-pointer p-3.5 rounded-[18px] bg-white text-black border-2 border-[var(--accent-color)] backdrop-blur-md shadow-2xl transition-all duration-300 hover:scale-[1.02] flex items-start gap-3 animate-toastSlideUp group"
              >
                {/* Avatar / Profile Picture */}
                <div className="relative shrink-0">
                  {toast.avatar ? (
                    <img src={toast.avatar} alt={toast.name} className="h-9 w-9 rounded-full object-cover border border-slate-300 shadow-xs" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-slate-950 text-[var(--accent-color)] font-black flex items-center justify-center text-xs shadow-xs">
                      {initial}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-color)] text-black text-[9px] font-bold shadow-xs">
                    💬
                  </span>
                </div>

                {/* Content Preview */}
                <div className="min-w-0 flex-1 text-black">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-black truncate">
                      {toast.name}
                    </p>
                    <span className="text-[10px] text-slate-700 shrink-0 font-bold">
                      {formattedTime}
                    </span>
                  </div>
                  <p className="text-xs text-black font-semibold mt-0.5 line-clamp-2 leading-relaxed break-words">
                    {toast.message}
                  </p>
                </div>

                {/* Close / Dismiss Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setChatToasts((prev) => prev.filter((t) => t.id !== toast.id))
                  }}
                  className="text-slate-800 hover:text-black font-black text-xs p-1 rounded-full hover:bg-slate-200 transition shrink-0 cursor-pointer"
                  title="Dismiss notification"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Global Reaction Emoji Picker Popover (Desktop & Mobile Unified) */}
      {showReactionsPicker && (
        <>
          <div
            onClick={() => setShowReactionsPicker(false)}
            className="fixed inset-0 z-[190] bg-black/40 backdrop-blur-xs"
          />
          <div className="fixed bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 bg-[var(--bg-surface)] p-2.5 sm:p-3 rounded-[24px] border-2 border-[var(--accent-color)] shadow-2xl z-[200] animate-fadeIn max-w-[95vw] overflow-x-auto">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendReaction(emoji)}
                className="p-2 sm:p-3 hover:bg-[var(--bg-secondary)] hover:scale-125 rounded-[14px] text-2xl sm:text-3xl transition transform active:scale-150 cursor-pointer shrink-0"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  )
}
