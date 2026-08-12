import { useState, useEffect, useRef, useMemo } from 'react'
import MarkdownRenderer from '../components/MarkdownRenderer.jsx'
import CopyButton from '../components/CopyButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import AIChatSurface from '../components/AIChatSurface.jsx'
import FileCard from '../components/FileCard.jsx'
import FileUploadZone from '../components/FileUploadZone.jsx'
import FilePreviewModal from '../components/FilePreviewModal.jsx'
import getSocket from '../api/socket.js'

const MAX_MEMBERS = 70

function getUniqueMembers(members = []) {
  if (!Array.isArray(members)) return []
  const map = new Map()
  for (const m of members) {
    if (!m) continue
    const id = (m._id || m).toString()
    if (!map.has(id)) {
      map.set(id, m)
    }
  }
  return Array.from(map.values())
}

function GroupChatAI({ groupId, api, onShareToGroup }) {
  const [messages, setMessages] = useState(() => {
    if (typeof window === 'undefined') return [
      {
        role: 'assistant',
        content: 'Hi! I can help explain concepts from your group discussion, generate notes, or suggest study materials.'
      }
    ]

    const saved = window.localStorage.getItem(`catalyst_group_ai_history:${groupId}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      } catch {
        // ignore invalid stored history
      }
    }

    return [
      {
        role: 'assistant',
        content: 'Hi! I can help explain concepts from your group discussion, generate notes, or suggest study materials.'
      }
    ]
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(`catalyst_group_ai_history:${groupId}`, JSON.stringify(messages))
    } catch {
      // ignore storage errors
    }
  }, [groupId, messages])

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-4 shadow-glow sm:p-6">
      <AIChatSurface
        api={api}
        messages={messages}
        setMessages={setMessages}
        storageKey={null}
        welcomeMessage="Hi! I am your group study companion. Ask me anything, or share explanations directly with the group chat!"
        title="AI Study Assistant"
        subtitle="Group companion"
        placeholder="Ask the AI a question..."
        className="h-full"
        showHeader
        onShareToGroup={onShareToGroup}
      />
    </div>
  )
}

export default function StudyGroupPage() {
  const { api, user } = useAuth()
  const { sendInvite, subscribeGroupJoined } = useNotifications()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [incomingRequests, setIncomingRequests] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [onlineMembers, setOnlineMembers] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteResults, setInviteResults] = useState([])
  const [inviting, setInviting] = useState(false)
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [renameDraft, setRenameDraft] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [isEditingGroupName, setIsEditingGroupName] = useState(false)
  const [showSettingsPopover, setShowSettingsPopover] = useState(false)
  const [copiedToast, setCopiedToast] = useState(false)
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasUnreadNew, setHasUnreadNew] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, groupId: null, groupName: '' })
  const [activeActionMsg, setActiveActionMsg] = useState(null)

  // Group Documents Management State
  const [groupDocuments, setGroupDocuments] = useState([])
  const [showGroupDocsModal, setShowGroupDocsModal] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [groupDocSearch, setGroupDocSearch] = useState('')
  const [showAttachUpload, setShowAttachUpload] = useState(false)

  const handleDeleteGroupDocument = async (file) => {
    try {
      await api.delete(`/documents/${file._id || file.id}`)
      setGroupDocuments((prev) => prev.filter((d) => (d._id || d.id) !== (file._id || file.id)))
    } catch {
      // Ignored
    }
  }

  const messagesEndRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const longPressTimerRef = useRef(null)

  const handleTouchStartMsg = (msg) => {
    longPressTimerRef.current = setTimeout(() => {
      setActiveActionMsg(msg)
    }, 450)
  }

  const handleTouchEndMsg = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
    }
  }

  const handleContextMenuMsg = (e, msg) => {
    e.preventDefault()
    setActiveActionMsg(msg)
  }

  const handleDeleteForMe = async (msgId) => {
    if (!selectedGroupId || !msgId) return
    setActiveActionMsg(null)
    setMessages((prev) => prev.filter((m) => m._id !== msgId))
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('delete_message', { groupId: selectedGroupId, messageId: msgId, deleteType: 'me' })
    }
    try {
      await api.delete(`/study-groups/groups/${selectedGroupId}/messages/${msgId}?deleteType=me`)
    } catch {
      // Ignored
    }
  }

  const handleDeleteForEveryone = async (msgId) => {
    if (!selectedGroupId || !msgId) return
    setActiveActionMsg(null)
    setMessages((prev) =>
      prev.map((m) =>
        m._id === msgId ? { ...m, isDeleted: true, deletedForEveryone: true, message: 'This message was deleted.' } : m
      )
    )
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('delete_message', { groupId: selectedGroupId, messageId: msgId, deleteType: 'everyone' })
    }
    try {
      await api.delete(`/study-groups/groups/${selectedGroupId}/messages/${msgId}?deleteType=everyone`)
    } catch {
      // Ignored
    }
  }

  const executeConfirmAction = async () => {
    if (!confirmModal.groupId) return
    const { type, groupId, groupName } = confirmModal
    setStatus('')
    setError('')

    try {
      if (type === 'delete') {
        await api.delete(`/study-groups/groups/${groupId}`)
        setStatus(`Study group "${groupName || 'Group'}" deleted successfully.`)
      } else {
        await api.post(`/study-groups/groups/${groupId}/leave`)
        setStatus(`Left study group "${groupName || 'Group'}" successfully.`)
      }
      setGroups((prev) => prev.filter((g) => g._id !== groupId))
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null)
      }
      clearTransientMessage()
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${type} group`)
    } finally {
      setConfirmModal({ open: false, type: null, groupId: null, groupName: '' })
    }
  }

  const selectedGroup = useMemo(
    () => groups.find((group) => group._id === selectedGroupId) || null,
    [groups, selectedGroupId]
  )

  const uniqueGroupMembers = useMemo(
    () => getUniqueMembers(selectedGroup?.members),
    [selectedGroup?.members]
  )

  const currentUserId = (user?.id || user?._id || '').toString()
  const hostUserId = (selectedGroup?.createdBy?._id || selectedGroup?.createdBy || '').toString()
  const isCurrentHost = Boolean(currentUserId && hostUserId && currentUserId === hostUserId)

  const handleTransferHost = async (targetMemberId, targetMemberName) => {
    if (!selectedGroupId || !targetMemberId) return
    setStatus('')
    setError('')
    try {
      const res = await api.post(`/study-groups/groups/${selectedGroupId}/transfer-host`, { newHostId: targetMemberId })
      setStatus(`👑 Host role transferred to ${targetMemberName}!`)
      if (res.data?.group) {
        setGroups((prev) => prev.map((g) => (g._id === selectedGroupId ? res.data.group : g)))
      }
      clearTransientMessage()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to transfer Host role')
    }
  }

  const handleRemoveMember = async (targetMemberId, targetMemberName) => {
    if (!selectedGroupId || !targetMemberId) return
    setStatus('')
    setError('')
    try {
      const res = await api.post(`/study-groups/groups/${selectedGroupId}/remove-member`, { userId: targetMemberId })
      setStatus(`🚫 Removed ${targetMemberName} from group.`)
      if (res.data?.group) {
        setGroups((prev) => prev.map((g) => (g._id === selectedGroupId ? res.data.group : g)))
      }
      clearTransientMessage()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove member')
    }
  }

  const scrollToBottom = (behavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior
      })
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior })
    }
  }

  const isNearBottom = () => {
    const container = scrollContainerRef.current
    if (!container) return true
    const threshold = 120
    return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold
  }

  useEffect(() => {
    async function loadInitialData() {
      try {
        const groupsResp = await api.get('/study-groups/groups')
        setGroups(groupsResp.data)
      } catch (err) {
        setError('Unable to load study group dashboard')
      }
    }
    loadInitialData()
  }, [api])

  useEffect(() => {
    if (!subscribeGroupJoined) return
    const unsubscribe = subscribeGroupJoined((newGroup) => {
      if (newGroup?._id) {
        setGroups((prev) => {
          if (prev.some((g) => g._id === newGroup._id)) {
            return prev.map((g) => (g._id === newGroup._id ? newGroup : g))
          }
          return [...prev, newGroup]
        })
        setStatus(`Joined "${newGroup.groupName || 'Study Group'}"!`)
        clearTransientMessage()
      } else {
        api.get('/study-groups/groups').then((res) => setGroups(res.data)).catch(() => {})
      }
    })
    return () => unsubscribe()
  }, [subscribeGroupJoined, api])

  useEffect(() => {
    const unsubscribe = subscribeGroupJoined((newGroup) => {
      if (!newGroup) return
      setGroups((prev) => {
        if (prev.some((g) => g._id === newGroup._id)) {
          return prev.map((g) => (g._id === newGroup._id ? newGroup : g))
        }
        return [...prev, newGroup]
      })
      setSelectedGroupId((prev) => prev || newGroup._id)
    })
    return unsubscribe
  }, [subscribeGroupJoined])

  const loadOlderMessages = async () => {
    if (loadingOlder || !hasMoreMessages || !selectedGroupId || messages.length === 0) return

    const container = scrollContainerRef.current
    if (!container) return

    const oldestMsg = messages[0]
    if (!oldestMsg || !oldestMsg._id) return

    setLoadingOlder(true)
    const oldScrollHeight = container.scrollHeight
    const oldScrollTop = container.scrollTop

    try {
      const response = await api.get(`/study-groups/groups/${selectedGroupId}/messages`, {
        params: { limit: 30, before: oldestMsg._id }
      })
      const older = response.data || []
      if (older.length < 30) {
        setHasMoreMessages(false)
      }

      if (older.length > 0) {
        setMessages((prev) => {
          const prevIds = new Set(prev.map((m) => m._id))
          const filteredNew = older.filter((m) => !prevIds.has(m._id))
          return [...filteredNew, ...prev]
        })

        // Preserve scroll position without jumping
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight
            container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight)
          }
        })
      }
    } catch {
      // Keep UI intact on transient network error
    } finally {
      setLoadingOlder(false)
    }
  }

  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return

    if (container.scrollTop <= 60 && hasMoreMessages && !loadingOlder) {
      loadOlderMessages()
    }

    if (isNearBottom()) {
      setHasUnreadNew(false)
      setShowScrollToBottom(false)
    } else {
      setShowScrollToBottom(true)
    }
  }

  // Socket & Group Messages Lifecycle
  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([])
      setOnlineMembers([])
      setTypingUsers([])
      setHasMoreMessages(true)
      setHasUnreadNew(false)
      return
    }

    // 1. Fetch initial message history & documents via REST
    async function loadMessagesAndDocs() {
      try {
        const [msgsResp, docsResp] = await Promise.all([
          api.get(`/study-groups/groups/${selectedGroupId}/messages`, { params: { limit: 35 } }),
          api.get('/documents', { params: { module: 'group', groupId: selectedGroupId } })
        ])
        const initialMsgs = msgsResp.data || []
        setMessages(initialMsgs)
        setGroupDocuments(docsResp.data || [])
        setHasMoreMessages(initialMsgs.length >= 35)
        setHasUnreadNew(false)
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
          }
        })
      } catch (err) {
        setError('Unable to load group messages')
      }
    }
    loadMessagesAndDocs()

    // 2. Connect socket and join group
    const socket = getSocket()
    if (!socket) return

    if (!socket.connected) {
      socket.connect()
    }

    socket.emit('join_group', { groupId: selectedGroupId })

    // Auto-rejoin on socket reconnect
    const handleConnect = () => {
      socket.emit('join_group', { groupId: selectedGroupId })
    }

    // Single source of message updates - dedupe & resolve optimistic messages
    const handleReceiveMessage = (newMessage) => {
      const senderId = newMessage.sender?._id || newMessage.sender
      const currentId = (user?.id || user?._id || '').toString()
      const isSelf = senderId?.toString() === currentId

      setMessages((prev) => {
        const matchIndex = prev.findIndex((m) => m._id === newMessage._id || (m.isOptimistic && m.message === newMessage.message))
        if (matchIndex !== -1) {
          const updated = [...prev]
          updated[matchIndex] = newMessage
          return updated
        }
        return [...prev, newMessage]
      })

      if (isSelf || isNearBottom()) {
        requestAnimationFrame(() => {
          scrollToBottom('smooth')
          setHasUnreadNew(false)
        })
      } else {
        setHasUnreadNew(true)
      }
    }

    // Presence update
    const handlePresenceUpdate = (users) => {
      setOnlineMembers(users || [])
    }

    const handleMemberJoined = ({ groupId }) => {
      api.get('/study-groups/groups').then((res) => {
        setGroups(res.data)
      }).catch(() => {})
    }

    const handleMemberLeft = ({ groupId }) => {
      api.get('/study-groups/groups').then((res) => {
        setGroups(res.data)
      }).catch(() => {})
    }

    const handleGroupUpdated = (updatedGroup) => {
      if (!updatedGroup?._id) return
      setGroups((prev) => {
        if (prev.some((g) => g._id === updatedGroup._id)) {
          return prev.map((g) => (g._id === updatedGroup._id ? updatedGroup : g))
        }
        return [...prev, updatedGroup]
      })
    }

    const handleHostChanged = ({ groupId, newHostName }) => {
      api.get('/study-groups/groups').then((res) => {
        setGroups(res.data)
      }).catch(() => {})
    }

    const handleMemberRemoved = ({ userId, groupId }) => {
      const currentId = (user?.id || user?._id || '').toString()
      if (userId === currentId && groupId === selectedGroupId) {
        setSelectedGroupId(null)
        setStatus('You were removed from the study group by the Host.')
      }
      api.get('/study-groups/groups').then((res) => {
        setGroups(res.data)
      }).catch(() => {})
    }

    const handleGroupDeleted = ({ groupId }) => {
      if (groupId === selectedGroupId) {
        setSelectedGroupId(null)
        setStatus('The study group was deleted by the Host.')
      }
      setGroups((prev) => prev.filter((g) => g._id !== groupId))
    }

    // Typing indicators
    const handleUserTyping = (userObj) => {
      setTypingUsers((prev) => {
        if (prev.some((u) => u.userId === userObj.userId)) return prev
        return [...prev, userObj]
      })
    }

    const handleUserStopTyping = (userObj) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userObj.userId))
    }

    const handleMessageDeleted = ({ messageId, deleteType, isDeleted, message: newContent }) => {
      setMessages((prevMsgs) => {
        if (deleteType === 'me') {
          return prevMsgs.filter((m) => m._id !== messageId)
        }
        return prevMsgs.map((m) => {
          if (m._id === messageId) {
            return {
              ...m,
              isDeleted: true,
              deletedForEveryone: true,
              message: newContent || 'This message was deleted.'
            }
          }
          return m
        })
      })
    }

    const handleDocumentUploaded = (doc) => {
      if (doc.groupId === selectedGroupId) {
        setGroupDocuments((prev) => [doc, ...prev.filter((d) => (d._id || d.id) !== (doc._id || doc.id))])
      }
    }

    const handleDocumentDeleted = ({ documentId }) => {
      setGroupDocuments((prev) => prev.filter((d) => (d._id || d.id) !== documentId))
    }

    socket.on('connect', handleConnect)
    socket.on('receive_message', handleReceiveMessage)
    socket.on('message_deleted', handleMessageDeleted)
    socket.on('document_uploaded', handleDocumentUploaded)
    socket.on('document_deleted', handleDocumentDeleted)
    socket.on('presence_update', handlePresenceUpdate)
    socket.on('member_joined', handleMemberJoined)
    socket.on('member_left', handleMemberLeft)
    socket.on('group_updated', handleGroupUpdated)
    socket.on('host_changed', handleHostChanged)
    socket.on('member_removed', handleMemberRemoved)
    socket.on('group_deleted', handleGroupDeleted)
    socket.on('user_typing', handleUserTyping)
    socket.on('user_stop_typing', handleUserStopTyping)

    // Teardown listener cleanup
    return () => {
      socket.emit('leave_group', { groupId: selectedGroupId })
      socket.off('connect', handleConnect)
      socket.off('receive_message', handleReceiveMessage)
      socket.off('message_deleted', handleMessageDeleted)
      socket.off('document_uploaded', handleDocumentUploaded)
      socket.off('document_deleted', handleDocumentDeleted)
      socket.off('presence_update', handlePresenceUpdate)
      socket.off('member_joined', handleMemberJoined)
      socket.off('member_left', handleMemberLeft)
      socket.off('group_updated', handleGroupUpdated)
      socket.off('host_changed', handleHostChanged)
      socket.off('member_removed', handleMemberRemoved)
      socket.off('group_deleted', handleGroupDeleted)
      socket.off('user_typing', handleUserTyping)
      socket.off('user_stop_typing', handleUserStopTyping)
    }
  }, [api, selectedGroupId, user])

  const refreshDashboard = async () => {
    try {
      const [groupsResp, requestsResp] = await Promise.all([
        api.get('/study-groups/groups'),
        api.get('/study-groups/requests/incoming')
      ])
      setGroups(groupsResp.data)
      setIncomingRequests(requestsResp.data)
    } catch (err) {
      setError('Unable to refresh dashboard')
    }
  }

  const clearTransientMessage = () => {
    window.setTimeout(() => {
      setStatus('')
      setError('')
    }, 3000)
  }

  const handleSearch = async (event) => {
    event.preventDefault()
    setStatus('')
    setError('')
    if (!query.trim()) return

    try {
      const response = await api.get('/study-groups/users', { params: { q: query.trim() } })
      setSearchResults(response.data)
    } catch (err) {
      setError('Search failed')
    }
  }

  const sendRequest = async (receiverId) => {
    setStatus('')
    setError('')
    try {
      await api.post('/study-groups/requests', { receiverId })
      setStatus('Study request sent!')
      clearTransientMessage()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send request')
    }
  }

  const respondToRequest = async (requestId, accept) => {
    setStatus('')
    setError('')
    try {
      await api.post(`/study-groups/requests/${requestId}/${accept ? 'accept' : 'reject'}`)
      await refreshDashboard()
      setStatus(accept ? 'Request accepted.' : 'Request rejected.')
      clearTransientMessage()
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to respond to request')
    }
  }

  const [groupSelectedProvider, setGroupSelectedProvider] = useState(() => {
    return localStorage.getItem('ai_provider') || 'gemini'
  })

  const sendMessage = () => {
    if (!messageText.trim() || !selectedGroupId) return

    const trimmed = messageText.trim()
    const tempId = `temp_${Date.now()}_${Math.random()}`

    // 1. Instant Optimistic Local Update (0ms latency response)
    const optimisticMsg = {
      _id: tempId,
      groupId: selectedGroupId,
      sender: { _id: user?.id || user?._id, name: user?.name || 'You', email: user?.email },
      message: trimmed,
      createdAt: new Date().toISOString(),
      isOptimistic: true
    }

    setMessages((prev) => [...prev, optimisticMsg])
    setMessageText('')

    requestAnimationFrame(() => {
      scrollToBottom('smooth')
      setHasUnreadNew(false)
    })

    // Show AI loading indicator if user triggered @ai
    if (trimmed.toLowerCase().includes('@ai')) {
      setIsAiProcessing(true)
      setTimeout(() => setIsAiProcessing(false), 8000)
    }

    // 2. Emit over WebSocket in background
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('send_message', {
        groupId: selectedGroupId,
        message: trimmed,
        provider: groupSelectedProvider
      })
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      socket.emit('stop_typing', { groupId: selectedGroupId })
    }
  }

  const handleInputChange = (event) => {
    const text = event.target.value
    setMessageText(text)

    if (!selectedGroupId) return
    const socket = getSocket()
    if (!socket || !socket.connected) return

    socket.emit('typing', { groupId: selectedGroupId })

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { groupId: selectedGroupId })
    }, 2000)
  }

  const searchInviteUsers = async (event) => {
    event.preventDefault()
    if (!inviteQuery.trim()) return

    try {
      const response = await api.get('/study-groups/users', { params: { q: inviteQuery.trim() } })
      setInviteResults(response.data)
    } catch (err) {
      setError('Invite search failed')
    }
  }

  const inviteToGroup = async (userId) => {
    if (!selectedGroupId) return
    setInviting(true)
    setStatus('')
    setError('')

    try {
      await sendInvite({ groupId: selectedGroupId, targetUserId: userId })
      setStatus('Invite sent! The member will receive it instantly in their notification bell.')
      clearTransientMessage()
      setInviteResults((prev) => prev.filter((u) => u._id !== userId))
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const renameGroup = async () => {
    if (!selectedGroupId || !renameDraft.trim()) return
    setIsRenaming(true)
    setStatus('')
    setError('')

    try {
      const response = await api.patch(`/study-groups/groups/${selectedGroupId}`, { groupName: renameDraft.trim() })
      setGroups((prev) => prev.map((group) => (group._id === selectedGroupId ? response.data : group)))
      setStatus('Group renamed successfully.')
      setRenameDraft('')
      setIsEditingGroupName(false)
      clearTransientMessage()
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to rename group')
    } finally {
      setIsRenaming(false)
    }
  }

  const joinGroupByCode = async (event) => {
    event.preventDefault()
    if (!joinCodeInput.trim()) return
    setStatus('')
    setError('')

    try {
      const response = await api.post('/study-groups/groups/join', { code: joinCodeInput.trim() })
      const nextGroup = response.data
      setGroups((prev) => (prev.some((group) => group._id === nextGroup._id) ? prev.map((group) => (group._id === nextGroup._id ? nextGroup : group)) : [...prev, nextGroup]))
      setJoinCodeInput('')
      setStatus('Joined the group successfully.')
      clearTransientMessage()
      setSelectedGroupId(nextGroup._id)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to join the group')
    }
  }

  return (
    <main className="h-[calc(100vh-90px)] min-h-0 bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden flex flex-col">
      {selectedGroupId && selectedGroup ? (
        <div className="mx-auto flex h-full max-w-[1280px] w-full flex-col p-2 sm:p-4 min-h-0 overflow-hidden space-y-3">
          {/* Compressed Study Group Workspace Header */}
          <div className="flex-none py-2.5 px-3 sm:px-4 rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-surface)] shadow-sm z-30 relative">
            <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {isEditingGroupName && hostUserId === currentUserId ? (
                    <input
                      value={renameDraft}
                      onChange={(event) => setRenameDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          renameGroup()
                        }
                        if (event.key === 'Escape') {
                          setIsEditingGroupName(false)
                          setRenameDraft(selectedGroup.groupName || '')
                        }
                      }}
                      className="saas-input max-w-[240px] min-h-[38px] py-1 text-sm font-bold"
                      autoFocus
                    />
                  ) : (
                    <h1 className="text-base sm:text-xl font-extrabold text-[var(--text-primary)] truncate">{selectedGroup.groupName || 'Study Group'}</h1>
                  )}
                  {hostUserId === currentUserId && !isEditingGroupName && (
                    <button
                      type="button"
                      onClick={() => {
                        setRenameDraft(selectedGroup.groupName || '')
                        setIsEditingGroupName(true)
                      }}
                      className="rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] p-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0"
                      aria-label="Rename group"
                    >
                      ✎
                    </button>
                  )}
                  {isEditingGroupName && hostUserId === currentUserId && (
                    <div className="flex gap-1.5 shrink-0">
                      <button type="button" onClick={renameGroup} disabled={isRenaming} className="saas-button-primary min-h-[34px] px-2.5 text-xs font-bold">
                        {isRenaming ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" onClick={() => { setIsEditingGroupName(false); setRenameDraft(selectedGroup.groupName || '') }} className="saas-button-secondary min-h-[34px] px-2.5 text-xs font-semibold">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-medium text-[var(--text-secondary)]">
                  <span>{uniqueGroupMembers?.length || selectedGroup.members?.length || 0}/{!selectedGroup.maxMembers || selectedGroup.maxMembers <= 15 ? 70 : selectedGroup.maxMembers} Members</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-bold text-[var(--success-color)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--success-color)] animate-pulse" />
                    {onlineMembers.length} Online
                  </span>
                  {hostUserId === currentUserId && (
                    <>
                      <span>•</span>
                      <span className="font-bold text-[var(--accent-color)]">Host</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons Header Strip (Scrollable row on mobile without wrapping collision) */}
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar no-scrollbar py-0.5 shrink-0 max-w-full">
                <button
                  type="button"
                  onClick={() => setShowAiModal(true)}
                  className="saas-button-primary min-h-[40px] px-3.5 text-xs font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer shrink-0"
                >
                  <svg className="w-4 h-4 text-black shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span>AI Companion</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowGroupDocsModal(true)}
                  className="saas-button-secondary min-h-[40px] px-3.5 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
                >
                  <span>📁</span>
                  <span>Files ({groupDocuments.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="saas-button-primary min-h-[40px] px-3.5 text-xs font-bold whitespace-nowrap cursor-pointer shrink-0"
                  disabled={(selectedGroup.members?.length || 0) >= (selectedGroup.maxMembers || MAX_MEMBERS)}
                >
                  Invite
                </button>
                <button
                  type="button"
                  onClick={() => setShowMembersModal(true)}
                  className="saas-button-secondary min-h-[40px] px-3.5 text-xs font-semibold whitespace-nowrap cursor-pointer shrink-0"
                >
                  Members
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingsPopover((prev) => !prev)}
                  className="saas-button-secondary min-h-[40px] px-3.5 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
                >
                  <svg className="w-4 h-4 text-[var(--text-secondary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span>Join Code</span>
                </button>
                {hostUserId === currentUserId ? (
                  <button
                    type="button"
                    onClick={() => setConfirmModal({ open: true, type: 'delete', groupId: selectedGroup._id, groupName: selectedGroup.groupName })}
                    className="saas-button-secondary min-h-[40px] px-3 text-xs font-semibold text-[var(--error-color)] border-[var(--error-color)]/30 hover:bg-[var(--error-bg)] flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
                  >
                    <svg className="w-4 h-4 text-[var(--error-color)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Group</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmModal({ open: true, type: 'leave', groupId: selectedGroup._id, groupName: selectedGroup.groupName })}
                    className="saas-button-secondary min-h-[40px] px-3 text-xs font-semibold hover:text-[var(--error-color)] hover:border-[var(--error-color)] flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
                  >
                    <svg className="w-4 h-4 text-[var(--text-secondary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Leave Group</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedGroupId(null)}
                  className="saas-button-secondary min-h-[40px] px-3 text-xs font-semibold whitespace-nowrap cursor-pointer shrink-0"
                >
                  ✕ Exit
                </button>
              </div>
            </div>
          </div>

          {/* Modals */}
          {showInviteModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
              <div className="saas-card max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
                <div className="mb-4 sm:mb-6">
                  <h2 className="section-title text-lg font-bold">Invite a member</h2>
                  <p className="small-text mt-1 text-xs text-[var(--text-secondary)]">Search for a student and send them a group invite.</p>
                </div>
                <form onSubmit={searchInviteUsers} className="mb-4 flex flex-col gap-2.5 sm:gap-3">
                  <input
                    type="text"
                    value={inviteQuery}
                    onChange={(event) => setInviteQuery(event.target.value)}
                    placeholder="Search by name or email"
                    className="saas-input w-full min-h-[46px] px-3.5 text-sm"
                  />
                  <button type="submit" className="saas-button-primary min-h-[46px] font-bold cursor-pointer">Search</button>
                </form>
                {inviteResults.length > 0 && (
                  <div className="mb-4 max-h-64 space-y-2.5 overflow-y-auto custom-scrollbar pr-1">
                    {inviteResults.map((u) => (
                      <div key={u._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-3.5 sm:p-4">
                        <div className="flex-1 min-w-0">
                          <p className="card-title text-sm font-bold truncate">{u.name}</p>
                          <p className="caption-text text-xs text-[var(--text-muted)] truncate">{u.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => inviteToGroup(u._id)}
                          disabled={inviting}
                          className="saas-button-primary min-h-[44px] px-4 text-xs font-bold w-full sm:w-auto cursor-pointer disabled:opacity-50"
                        >
                          Invite
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-auto pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false)
                      setInviteQuery('')
                      setInviteResults([])
                    }}
                    className="saas-button-secondary w-full min-h-[46px] font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {showMembersModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
              <div className="saas-card max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
                <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="section-title text-lg font-bold">Group members</h2>
                    <p className="small-text mt-1 text-xs text-[var(--text-secondary)]">Everyone currently in this study group.</p>
                  </div>
                  <span className="rounded-full bg-[var(--accent-light)] px-3 py-1 text-xs font-bold text-[var(--accent-color)] border border-[var(--accent-color)]/20 shrink-0">
                    {uniqueGroupMembers.length} {uniqueGroupMembers.length === 1 ? 'member' : 'members'}
                  </span>
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1 flex-1">
                  {uniqueGroupMembers.map((member) => {
                    const memberId = (member._id || member).toString()
                    const isOnline = onlineMembers.some((u) => (u.userId || u._id || u).toString() === memberId)
                    const isHost = hostUserId === memberId

                    return (
                      <div key={memberId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-3.5 sm:p-4 transition-colors hover:border-[var(--border-hover)]">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-light)] font-bold text-[var(--accent-color)] text-sm shadow-xs">
                              {member.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            {isOnline && (
                              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[var(--success-color)] ring-2 ring-[var(--bg-secondary)]" title="Online" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="card-title text-sm sm:text-base font-semibold truncate" title={member.name}>{member.name}</p>
                              {isOnline && (
                                <span className="text-[10px] uppercase font-semibold text-[var(--success-color)] shrink-0 bg-[var(--success-color)]/10 px-1.5 py-0.5 rounded">Online</span>
                              )}
                            </div>
                            <p className="caption-text text-xs text-[var(--text-muted)] truncate" title={member.email}>{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                          {isHost ? (
                            <span className="rounded-full bg-[var(--accent-color)] px-3 py-1.5 text-xs font-bold text-black flex items-center gap-1.5 shadow-xs shrink-0">
                              👑 Host
                            </span>
                          ) : isCurrentHost ? (
                            <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
                              <button
                                type="button"
                                onClick={() => handleTransferHost(memberId, member.name)}
                                className="min-h-[44px] px-3 py-2 text-xs font-semibold rounded-lg border border-[var(--accent-color)]/40 text-[var(--accent-color)] bg-[var(--accent-color)]/10 hover:bg-[var(--accent-color)] hover:text-black transition-all duration-200 flex items-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer"
                                title="Transfer Host privileges to this member"
                              >
                                👑 Make Host
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(memberId, member.name)}
                                className="min-h-[44px] px-3 py-2 text-xs font-semibold rounded-lg border border-[var(--error-color)]/40 text-[var(--error-color)] bg-[var(--error-color)]/10 hover:bg-[var(--error-color)] hover:text-white transition-all duration-200 flex items-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer"
                                title="Remove member from group"
                              >
                                ✕ Remove
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 pt-2 flex gap-3">
                  <button type="button" onClick={() => setShowMembersModal(false)} className="saas-button-secondary w-full min-h-[46px] font-bold cursor-pointer">Close</button>
                </div>
              </div>
            </div>
          )}

          {showGroupDocsModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-6 animate-fadeIn">
              <div className="saas-card max-w-3xl w-full h-[85vh] flex flex-col shadow-2xl relative border border-[var(--border-main)] rounded-2xl p-4 sm:p-6 overflow-hidden bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3 mb-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-color)]/10 text-xl font-bold border border-[var(--accent-color)]/20 shrink-0">
                      📁
                    </div>
                    <div>
                      <h2 className="section-title text-base sm:text-lg font-bold">Group Shared Documents</h2>
                      <p className="caption-text text-xs text-[var(--text-secondary)]">All files, PDFs, and materials shared in this study group</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGroupDocsModal(false)}
                    className="rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[36px] cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3 shrink-0">
                  <input
                    type="text"
                    value={groupDocSearch}
                    onChange={(e) => setGroupDocSearch(e.target.value)}
                    placeholder="Search group documents by name..."
                    className="saas-input py-1.5 px-3 text-xs w-full"
                  />
                </div>

                <div className="mb-3 shrink-0">
                  <FileUploadZone
                    api={api}
                    moduleName="group"
                    groupId={selectedGroupId}
                    compact
                    onUploadSuccess={(newDocs) => {
                      setGroupDocuments((prev) => [...newDocs, ...prev])
                    }}
                  />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                  {groupDocuments.filter((d) => {
                    if (!groupDocSearch.trim()) return true
                    const q = groupDocSearch.toLowerCase().trim()
                    return (
                      (d.originalName || d.filename || '').toLowerCase().includes(q) ||
                      (d.uploaderName || '').toLowerCase().includes(q)
                    )
                  }).length > 0 ? (
                    groupDocuments.filter((d) => {
                      if (!groupDocSearch.trim()) return true
                      const q = groupDocSearch.toLowerCase().trim()
                      return (
                        (d.originalName || d.filename || '').toLowerCase().includes(q) ||
                        (d.uploaderName || '').toLowerCase().includes(q)
                      )
                    }).map((doc) => (
                      <FileCard
                        key={doc._id || doc.id}
                        file={doc}
                        api={api}
                        onPreview={setPreviewFile}
                        onDelete={handleDeleteGroupDocument}
                        canDelete={isCurrentHost || doc.uploadedBy?._id === currentUserId || doc.uploadedBy === currentUserId}
                      />
                    ))
                  ) : (
                    <div className="flex h-40 items-center justify-center">
                      <p className="text-xs text-[var(--text-muted)] italic">No shared documents found in this group.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {previewFile && (
            <FilePreviewModal
              file={previewFile}
              api={api}
              onClose={() => setPreviewFile(null)}
            />
          )}

          {/* Professional Message Actions Modal / Context Menu */}
          {activeActionMsg && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="saas-card max-w-sm w-full p-4 sm:p-5 rounded-2xl shadow-2xl space-y-4 border border-[var(--border-main)] bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-2.5">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <span>💬</span>
                    <span>Message Options</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveActionMsg(null)}
                    className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2">
                  {!(activeActionMsg.isDeleted || activeActionMsg.deletedForEveryone) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeActionMsg.message) {
                          navigator.clipboard?.writeText(activeActionMsg.message)
                          setStatus('Message copied to clipboard!')
                          setCopiedToast(true)
                          clearTransientMessage()
                          setTimeout(() => setCopiedToast(false), 3000)
                        }
                        setActiveActionMsg(null)
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-[10px] text-xs font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--accent-color)]/10 hover:text-[var(--accent-color)] border border-[var(--border-main)] transition cursor-pointer"
                    >
                      <span className="text-sm">📋</span>
                      <span>Copy Message</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteForMe(activeActionMsg._id)}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-[10px] text-xs font-semibold bg-[var(--bg-secondary)] hover:bg-amber-500/10 hover:text-amber-400 border border-[var(--border-main)] transition cursor-pointer"
                  >
                    <span className="text-sm">🗑️</span>
                    <span>Delete for Me</span>
                  </button>

                  {((activeActionMsg.sender?._id || activeActionMsg.sender)?.toString() === currentUserId || isCurrentHost) &&
                    !(activeActionMsg.isDeleted || activeActionMsg.deletedForEveryone) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteForEveryone(activeActionMsg._id)}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-[10px] text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition cursor-pointer"
                      >
                        <span className="text-sm">🚫</span>
                        <span>Delete for Everyone</span>
                      </button>
                    )}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveActionMsg(null)}
                  className="saas-button-secondary w-full min-h-[38px] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Study Group Collaboration Workspace Chat Area (Occupies 75-80% of Viewport) */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Floating Toast Notification Popup */}
            {copiedToast && (
              <div className="fixed top-6 right-6 z-[100] rounded-[16px] bg-[var(--accent-color)] text-black font-extrabold px-5 py-3 shadow-2xl flex items-center gap-2.5 animate-fadeIn border border-black/20 text-sm">
                <span className="text-base">✓</span>
                <span>Join code copied to clipboard!</span>
              </div>
            )}

            {showSettingsPopover && (
              <div className="flex-none mb-2 rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-3.5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">Group Join Code</p>
                    <p className="caption-text font-mono text-sm tracking-wider text-[var(--accent-color)] font-bold">{selectedGroup.joinCode || '—'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedGroup?.joinCode) {
                        navigator.clipboard?.writeText(selectedGroup.joinCode)
                      }
                      setShowSettingsPopover(false)
                      setStatus('Join code copied to clipboard!')
                      setCopiedToast(true)
                      clearTransientMessage()
                      setTimeout(() => setCopiedToast(false), 3000)
                    }}
                    className="saas-button-primary min-h-[34px] px-4 text-xs font-bold shadow-sm"
                  >
                    Copy Code
                  </button>
                </div>
              </div>
            )}

            {/* Scrollable Messages Stream (Reverse Infinite Scroll) */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="relative flex-1 min-h-0 overflow-y-auto pt-2 pb-8 sm:pb-6 px-1 custom-scrollbar space-y-2.5 sm:space-y-3"
            >
              {loadingOlder && (
                <div className="flex justify-center py-2 text-xs text-[var(--accent-color)] font-semibold items-center gap-2 animate-fadeIn">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Loading older messages...</span>
                </div>
              )}

              {messages.length > 0 ? (
                messages.map((msg) => {
                  const senderId = msg.sender?._id || msg.sender
                  const isSelf = senderId === currentUserId
                  const isAiMsg = msg.message?.startsWith('🤖') || senderId === 'ai'
                  const isSystemMsg = msg.isSystem || msg.systemEventType || msg.message?.startsWith('🟢') || msg.message?.startsWith('🔴') || msg.message?.startsWith('🚫') || msg.message?.startsWith('👑')
                  const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                  if (isSystemMsg) {
                    return (
                      <div key={msg._id} className="w-full flex justify-center my-2 sm:my-3 animate-fadeIn">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)]/90 px-3.5 sm:px-4 py-1 sm:py-1.5 text-xs font-semibold text-[var(--text-muted)] shadow-sm">
                          <span>{msg.message}</span>
                          <span className="text-[10px] text-[var(--text-muted)] opacity-80 border-l border-[var(--border-main)] pl-2">
                            {formattedTime}
                          </span>
                        </div>
                      </div>
                    )
                  }

                  if (isAiMsg) {
                    return (
                      <div key={msg._id} className="w-full flex justify-center my-2 sm:my-3 animate-fadeIn min-w-0">
                        <div
                          style={{
                            boxShadow: 'var(--ai-bubble-shadow, 0 4px 16px rgba(15,23,42,0.06))'
                          }}
                          className="w-fit max-w-[92%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-[75%] rounded-2xl bg-[var(--ai-bubble-bg)] border border-[var(--ai-bubble-border)] p-3 sm:p-4 text-[var(--ai-text-primary)] min-w-0 overflow-hidden"
                        >
                          <div className="flex items-center justify-between gap-3 mb-1.5 sm:mb-2 border-b border-[var(--ai-bubble-border)] pb-1 sm:pb-1.5">
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>Catalyst AI Companion</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[var(--ai-text-secondary)]">{formattedTime}</span>
                              <CopyButton text={msg.message} />
                            </div>
                          </div>
                          <MarkdownRenderer>{msg.message}</MarkdownRenderer>
                        </div>
                      </div>
                    )
                  }

                  if (isSelf) {
                    const isMsgDeleted = msg.isDeleted || msg.deletedForEveryone
                    return (
                      <div
                        key={msg._id}
                        onContextMenu={(e) => handleContextMenuMsg(e, msg)}
                        onTouchStart={() => handleTouchStartMsg(msg)}
                        onTouchEnd={handleTouchEndMsg}
                        onTouchMove={handleTouchEndMsg}
                        className="group w-full flex justify-end my-1 sm:my-1.5 min-w-0 relative select-none"
                      >
                        <div
                          style={{
                            boxShadow: 'var(--ai-user-shadow, 0 4px 14px rgba(0,0,0,0.05))'
                          }}
                          className="relative w-fit max-w-[88%] sm:max-w-[75%] md:max-w-[68%] lg:max-w-[62%] min-w-0 rounded-2xl rounded-tr-none bg-[var(--ai-user-bubble-bg)] border border-[var(--ai-user-bubble-border)] p-2.5 sm:p-3.5 text-[var(--ai-user-text)] overflow-hidden"
                        >
                          <div className="flex items-center justify-between gap-3 mb-1 border-b border-[var(--ai-user-bubble-border)] pb-0.5 sm:pb-1">
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">You</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-[var(--text-muted)]">{formattedTime}</span>
                              <button
                                type="button"
                                onClick={() => setActiveActionMsg(msg)}
                                className="opacity-70 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 px-1 rounded text-[11px] hover:bg-black/20 text-[var(--text-muted)] hover:text-white transition-opacity cursor-pointer font-bold"
                                title="Message options"
                              >
                                •••
                              </button>
                            </div>
                          </div>
                          {isMsgDeleted ? (
                            <div className="flex items-center gap-1.5 py-1 text-xs text-[var(--text-muted)] italic opacity-80">
                              <span>🚫</span>
                              <span>This message was deleted.</span>
                            </div>
                          ) : (
                            <MarkdownRenderer>{msg.message}</MarkdownRenderer>
                          )}
                        </div>
                      </div>
                    )
                  }

                  const isMsgDeleted = msg.isDeleted || msg.deletedForEveryone
                  return (
                    <div
                      key={msg._id}
                      onContextMenu={(e) => handleContextMenuMsg(e, msg)}
                      onTouchStart={() => handleTouchStartMsg(msg)}
                      onTouchEnd={handleTouchEndMsg}
                      onTouchMove={handleTouchEndMsg}
                      className="group w-full flex justify-start my-1 min-w-0 relative select-none"
                    >
                      <div className="relative w-fit max-w-[88%] sm:max-w-[75%] md:max-w-[68%] lg:max-w-[62%] min-w-0 rounded-2xl rounded-tl-none bg-[var(--bg-secondary)] border border-[var(--border-main)] p-2.5 sm:p-3 shadow-sm text-[var(--text-primary)]">
                        <div className="flex items-center justify-between gap-3 mb-1 border-b border-[var(--border-main)] pb-0.5 sm:pb-1">
                          <span className="text-xs font-bold text-[var(--accent-color)]">{msg.sender?.name || 'Member'}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[var(--text-muted)]">{formattedTime}</span>
                            <button
                              type="button"
                              onClick={() => setActiveActionMsg(msg)}
                              className="opacity-70 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 px-1 rounded text-[11px] hover:bg-black/20 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-opacity cursor-pointer font-bold"
                              title="Message options"
                            >
                              •••
                            </button>
                          </div>
                        </div>
                        {isMsgDeleted ? (
                          <div className="flex items-center gap-1.5 py-1 text-xs text-[var(--text-muted)] italic opacity-80">
                            <span>🚫</span>
                            <span>This message was deleted.</span>
                          </div>
                        ) : (
                          <MarkdownRenderer>{msg.message}</MarkdownRenderer>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-center body-text text-xs sm:text-sm text-[var(--text-muted)] italic">
                    No messages yet. Send a message or start with @ai to chat with the companion!
                  </p>
                </div>
              )}

              {/* Dedicated bottom spacer to ensure the last bubble is 100% visible */}
              <div className="h-6 sm:h-4 shrink-0" />
              <div ref={messagesEndRef} />

              {/* Floating "↓ Scroll to Latest" Button */}
              {showScrollToBottom && !hasUnreadNew && (
                <div className="sticky bottom-3 right-3 flex justify-end z-30 pointer-events-none">
                  <button
                    type="button"
                    onClick={() => scrollToBottom('smooth')}
                    className="pointer-events-auto rounded-full border border-zinc-300 dark:border-zinc-700/80 bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-[#1F2937] dark:text-[#F9FAFB] dark:hover:bg-[#374151] dark:hover:text-[#FFFFFF] px-3.5 py-1.5 text-xs font-bold shadow-xl backdrop-blur-md transition active:scale-95 flex items-center gap-1.5 animate-fadeIn cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <span>Scroll to Latest</span>
                  </button>
                </div>
              )}

              {/* Floating "↓ New Messages" Pill Button */}
              {hasUnreadNew && (
                <div className="sticky bottom-3 left-0 right-0 flex justify-center z-30 pointer-events-none">
                  <button
                    type="button"
                    onClick={() => {
                      scrollToBottom('smooth')
                      setHasUnreadNew(false)
                    }}
                    className="pointer-events-auto rounded-full border border-[var(--accent-color)]/50 bg-[var(--accent-color)] text-black px-4 py-2 text-xs font-extrabold shadow-2xl hover:scale-105 transition-transform flex items-center gap-1.5 animate-bounce cursor-pointer"
                  >
                    <span>↓</span>
                    <span>New Messages</span>
                  </button>
                </div>
              )}
            </div>

            {error && <p className="flex-none my-1.5 rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-3 py-1.5 text-xs text-[var(--error-color)]">{error}</p>}
            {status && <p className="flex-none my-1.5 rounded-[14px] bg-[var(--success-bg)] border border-[var(--success-color)]/30 px-3 py-1.5 text-xs text-[var(--success-color)]">{status}</p>}

            {/* Anchored Bottom Message Composer Container (z-20 relative) */}
            <div className="flex-none pt-2.5 pb-1 border-t border-[var(--border-main)] bg-[var(--bg-surface)] z-20 relative">
              {typingUsers.length > 0 && (
                <div className="mb-1.5 flex items-center gap-2 text-xs text-[var(--text-secondary)] italic animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-[var(--accent-color)]" />
                  <span>
                    {typingUsers.map((u) => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              )}
              {isAiProcessing && (
                <div className="mb-1.5 flex items-center gap-2 text-xs text-[var(--accent-color)] font-semibold animate-pulse">
                  <span className="text-sm">🤖</span>
                  <span>AI Companion is generating a response...</span>
                </div>
              )}
              {showAttachUpload && (
                <div className="mb-2 p-2 rounded-[14px] bg-[var(--bg-secondary)] border border-[var(--border-main)] animate-fadeIn">
                  <div className="flex justify-between items-center mb-1.5 px-1">
                    <span className="text-xs font-bold text-[var(--accent-color)] flex items-center gap-1">
                      <span>📎</span>
                      <span>Attach Document to Group</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAttachUpload(false)}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <FileUploadZone
                    api={api}
                    moduleName="group"
                    groupId={selectedGroupId}
                    compact
                    onUploadSuccess={(newDocs) => {
                      setGroupDocuments((prev) => [...newDocs, ...prev])
                      setShowAttachUpload(false)
                      setStatus(`Uploaded ${newDocs.length} file(s) to group!`)
                      clearTransientMessage()
                    }}
                  />
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 flex-1 w-full">
                  <button
                    type="button"
                    onClick={() => setShowAttachUpload((prev) => !prev)}
                    className={`h-[46px] w-[46px] rounded-[12px] border text-base flex items-center justify-center transition cursor-pointer shrink-0 ${
                      showAttachUpload
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/20 text-[var(--accent-color)]'
                        : 'border-[var(--border-main)] bg-[var(--bg-secondary)] hover:border-[var(--accent-color)]/50 text-[var(--text-secondary)]'
                    }`}
                    title="Attach file to group"
                  >
                    📎
                  </button>
                  <textarea
                    value={messageText}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Type your message... (Tip: start with @ai to ask AI in group chat)"
                    rows="2"
                    className="saas-input w-full min-h-[46px] max-h-24 resize-none p-3 text-sm font-medium flex-1"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto">
                  <select
                    value={groupSelectedProvider}
                    onChange={(e) => {
                      const val = e.target.value
                      setGroupSelectedProvider(val)
                      localStorage.setItem('ai_provider', val)
                    }}
                    className="saas-input text-xs font-semibold px-2.5 min-h-[46px] cursor-pointer bg-[var(--bg-secondary)] border-[var(--border-main)] rounded-[12px] text-[var(--text-primary)] flex-1 sm:flex-none"
                    title="Select AI Model Provider for @ai group chat"
                  >
                    <option value="gemini">Gemini</option>
                    <option value="groq">Groq</option>
                  </select>
                  <button
                    type="button"
                    onClick={sendMessage}
                    className="saas-button-primary min-h-[46px] px-6 font-bold shadow-sm flex-1 sm:flex-none cursor-pointer"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Canvas-First Study Group Overview Dashboard */
        <div className="overflow-y-auto px-3 py-6 sm:px-6 lg:px-8 lg:h-full custom-scrollbar">
          <div className="mx-auto max-w-[1280px] max-w-full overflow-x-hidden space-y-6 sm:space-y-8">
            {/* Header */}
            <div>
              <p className="page-label">Study Groups</p>
              <h1 className="page-title mb-1.5 text-2xl sm:text-3xl font-extrabold">Study Group Collaboration</h1>
              <p className="page-description text-xs sm:text-sm text-[var(--text-secondary)]">Search peers, join groups with code, and chat in real-time.</p>
            </div>

            <hr className="canvas-divider opacity-60" />

            {error && <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-xs sm:text-sm text-[var(--error-color)] break-words">{error}</p>}
            {status && <p className="rounded-[14px] bg-[var(--success-bg)] border border-[var(--success-color)]/30 px-4 py-3 text-xs sm:text-sm text-[var(--success-color)] break-words">{status}</p>}

            {/* Forms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <form onSubmit={joinGroupByCode} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-center">
                <input
                  value={joinCodeInput}
                  onChange={(event) => setJoinCodeInput(event.target.value)}
                  placeholder="Enter group code to join..."
                  className="saas-input w-full min-h-[48px] px-3.5 text-sm"
                />
                <button className="saas-button-primary font-bold px-6 shrink-0 min-h-[48px] w-full sm:w-auto cursor-pointer">Join</button>
              </form>

              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-center">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search peers by name or email..."
                  className="saas-input w-full min-h-[48px] px-3.5 text-sm"
                />
                <button className="saas-button-primary font-bold px-6 shrink-0 min-h-[48px] w-full sm:w-auto cursor-pointer">
                  Search
                </button>
              </form>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-4 pt-2">
                <h2 className="section-title text-xl sm:text-2xl font-extrabold">Search Results</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                  {searchResults.map((student) => (
                    <div key={student._id} className="rounded-2xl sm:rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4 shadow-sm space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="card-title font-bold text-sm sm:text-base truncate">{student.name}</h3>
                          <p className="caption-text text-xs text-[var(--text-muted)] truncate">{student.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => sendRequest(student._id)}
                          className="saas-button-primary min-h-[44px] px-4 text-xs font-bold w-full sm:w-auto cursor-pointer shrink-0"
                        >
                          Send Request
                        </button>
                      </div>
                      <p className="body-text text-xs text-[var(--text-secondary)] truncate">
                        Subjects: {student.interestedSubjects?.join(', ') || 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <hr className="canvas-divider opacity-60" />

            <div className="space-y-4">
              <h2 className="section-title text-xl sm:text-2xl font-extrabold">My Study Groups ({groups.length})</h2>
                {groups.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    {groups.map((group) => {
                      const isHost = group.createdBy?._id === currentUserId || group.createdBy === currentUserId
                      const uniqueMembers = getUniqueMembers(group.members)
                      const memberNames = uniqueMembers.map((m) => (typeof m === 'object' && m?.name ? m.name : 'Member')).join(', ')
                      return (
                        <div
                          key={group._id}
                          className="rounded-2xl sm:rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4 sm:p-5 text-left transition hover:border-[var(--accent-color)] shadow-sm space-y-3 w-full flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="card-title font-bold text-sm sm:text-base truncate">{group.groupName || 'Study Group'}</p>
                                {isHost && (
                                  <span className="rounded-full bg-[var(--accent-color)] px-2 py-0.5 text-[10px] font-bold text-black shadow-sm shrink-0">👑 Host</span>
                                )}
                              </div>
                              <span className="rounded-full border border-[var(--border-main)] bg-[var(--bg-primary)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)] shrink-0">
                                {uniqueMembers.length}/{group.maxMembers || MAX_MEMBERS}
                              </span>
                            </div>
                            <p className="body-text text-xs text-[var(--text-secondary)] line-clamp-2">
                              Members: {memberNames || 'None'}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[var(--border-main)]">
                            <button
                              type="button"
                              onClick={() => setSelectedGroupId(group._id)}
                              className="saas-button-primary min-h-[44px] px-4 text-xs font-bold flex-1 sm:flex-none cursor-pointer"
                            >
                              Open Chat
                            </button>
                            {isHost ? (
                              <button
                                type="button"
                                onClick={() => setConfirmModal({ open: true, type: 'delete', groupId: group._id, groupName: group.groupName })}
                                className="saas-button-secondary min-h-[44px] px-3.5 text-xs font-semibold text-[var(--error-color)] border-[var(--error-color)]/30 hover:bg-[var(--error-bg)] flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5 text-[var(--error-color)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Delete</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmModal({ open: true, type: 'leave', groupId: group._id, groupName: group.groupName })}
                                className="saas-button-secondary min-h-[44px] px-3.5 text-xs font-semibold hover:text-[var(--error-color)] hover:border-[var(--error-color)] flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span>Leave</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="body-text text-xs sm:text-sm text-[var(--text-muted)] italic">No study groups created or joined yet.</p>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Real Confirmation Popup Modal (Center Screen) */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-fadeIn">
          <div className="saas-card max-w-md w-full shadow-2xl space-y-4 border-2 border-[var(--error-color)]/30 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--error-bg)] text-lg font-bold text-[var(--error-color)]">
                ⚠️
              </span>
              <div>
                <h3 className="section-title text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  {confirmModal.type === 'delete' ? 'Delete Group Chat?' : 'Leave Group Chat?'}
                </h3>
                <p className="caption-text text-xs text-[var(--text-muted)] mt-0.5">Confirmation required</p>
              </div>
            </div>

            <p className="body-text text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed break-words">
              {confirmModal.type === 'delete'
                ? `Do you really want to delete "${confirmModal.groupName || 'this study group'}"? All group chat history and member access will be permanently removed.`
                : `Do you really want to leave "${confirmModal.groupName || 'this study group'}"? You will need an invite or join code to re-join.`}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-[var(--border-main)]">
              <button
                type="button"
                onClick={() => setConfirmModal({ open: false, type: null, groupId: null, groupName: '' })}
                className="saas-button-secondary min-h-[46px] w-full sm:w-auto px-5 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmAction}
                className="saas-button-primary min-h-[46px] w-full sm:w-auto px-5 text-xs font-bold bg-[var(--error-color)] text-white hover:bg-[var(--error-color)]/90 shadow-md cursor-pointer"
              >
                {confirmModal.type === 'delete' ? 'Yes, Delete Group' : 'Yes, Leave Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
