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
  const [isAiProcessing, setIsAiProcessing] = useState(false)

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const selectedGroup = useMemo(
    () => groups.find((group) => group._id === selectedGroupId) || null,
    [groups, selectedGroupId]
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  // Socket & Group Messages Lifecycle
  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([])
      setOnlineMembers([])
      setTypingUsers([])
      return
    }

    // 1. Fetch initial message history via REST once
    async function loadMessages() {
      try {
        const response = await api.get(`/study-groups/groups/${selectedGroupId}/messages`)
        setMessages(response.data)
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
      setMessages((prev) => {
        if (prev.some((msg) => msg._id === newMessage._id)) {
          return prev
        }
        return [...prev, newMessage]
      })
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
  }, [api, selectedGroupId])

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
    <main className="h-[calc(100vh-80px)] min-h-0 bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden flex flex-col">
      {selectedGroupId && selectedGroup ? (
        <div className="mx-auto flex h-full max-w-6xl w-full flex-col gap-3 p-3 sm:p-5 min-h-0 overflow-hidden">
          {/* Group Header Card */}
          <div className="saas-card shadow-glow flex-none py-3 px-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
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
                      className="saas-input max-w-[220px] min-h-[36px] py-1 text-sm"
                      autoFocus
                    />
                  ) : (
                    <h1 className="section-title text-xl font-bold break-words">{selectedGroup.groupName || 'Study Group'}</h1>
                  )}
                  {hostUserId === currentUserId && !isEditingGroupName && (
                    <button
                      type="button"
                      onClick={() => {
                        setRenameDraft(selectedGroup.groupName || '')
                        setIsEditingGroupName(true)
                      }}
                      className="rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] p-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      aria-label="Rename group"
                    >
                      ✎
                    </button>
                  )}
                  {isEditingGroupName && hostUserId === currentUserId && (
                    <div className="flex gap-2">
                      <button type="button" onClick={renameGroup} disabled={isRenaming} className="saas-button-primary min-h-[36px] px-3 text-xs">
                        {isRenaming ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" onClick={() => { setIsEditingGroupName(false); setRenameDraft(selectedGroup.groupName || '') }} className="saas-button-secondary min-h-[36px] px-3 text-xs">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <p className="small-text text-xs">
                    {selectedGroup.members?.length || 0}/{selectedGroup.maxMembers || MAX_MEMBERS} members
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--success-color)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--success-color)] animate-pulse" />
                    {onlineMembers.length} online
                  </span>
                  {hostUserId === currentUserId && (
                    <span className="inline-flex items-center rounded-full bg-[var(--accent-light)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-color)] border border-[var(--accent-color)]/30">
                      Host
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons Header */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiModal(true)}
                  className="saas-button-primary min-h-[36px] px-3.5 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <span className="text-sm">✨</span>
                  <span>AI Companion</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="saas-button-primary min-h-[36px] px-3.5 text-xs"
                  disabled={(selectedGroup.members?.length || 0) >= (selectedGroup.maxMembers || MAX_MEMBERS)}
                >
                  Invite
                </button>
                <button
                  type="button"
                  onClick={() => setShowMembersModal(true)}
                  className="saas-button-secondary min-h-[36px] px-3.5 text-xs"
                >
                  Members
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGroupId(null)}
                  className="saas-button-secondary min-h-[36px] px-3.5 text-xs"
                >
                  Close
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

          {/* Unified Single Chat Box: Header + Scrollable Messages Stream + Pinned Bottom Input */}
          <div className="saas-card shadow-glow flex-1 min-h-0 flex flex-col p-3 sm:p-5 overflow-hidden">
            {/* Stream Header */}
            <div className="flex-none mb-2 flex items-center justify-between border-b border-[var(--divider-main)] pb-2.5">
              <div>
                <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">Live Stream</p>
                <h2 className="section-title text-lg">Group Chat</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsPopover((prev) => !prev)}
                className="rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Settings
              </button>
            </div>

            {showSettingsPopover && (
              <div className="flex-none mb-2 rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Join code</p>
                    <p className="caption-text">{selectedGroup.joinCode || '—'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(selectedGroup.joinCode || '')}
                    className="saas-button-secondary min-h-[36px] px-3 text-xs"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {/* Scrollable Messages Stream with Rich Markdown Support */}
            <div className="flex-1 min-h-0 overflow-y-auto rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)]/50 p-3 sm:p-4 custom-scrollbar">
              <div className="space-y-3">
                {messages.length > 0 ? (
                  messages.map((msg) => {
                    const senderId = msg.sender?._id || msg.sender
                    const isSelf = senderId === currentUserId
                    const isAiMsg = msg.message?.startsWith('🤖') || senderId === 'ai'
                    const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                    if (isAiMsg) {
                      return (
                        <div key={msg._id} className="w-full flex justify-center my-2.5 animate-fadeIn">
                          <div className="max-w-[92%] sm:max-w-[82%] rounded-2xl bg-gradient-to-r from-[var(--bg-surface)] to-[var(--bg-elevated)] border-2 border-[var(--accent-color)]/40 p-4 shadow-md text-[var(--text-primary)]">
                            <div className="flex items-center justify-between gap-4 mb-2 border-b border-[var(--accent-color)]/20 pb-1.5">
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
                        <div key={msg._id} className="w-full flex justify-end my-1.5">
                          <div className="max-w-[85%] sm:max-w-[72%] rounded-2xl rounded-tr-none bg-[var(--accent-light)] border border-[var(--accent-color)]/30 p-3.5 shadow-sm text-[var(--text-primary)]">
                            <div className="flex items-center justify-between gap-4 mb-1 border-b border-[var(--accent-color)]/20 pb-1">
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
                      <div key={msg._id} className="w-full flex justify-start my-1.5">
                        <div className="max-w-[85%] sm:max-w-[72%] rounded-2xl rounded-tl-none bg-[var(--bg-surface)] border border-[var(--border-main)] p-3.5 shadow-sm text-[var(--text-primary)]">
                          <div className="flex items-center justify-between gap-4 mb-1 border-b border-[var(--border-main)] pb-1">
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
                  <p className="text-center body-text text-sm text-[var(--text-muted)] py-12">No messages yet. Start the conversation!</p>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {error && <p className="flex-none my-2 rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-2 text-xs text-[var(--error-color)]">{error}</p>}
            {status && <p className="flex-none my-2 rounded-[14px] bg-[var(--success-bg)] border border-[var(--success-color)]/30 px-4 py-2 text-xs text-[var(--success-color)]">{status}</p>}

            {/* Pinned Bottom Input Bar */}
            <div className="flex-none pt-2.5 border-t border-[var(--divider-main)]">
              {typingUsers.length > 0 && (
                <div className="mb-2 flex items-center gap-2 text-xs text-[var(--text-secondary)] italic animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-[var(--accent-color)]" />
                  <span>
                    {typingUsers.map((u) => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              )}
              {isAiProcessing && (
                <div className="mb-2 flex items-center gap-2 text-xs text-[var(--accent-color)] font-medium animate-pulse">
                  <span className="text-sm">🤖</span>
                  <span>AI Companion is generating a response for the group...</span>
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <textarea
                  value={messageText}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Type your message... (Tip: start with @ai to ask the AI in group chat)"
                  rows="2"
                  className="saas-input w-full min-h-[48px] max-h-24 resize-none"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  className="saas-button-primary min-h-[48px] px-6 sm:self-center font-bold"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-y-auto px-4 py-8 sm:px-6 lg:h-full custom-scrollbar">
          <div className="mx-auto max-w-6xl space-y-8">
            <section className="saas-card shadow-glow">
              <div className="mb-8 border-b border-[var(--divider-main)] pb-6 space-y-2">
                <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">Study groups</p>
                <h1 className="page-title">Study group collaboration</h1>
                <p className="body-text">Search, connect, and chat with peers & AI in real-time.</p>
              </div>

              {error && <p className="mb-6 rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{error}</p>}
              {status && <p className="mb-6 rounded-[14px] bg-[var(--success-bg)] border border-[var(--success-color)]/30 px-4 py-3 text-sm text-[var(--success-color)]">{status}</p>}

              <form onSubmit={joinGroupByCode} className="mb-8 flex flex-col gap-3 rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4 sm:flex-row">
                <input
                  value={joinCodeInput}
                  onChange={(event) => setJoinCodeInput(event.target.value)}
                  placeholder="Join a group by code"
                  className="saas-input w-full"
                />
                <button className="saas-button-primary">Join</button>
              </form>

              <form onSubmit={handleSearch} className="mb-8 flex flex-col gap-3 sm:flex-row">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search peers by name, email, or subject"
                  className="saas-input w-full"
                />
                <button className="saas-button-primary">
                  Search
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {searchResults.map((student) => (
                    <div key={student._id} className="lg:col-span-6 saas-elevated-card">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h2 className="card-title font-semibold">{student.name}</h2>
                          <p className="caption-text">{student.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => sendRequest(student._id)}
                          className="saas-button-primary min-h-[40px] px-4 text-xs"
                        >
                          Send request
                        </button>
                      </div>
                      <p className="body-text mt-3 text-sm">
                        Subjects: {student.interestedSubjects?.join(', ') || 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {incomingRequests.length > 0 && (
                <section className="lg:col-span-6 saas-card shadow-glow">
                  <h2 className="section-title mb-6">Incoming requests</h2>
                  <div className="space-y-4">
                    {incomingRequests.map((req) => (
                      <div key={req._id} className="saas-elevated-card">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="card-title font-semibold">{req.sender?.name}</p>
                            <p className="caption-text">{req.sender?.email}</p>
                            {req.group ? (
                              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-color)]">Group invite</p>
                            ) : (
                              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Peer request</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => respondToRequest(req._id, true)}
                              className="saas-button-primary min-h-[40px] px-4 text-xs bg-[var(--success-color)] text-white"
                            >
                              ✓ Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => respondToRequest(req._id, false)}
                              className="saas-button-secondary min-h-[40px] px-4 text-xs hover:border-[var(--error-color)] hover:text-[var(--error-color)]"
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className={`${incomingRequests.length > 0 ? 'lg:col-span-6' : 'lg:col-span-12'} saas-card shadow-glow`}>
                <h2 className="section-title mb-6">My study groups</h2>
                {groups.length > 0 ? (
                  <div className="space-y-4">
                    {groups.map((group) => (
                      <button
                        key={group._id}
                        type="button"
                        onClick={() => setSelectedGroupId(group._id)}
                        className="saas-elevated-card w-full text-left transition hover:border-[var(--accent-color)]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="card-title font-semibold">{group.groupName || 'Study Group'}</p>
                          <span className="rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                            {group.members?.length || 0}/{group.maxMembers || MAX_MEMBERS}
                          </span>
                        </div>
                        <p className="body-text mt-2 text-sm">
                          Members: {group.members?.map((m) => m.name).join(', ') || 'None'}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="body-text text-sm text-[var(--text-muted)]">No study groups yet.</p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
