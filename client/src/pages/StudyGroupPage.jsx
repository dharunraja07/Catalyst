import { useState, useEffect, useRef, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../context/AuthContext.jsx'
import AIChatSurface from '../components/AIChatSurface.jsx'
import getSocket from '../api/socket.js'

const MAX_MEMBERS = 15

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

  const messagesEndRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const typingTimeoutRef = useRef(null)

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
        const [groupsResp, requestsResp] = await Promise.all([
          api.get('/study-groups/groups'),
          api.get('/study-groups/requests/incoming')
        ])
        setGroups(groupsResp.data)
        setIncomingRequests(requestsResp.data)
      } catch (err) {
        setError('Unable to load study group dashboard')
      }
    }
    loadInitialData()
  }, [api])

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

  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return

    if (container.scrollTop <= 60 && hasMoreMessages && !loadingOlder) {
      loadOlderMessages()
    }

    if (isNearBottom()) {
      setHasUnreadNew(false)
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

    // 1. Fetch initial message history (latest 35 messages) via REST
    async function loadMessages() {
      try {
        const response = await api.get(`/study-groups/groups/${selectedGroupId}/messages`, {
          params: { limit: 35 }
        })
        const initialMsgs = response.data || []
        setMessages(initialMsgs)
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
    loadMessages()

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

    // Single source of message updates - dedupe by _id
    const handleReceiveMessage = (newMessage) => {
      const senderId = newMessage.sender?._id || newMessage.sender
      const currentId = user?.id || user?._id
      const isSelf = senderId === currentId

      setMessages((prev) => {
        if (prev.some((msg) => msg._id === newMessage._id)) {
          return prev
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

    socket.on('connect', handleConnect)
    socket.on('receive_message', handleReceiveMessage)
    socket.on('presence_update', handlePresenceUpdate)
    socket.on('user_typing', handleUserTyping)
    socket.on('user_stop_typing', handleUserStopTyping)

    // Teardown listener cleanup
    return () => {
      socket.emit('leave_group', { groupId: selectedGroupId })
      socket.off('connect', handleConnect)
      socket.off('receive_message', handleReceiveMessage)
      socket.off('presence_update', handlePresenceUpdate)
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

  const sendMessage = async () => {
    const trimmed = messageText.trim()
    if (!trimmed || !selectedGroupId) return

    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('send_message', {
        groupId: selectedGroupId,
        message: trimmed
      })
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      socket.emit('stop_typing', { groupId: selectedGroupId })
    }
    setMessageText('')
    requestAnimationFrame(() => {
      scrollToBottom('smooth')
      setHasUnreadNew(false)
    })

    // Support trigger for @ai in group chat so AI responds directly in group chat stream
    if (trimmed.toLowerCase().startsWith('@ai')) {
      const aiPrompt = trimmed.replace(/^@ai\s*/i, '').trim()
      if (aiPrompt) {
        setIsAiProcessing(true)
        try {
          const aiRes = await api.post('/ai/chat', {
            message: aiPrompt,
            history: []
          })
          const reply = aiRes.data?.response || aiRes.data?.reply
          if (reply && socket && socket.connected) {
            socket.emit('send_message', {
              groupId: selectedGroupId,
              message: `🤖 [AI Response to "@ai ${aiPrompt}"]\n${reply}`
            })
          }
        } catch {
          // ignore silent AI errors in chat stream
        } finally {
          setIsAiProcessing(false)
        }
      }
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
      await api.post(`/study-groups/groups/${selectedGroupId}/invite`, { userId })
      setStatus('Invite sent. The user can accept or reject it from their requests list.')
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

  const hostUserId = selectedGroup?.createdBy?._id || selectedGroup?.createdBy
  const currentUserId = user?.id || user?._id

  return (
    <main className="h-[calc(100vh-90px)] min-h-0 bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden flex flex-col">
      {selectedGroupId && selectedGroup ? (
        <div className="mx-auto flex h-full max-w-[1280px] w-full flex-col p-2 sm:p-4 min-h-0 overflow-hidden space-y-3">
          {/* Compressed Study Group Workspace Header (Target height 80-100px) */}
          <div className="flex-none py-2.5 px-3 sm:px-4 rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-surface)] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                    <h1 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] truncate">{selectedGroup.groupName || 'Study Group'}</h1>
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
                  <span>{selectedGroup.members?.length || 0}/{selectedGroup.maxMembers || MAX_MEMBERS} Members</span>
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

              {/* Action Buttons Header Row */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAiModal(true)}
                  className="saas-button-primary min-h-[38px] px-3.5 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <span className="text-sm">✨</span>
                  <span>AI Companion</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="saas-button-primary min-h-[38px] px-3.5 text-xs font-bold"
                  disabled={(selectedGroup.members?.length || 0) >= (selectedGroup.maxMembers || MAX_MEMBERS)}
                >
                  Invite
                </button>
                <button
                  type="button"
                  onClick={() => setShowMembersModal(true)}
                  className="saas-button-secondary min-h-[38px] px-3.5 text-xs font-semibold"
                >
                  Members
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingsPopover((prev) => !prev)}
                  className="saas-button-secondary min-h-[38px] px-3.5 text-xs font-bold flex items-center gap-1.5"
                >
                  <span>🔑</span>
                  <span>Join Code</span>
                </button>
                {hostUserId === currentUserId ? (
                  <button
                    type="button"
                    onClick={() => setConfirmModal({ open: true, type: 'delete', groupId: selectedGroup._id, groupName: selectedGroup.groupName })}
                    className="saas-button-secondary min-h-[38px] px-3 text-xs font-semibold text-[var(--error-color)] border-[var(--error-color)]/30 hover:bg-[var(--error-bg)]"
                  >
                    🗑 Delete Group
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmModal({ open: true, type: 'leave', groupId: selectedGroup._id, groupName: selectedGroup.groupName })}
                    className="saas-button-secondary min-h-[38px] px-3 text-xs font-semibold hover:text-[var(--error-color)] hover:border-[var(--error-color)]"
                  >
                    🚪 Leave Group
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedGroupId(null)}
                  className="saas-button-secondary min-h-[38px] px-3 text-xs font-semibold"
                >
                  ✕ Exit
                </button>
              </div>
            </div>
          </div>

          {/* Modals */}
          {showInviteModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                <div className="saas-card max-w-md w-full shadow-2xl">
                  <div className="mb-6">
                    <h2 className="section-title">Invite a member</h2>
                    <p className="small-text mt-1">Search for a student and send them a group invite.</p>
                  </div>
                  <form onSubmit={searchInviteUsers} className="mb-6 flex flex-col gap-3">
                    <input
                      type="text"
                      value={inviteQuery}
                      onChange={(event) => setInviteQuery(event.target.value)}
                      placeholder="Search by name or email"
                      className="saas-input w-full"
                    />
                    <button type="submit" className="saas-button-primary">Search</button>
                  </form>
                  {inviteResults.length > 0 && (
                    <div className="mb-6 max-h-64 space-y-3 overflow-y-auto custom-scrollbar">
                      {inviteResults.map((u) => (
                        <div key={u._id} className="flex items-center justify-between rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4">
                          <div className="flex-1">
                            <p className="card-title text-base">{u.name}</p>
                            <p className="caption-text">{u.email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => inviteToGroup(u._id)}
                            disabled={inviting}
                            className="saas-button-primary min-h-[36px] px-3 text-xs disabled:opacity-50"
                          >
                            Invite
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowInviteModal(false)
                        setInviteQuery('')
                        setInviteResults([])
                      }}
                      className="saas-button-secondary w-full"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showMembersModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                <div className="saas-card max-w-md w-full shadow-2xl">
                  <div className="mb-6">
                    <h2 className="section-title">Group members</h2>
                    <p className="small-text mt-1">Everyone currently in this study group.</p>
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                    {selectedGroup.members?.map((member) => {
                      const memberId = member._id || member
                      const isOnline = onlineMembers.some((u) => u.userId === memberId)
                      const isHost = hostUserId === memberId

                      return (
                        <div key={memberId} className="flex items-center justify-between rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-light)] font-bold text-[var(--accent-color)] text-sm">
                                {member.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                              {isOnline && (
                                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[var(--success-color)] ring-2 ring-[var(--bg-secondary)]" title="Online" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="card-title text-base">{member.name}</p>
                                {isOnline && (
                                  <span className="text-[10px] uppercase font-semibold text-[var(--success-color)]">Online</span>
                                )}
                              </div>
                              <p className="caption-text">{member.email}</p>
                            </div>
                          </div>
                          {isHost && (
                            <span className="rounded-full bg-[var(--accent-color)] px-3 py-1 text-xs font-semibold text-black">Host</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button type="button" onClick={() => setShowMembersModal(false)} className="saas-button-secondary w-full">Close</button>
                  </div>
                </div>
              </div>
            )}

            {showAiModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-6 animate-fadeIn">
                <div className="saas-card max-w-2xl w-full h-[85vh] flex flex-col shadow-2xl relative border-2 border-[var(--accent-color)]/40 rounded-[2rem]">
                  <div className="flex items-center justify-between border-b border-[var(--divider-main)] pb-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-color)] text-black font-bold text-base shadow-sm">
                        🤖
                      </div>
                      <div>
                        <h2 className="section-title text-lg font-bold">Group AI Companion</h2>
                        <p className="caption-text">Instant explanations & study notes for your team</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAiModal(false)}
                      className="rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <GroupChatAI
                      groupId={selectedGroupId}
                      api={api}
                      onShareToGroup={(content) => {
                        const socket = getSocket()
                        if (socket && socket.connected) {
                          socket.emit('send_message', {
                            groupId: selectedGroupId,
                            message: `🤖 [AI Assistant Note]\n${content}`
                          })
                          setShowAiModal(false)
                          setStatus('AI response shared with the group chat!')
                          clearTransientMessage()
                        }
                      }}
                    />
                  </div>
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

            {/* Scrollable Messages Stream (Reverse Infinite Scroll, 75-80% height) */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="relative flex-1 min-h-0 overflow-y-auto py-2 px-1 custom-scrollbar space-y-3"
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
                  const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                  if (isAiMsg) {
                    return (
                      <div key={msg._id} className="w-full flex justify-center my-2 animate-fadeIn">
                        <div className="max-w-[90%] sm:max-w-[80%] rounded-2xl bg-gradient-to-r from-[var(--bg-surface)] to-[var(--bg-elevated)] border-2 border-[var(--accent-color)]/40 p-3.5 shadow-md text-[var(--text-primary)]">
                          <div className="flex items-center justify-between gap-4 mb-1.5 border-b border-[var(--accent-color)]/20 pb-1">
                            <span className="text-xs font-bold text-[var(--accent-color)] flex items-center gap-1.5">
                              <span className="text-base">🤖</span> Catalyst AI Companion
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">{formattedTime}</span>
                          </div>
                          <div className="prose prose-invert max-w-none text-sm leading-relaxed break-words">
                            <ReactMarkdown>{msg.message}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  if (isSelf) {
                    return (
                      <div key={msg._id} className="w-full flex justify-end my-1">
                        <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-2xl rounded-tr-none bg-[var(--accent-light)] border border-[var(--accent-color)]/30 p-3 shadow-sm text-[var(--text-primary)]">
                          <div className="flex items-center justify-between gap-3 mb-1 border-b border-[var(--accent-color)]/20 pb-1">
                            <span className="text-xs font-bold text-[var(--accent-color)]">You</span>
                            <span className="text-[10px] text-[var(--text-muted)]">{formattedTime}</span>
                          </div>
                          <div className="prose prose-invert max-w-none text-sm leading-relaxed break-words">
                            <ReactMarkdown>{msg.message}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={msg._id} className="w-full flex justify-start my-1">
                      <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-2xl rounded-tl-none bg-[var(--bg-secondary)] border border-[var(--border-main)] p-3 shadow-sm text-[var(--text-primary)]">
                        <div className="flex items-center justify-between gap-3 mb-1 border-b border-[var(--border-main)] pb-1">
                          <span className="text-xs font-bold text-[var(--accent-color)]">{msg.sender?.name || 'Member'}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">{formattedTime}</span>
                        </div>
                        <div className="prose prose-invert max-w-none text-sm leading-relaxed break-words">
                          <ReactMarkdown>{msg.message}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-center body-text text-sm text-[var(--text-muted)] italic">
                    No messages yet. Send a message or start with @ai to chat with the companion!
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />

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

            {/* Anchored Bottom Message Composer */}
            <div className="flex-none pt-2.5 border-t border-[var(--border-main)]">
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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                  className="saas-input w-full min-h-[46px] max-h-24 resize-none p-3 text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  className="saas-button-primary min-h-[46px] px-6 sm:self-center font-bold shadow-sm"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Canvas-First Study Group Overview Dashboard */
        <div className="overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 lg:h-full custom-scrollbar">
          <div className="mx-auto max-w-[1280px] space-y-8">
            {/* Header */}
            <div>
              <p className="page-label">Study Groups</p>
              <h1 className="page-title mb-2">Study Group Collaboration</h1>
              <p className="page-description">Search peers, join groups with code, and chat in real-time.</p>
            </div>

            <hr className="canvas-divider" />

            {error && <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{error}</p>}
            {status && <p className="rounded-[14px] bg-[var(--success-bg)] border border-[var(--success-color)]/30 px-4 py-3 text-sm text-[var(--success-color)]">{status}</p>}

            {/* Forms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={joinGroupByCode} className="flex gap-3 items-center">
                <input
                  value={joinCodeInput}
                  onChange={(event) => setJoinCodeInput(event.target.value)}
                  placeholder="Enter group code to join..."
                  className="saas-input w-full min-h-[48px]"
                />
                <button className="saas-button-primary font-bold px-6 shrink-0 min-h-[48px]">Join</button>
              </form>

              <form onSubmit={handleSearch} className="flex gap-3 items-center">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search peers by name or email..."
                  className="saas-input w-full min-h-[48px]"
                />
                <button className="saas-button-primary font-bold px-6 shrink-0 min-h-[48px]">
                  Search
                </button>
              </form>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-4 pt-4">
                <h2 className="section-title">Search Results</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map((student) => (
                    <div key={student._id} className="rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="card-title font-bold">{student.name}</h3>
                          <p className="caption-text">{student.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => sendRequest(student._id)}
                          className="saas-button-primary min-h-[38px] px-4 text-xs font-bold"
                        >
                          Send Request
                        </button>
                      </div>
                      <p className="body-text mt-2 text-xs">
                        Subjects: {student.interestedSubjects?.join(', ') || 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <hr className="canvas-divider" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {incomingRequests.length > 0 && (
                <div className="lg:col-span-6 space-y-4">
                  <h2 className="section-title">Incoming Requests ({incomingRequests.length})</h2>
                  <div className="space-y-4">
                    {incomingRequests.map((req) => (
                      <div key={req._id} className="rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="card-title font-bold">{req.sender?.name}</p>
                            <p className="caption-text">{req.sender?.email}</p>
                            {req.group ? (
                              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[var(--accent-color)]">Group Invite</p>
                            ) : (
                              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Peer Request</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => respondToRequest(req._id, true)}
                              className="saas-button-primary min-h-[38px] px-4 text-xs font-bold bg-[var(--success-color)] text-white"
                            >
                              ✓ Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => respondToRequest(req._id, false)}
                              className="saas-button-secondary min-h-[38px] px-4 text-xs font-semibold hover:border-[var(--error-color)] hover:text-[var(--error-color)]"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={`${incomingRequests.length > 0 ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-4`}>
                <h2 className="section-title">My Study Groups ({groups.length})</h2>
                {groups.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {groups.map((group) => {
                      const isHost = group.createdBy?._id === currentUserId || group.createdBy === currentUserId
                      return (
                        <div
                          key={group._id}
                          className="rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-5 text-left transition hover:border-[var(--accent-color)] shadow-sm space-y-3 w-full flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <p className="card-title font-bold text-base">{group.groupName || 'Study Group'}</p>
                              <span className="rounded-full border border-[var(--border-main)] bg-[var(--bg-primary)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)] shrink-0">
                                {group.members?.length || 0}/{group.maxMembers || MAX_MEMBERS}
                              </span>
                            </div>
                            <p className="body-text text-xs text-[var(--text-secondary)] line-clamp-2">
                              Members: {group.members?.map((m) => m.name).join(', ') || 'None'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--border-main)]">
                            <button
                              type="button"
                              onClick={() => setSelectedGroupId(group._id)}
                              className="saas-button-primary min-h-[36px] px-4 text-xs font-bold"
                            >
                              Open Chat
                            </button>
                            {isHost ? (
                              <button
                                type="button"
                                onClick={() => setConfirmModal({ open: true, type: 'delete', groupId: group._id, groupName: group.groupName })}
                                className="saas-button-secondary min-h-[36px] px-3 text-xs font-semibold text-[var(--error-color)] border-[var(--error-color)]/30 hover:bg-[var(--error-bg)]"
                              >
                                🗑 Delete
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmModal({ open: true, type: 'leave', groupId: group._id, groupName: group.groupName })}
                                className="saas-button-secondary min-h-[36px] px-3 text-xs font-semibold hover:text-[var(--error-color)] hover:border-[var(--error-color)]"
                              >
                                🚪 Leave
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="body-text text-[var(--text-muted)] italic">No study groups created or joined yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real Confirmation Popup Modal (Center Screen) */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
          <div className="saas-card max-w-md w-full shadow-2xl space-y-4 border-2 border-[var(--error-color)]/30">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--error-bg)] text-lg font-bold text-[var(--error-color)]">
                ⚠️
              </span>
              <div>
                <h3 className="section-title text-lg font-bold text-[var(--text-primary)]">
                  {confirmModal.type === 'delete' ? 'Delete Group Chat?' : 'Leave Group Chat?'}
                </h3>
                <p className="caption-text mt-0.5">Confirmation required</p>
              </div>
            </div>

            <p className="body-text text-sm text-[var(--text-secondary)] leading-relaxed">
              {confirmModal.type === 'delete'
                ? `Do you really want to delete "${confirmModal.groupName || 'this study group'}"? All group chat history and member access will be permanently removed.`
                : `Do you really want to leave "${confirmModal.groupName || 'this study group'}"? You will need an invite or join code to re-join.`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-main)]">
              <button
                type="button"
                onClick={() => setConfirmModal({ open: false, type: null, groupId: null, groupName: '' })}
                className="saas-button-secondary min-h-[40px] px-4 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmAction}
                className="saas-button-primary min-h-[40px] px-5 text-xs font-bold bg-[var(--error-color)] text-white hover:bg-[var(--error-color)]/90 shadow-md"
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
