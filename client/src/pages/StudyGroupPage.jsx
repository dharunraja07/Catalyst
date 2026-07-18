import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { getSocket } from '../lib/socket.js'
import ReactMarkdown from 'react-markdown'

function GroupChatAI({ groupId, api }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I can help explain concepts from your group discussion, generate notes, or suggest study materials.'
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isTyping) return

    const userMessage = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setError('')
    setIsTyping(true)

    try {
      const response = await api.post('/ai/chat', {
        message: trimmed,
        history: nextMessages.slice(-20)
      })

      if (response.status === 200 && response.data) {
        const reply = response.data.response || response.data.reply
        if (reply && typeof reply === 'string' && reply.trim().length > 0) {
          setMessages([
            ...nextMessages,
            {
              role: 'assistant',
              content: reply.trim()
            }
          ])
          return
        }
      }

      throw new Error('Invalid response format')
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Unable to reach AI service'
      setError(errorMsg)
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: `Error: ${errorMsg}`
        }
      ])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="flex h-full flex-col rounded-[2rem] border border-ink-200 bg-white p-6 shadow-glow">
      <div className="mb-4">
        <p className="text-sm uppercase tracking-[0.24em] text-brand-600/80">AI Study Assistant</p>
        <h3 className="text-lg font-semibold text-ink-900">Group companion</h3>
      </div>

      {error && <p className="mb-3 rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <div className="max-h-[35vh] flex-1 space-y-3 overflow-y-auto rounded-[1.5rem] border border-ink-200 bg-white p-3 mb-4">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-xs ${message.role === 'user'
                ? 'bg-brand-500 text-white'
                : 'bg-ink-100 text-ink-800'
                }`}
            >
              <div className="prose max-w-none leading-5">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-ink-50 px-3 py-2">
              <span className="inline-flex gap-0.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-300" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-300" style={{ animationDelay: '0.15s' }} />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-300" style={{ animationDelay: '0.3s' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              handleSend()
            }
          }}
          rows="2"
          placeholder="Ask the AI..."
          className="min-h-[2.5rem] w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs text-ink-800 focus:border-brand-400 focus:outline-none resize-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isTyping}
          className="self-end rounded-xl bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default function StudyGroupPage() {
  const { api, token, user } = useAuth()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [incomingRequests, setIncomingRequests] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [addMemberQuery, setAddMemberQuery] = useState('')
  const [addMemberResults, setAddMemberResults] = useState([])
  const [addingMember, setAddingMember] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [presenceMembers, setPresenceMembers] = useState([])
  const [unreadCounts, setUnreadCounts] = useState({})
  const [activeTab, setActiveTab] = useState('chat')
  const [materials, setMaterials] = useState([])
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [materialUploading, setMaterialUploading] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const selectedGroup = useMemo(
    () => groups.find((group) => group._id === selectedGroupId) || null,
    [groups, selectedGroupId]
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers])

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

  useEffect(() => {
    async function loadMessages() {
      if (!selectedGroupId) {
        setMessages([])
        return
      }
      try {
        const response = await api.get(`/study-groups/groups/${selectedGroupId}/messages`)
        setMessages(response.data)
      } catch (err) {
        setError('Unable to load group messages')
      }
    }
    loadMessages()
  }, [api, selectedGroupId])

  // Real-time: join the group's room and listen for messages other members
  // send, so they show up instantly instead of only after switching tabs.
  useEffect(() => {
    if (!selectedGroupId || !token) return

    const socket = getSocket(token)
    if (!socket) return

    socket.emit('join-group', selectedGroupId)

    const handleNewMessage = (incoming) => {
      if (incoming.groupId !== selectedGroupId && incoming.groupId?._id !== selectedGroupId) {
        const nextGroupId = incoming.groupId?._id || incoming.groupId
        setUnreadCounts((prev) => ({ ...prev, [nextGroupId]: (prev[nextGroupId] || 0) + 1 }))
        return
      }
      setMessages((prev) => (prev.some((m) => m._id === incoming._id) ? prev : [...prev, incoming]))
    }

    const handleGroupUpdated = (updatedGroup) => {
      setGroups((prev) => prev.map((group) => (group._id === updatedGroup._id ? updatedGroup : group)))
    }

    const handleTyping = ({ userId, name, isTyping }) => {
      if (!name || userId === user?.id || userId === user?._id) return
      setTypingUsers((prev) => {
        const next = prev.filter((entry) => entry.userId !== userId)
        if (!isTyping) return next
        return [...next, { userId, name }]
      })
    }

    const handlePresenceUpdate = ({ groupId: incomingGroupId, members = [] }) => {
      if (incomingGroupId !== selectedGroupId && incomingGroupId?._id !== selectedGroupId) return
      setPresenceMembers(members)
    }

    socket.on('new-message', handleNewMessage)
    socket.on('group-updated', handleGroupUpdated)
    socket.on('typing', handleTyping)
    socket.on('presence-update', handlePresenceUpdate)

    return () => {
      socket.emit('leave-group', selectedGroupId)
      socket.off('new-message', handleNewMessage)
      socket.off('group-updated', handleGroupUpdated)
      socket.off('typing', handleTyping)
      socket.off('presence-update', handlePresenceUpdate)
      setTypingUsers([])
      setPresenceMembers([])
    }
  }, [selectedGroupId, token, user?.id, user?._id])

  useEffect(() => {
    if (!selectedGroupId) return
    setUnreadCounts((prev) => ({ ...prev, [selectedGroupId]: 0 }))
    setActiveTab('chat')
  }, [selectedGroupId])

  const loadMaterials = async () => {
    if (!selectedGroupId) return
    setMaterialsLoading(true)
    try {
      const response = await api.get(`/study-groups/groups/${selectedGroupId}/materials`)
      setMaterials(response.data)
    } catch (err) {
      setError('Unable to load study materials')
    } finally {
      setMaterialsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'materials') loadMaterials()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedGroupId])

  const MAX_MATERIAL_BYTES = 4 * 1024 * 1024

  const handleMaterialUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selectedGroupId) return
    if (file.size > MAX_MATERIAL_BYTES) {
      setError('That file is too large — please keep uploads under 4MB.')
      return
    }

    setMaterialUploading(true)
    setError('')
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      await api.post(`/study-groups/groups/${selectedGroupId}/materials`, {
        fileName: file.name,
        fileType: file.type,
        dataUrl
      })
      setStatus(`"${file.name}" shared with the group.`)
      await loadMaterials()
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to share this file')
    } finally {
      setMaterialUploading(false)
    }
  }

  const viewMaterial = async (material) => {
    try {
      const response = await api.get(`/study-groups/materials/${material._id}`)
      const link = document.createElement('a')
      link.href = response.data.dataUrl
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      // Only force a download for non-viewable types; images/PDFs open inline.
      if (!/^(image|application\/pdf)/.test(material.fileType)) {
        link.download = material.fileName
      }
      link.click()
    } catch (err) {
      setError('Unable to open this file')
    }
  }

  const deleteMaterialItem = async (materialId) => {
    try {
      await api.delete(`/study-groups/materials/${materialId}`)
      setMaterials((prev) => prev.filter((m) => m._id !== materialId))
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to remove this file')
    }
  }

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

  const handleSearch = async (event) => {
    event.preventDefault()
    setStatus('')
    setError('')
    try {
      const response = await api.get('/study-groups/users', { params: { q: query } })
      setSearchResults(response.data)
      if (!response.data.length) {
        setStatus('No peers found for that search.')
      }
    } catch (err) {
      setError('Unable to search for peers')
    }
  }

  const sendRequest = async (receiverId) => {
    setStatus('')
    setError('')
    try {
      await api.post('/study-groups/requests', { receiverId })
      setStatus('Study request sent successfully.')
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to send request')
    }
  }

  const respondToRequest = async (requestId, accept) => {
    setStatus('')
    setError('')
    try {
      await api.post(`/study-groups/requests/${requestId}/${accept ? 'accept' : 'reject'}`)
      await refreshDashboard()
      if (accept) {
        setStatus('Request accepted and group created.')
      } else {
        setStatus('Request rejected.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update request')
    }
  }

  const emitTyping = (isTyping) => {
    if (!selectedGroupId || !token) return
    const socket = getSocket(token)
    if (!socket) return
    socket.emit('typing', { groupId: selectedGroupId, isTyping })
  }

  const handleMessageInput = (event) => {
    const nextValue = event.target.value
    setMessageText(nextValue)
    if (!selectedGroupId) return
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current)
    emitTyping(Boolean(nextValue.trim()))
    typingTimeoutRef.current = window.setTimeout(() => emitTyping(false), 1200)
  }

  const sendMessage = async () => {
    if (!selectedGroupId || !messageText.trim()) return
    setStatus('')
    setError('')
    emitTyping(false)
    try {
      await api.post(`/study-groups/groups/${selectedGroupId}/messages`, { message: messageText.trim() })
      setMessageText('')
      // No manual refetch needed: the server broadcasts the new message over
      // the socket to everyone in the room (sender included), so it'll show
      // up via the 'new-message' listener above.
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to send message')
    }
  }

  const searchMembersToAdd = async (event) => {
    event.preventDefault()
    if (!addMemberQuery.trim()) {
      setAddMemberResults([])
      return
    }
    try {
      const response = await api.get('/study-groups/users', { params: { q: addMemberQuery } })
      // Filter out members already in the group
      const filtered = response.data.filter(
        (user) => !selectedGroup.members.some((member) => member._id === user._id)
      )
      setAddMemberResults(filtered)
    } catch (err) {
      setError('Unable to search for members')
    }
  }

  const addMemberToGroup = async (userId) => {
    if (!selectedGroupId) return
    setAddingMember(true)
    try {
      const response = await api.post(`/study-groups/groups/${selectedGroupId}/add-member`, {
        groupId: selectedGroupId,
        userId
      })
      // The invited user must accept before they actually join — we no
      // longer add them to the group's member list right away.
      setStatus(response.data?.message || 'Invite sent! They will join once they accept.')
      setAddMemberQuery('')
      setAddMemberResults([])
      setShowAddMemberModal(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to send invite')
    } finally {
      setAddingMember(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-ink-50 lg:h-[calc(100vh-80px)] lg:overflow-hidden">
      {selectedGroupId && selectedGroup ? (
        // Full-screen chat view with AI assistant.
        // Mobile/tablet: stacked vertically and page-scrollable.
        // Desktop (lg+): side-by-side, chat 75% / AI assistant 25%, fixed height.
        <div className="flex h-full flex-col gap-4 p-4 lg:flex-row">
          {/* Chat column: full width on mobile, 75% on desktop */}
          <div className="flex w-full flex-col gap-4 lg:w-3/4">
            {/* Group header */}
            <div className="rounded-[2rem] border border-ink-200 bg-white p-6 shadow-glow">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold text-ink-900">{selectedGroup.groupName || 'Study Group'}</h1>
                  <p className="mt-1 text-sm text-ink-500">
                    Members: {selectedGroup.members?.length || 0}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(true)}
                    className="rounded-2xl border border-brand-500/50 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-500/10"
                  >
                    + Invite Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGroupId(null)}
                    className="rounded-2xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition hover:border-brand-400"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Chat / Materials tab switcher */}
              <div className="mt-5 flex gap-2 border-b border-ink-200 pb-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className={`rounded-t-xl px-4 py-2 text-sm font-semibold transition ${
                    activeTab === 'chat' ? 'border-b-2 border-brand-500 text-brand-600' : 'text-ink-500 hover:text-ink-800'
                  }`}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('materials')}
                  className={`rounded-t-xl px-4 py-2 text-sm font-semibold transition ${
                    activeTab === 'materials' ? 'border-b-2 border-brand-500 text-brand-600' : 'text-ink-500 hover:text-ink-800'
                  }`}
                >
                  Study materials {materials.length > 0 ? `(${materials.length})` : ''}
                </button>
              </div>

              {/* Add Member Modal */}
              {showAddMemberModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="rounded-[2rem] border border-ink-200 bg-white/95 p-8 shadow-2xl max-w-md w-full mx-4">
                    <div className="mb-6">
                      <h2 className="text-2xl font-semibold text-ink-900">Invite to Group</h2>
                      <p className="mt-2 text-sm text-ink-500">Search and add new members to your study group.</p>
                    </div>

                    <form onSubmit={searchMembersToAdd} className="mb-6 flex flex-col gap-3">
                      <input
                        type="text"
                        value={addMemberQuery}
                        onChange={(e) => setAddMemberQuery(e.target.value)}
                        placeholder="Search by name or email"
                        className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 outline-none transition focus:border-brand-400"
                      />
                      <button
                        type="submit"
                        className="rounded-2xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                      >
                        Search
                      </button>
                    </form>

                    {addMemberResults.length > 0 && (
                      <div className="mb-6 max-h-64 space-y-3 overflow-y-auto">
                        {addMemberResults.map((user) => (
                          <div key={user._id} className="flex items-center justify-between rounded-2xl bg-ink-50 p-4">
                            <div className="flex-1">
                              <p className="font-semibold text-ink-900">{user.name}</p>
                              <p className="text-xs text-ink-500">{user.email}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addMemberToGroup(user._id)}
                              disabled={addingMember}
                              className="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
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
                          setShowAddMemberModal(false)
                          setAddMemberQuery('')
                          setAddMemberResults([])
                        }}
                        className="flex-1 rounded-2xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition hover:border-brand-400"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            {activeTab === 'chat' ? (
              <div className="h-[45vh] rounded-[2rem] border border-ink-200 bg-white p-6 shadow-glow overflow-y-auto lg:h-auto lg:flex-1">
              <div className="space-y-3">
                {messages.length > 0 ? (
                  messages.map((msg) => {
                    const isMine = msg.sender?._id === user?.id
                    return (
                      <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                            isMine
                              ? 'rounded-br-sm bg-brand-500 text-white'
                              : 'rounded-bl-sm bg-ink-100 text-ink-800'
                          }`}
                        >
                          {!isMine && (
                            <p className="mb-1 text-xs font-semibold text-brand-600">{msg.sender?.name}</p>
                          )}
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          <p className={`mt-1 text-right text-[10px] ${isMine ? 'text-ink-700/70' : 'text-ink-400'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-center text-ink-500">No messages yet. Start the conversation!</p>
                )}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-brand-500/20 bg-white px-3 py-2 text-sm text-ink-600">
                      {typingUsers.map((entry) => entry.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            ) : (
              <div className="h-[45vh] rounded-[2rem] border border-ink-200 bg-white p-6 shadow-glow overflow-y-auto lg:h-auto lg:flex-1">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-ink-900">Shared study materials</h2>
                    <p className="text-sm text-ink-500">Notes, PDFs, and images shared by the group — up to 4MB per file.</p>
                  </div>
                  <label className="cursor-pointer rounded-2xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600">
                    {materialUploading ? 'Uploading…' : '+ Share a file'}
                    <input type="file" className="hidden" onChange={handleMaterialUpload} disabled={materialUploading} />
                  </label>
                </div>

                {materialsLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-16 animate-pulse rounded-2xl bg-ink-100" />
                    ))}
                  </div>
                ) : materials.length > 0 ? (
                  <div className="space-y-3">
                    {materials.map((material) => (
                      <div key={material._id} className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 p-4">
                        <button
                          type="button"
                          onClick={() => viewMaterial(material)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-lg">
                            {material.fileType?.startsWith('image') ? '🖼️' : material.fileType?.includes('pdf') ? '📄' : '📁'}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink-900">{material.fileName}</span>
                            <span className="block text-xs text-ink-400">
                              Shared by {material.uploadedBy?.name || 'a member'} · {new Date(material.uploadedAt).toLocaleDateString()}
                            </span>
                          </span>
                        </button>
                        {material.uploadedBy?._id === user?.id && (
                          <button
                            type="button"
                            onClick={() => deleteMaterialItem(material._id)}
                            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-ink-500">No study materials shared yet. Be the first!</p>
                )}
              </div>
            )}

            {/* Message input */}
            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            {status && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</p>}
            {activeTab === 'chat' && (
              <div className="rounded-[2rem] border border-ink-200 bg-white p-6 shadow-glow">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <textarea
                    value={messageText}
                    onChange={handleMessageInput}
                    onBlur={() => emitTyping(false)}
                    placeholder="Type your message..."
                    rows="3"
                    className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    className="rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 sm:self-end"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* AI assistant column: full width below chat on mobile, 25% side panel on desktop */}
          <div className="h-[55vh] w-full lg:h-full lg:w-1/4">
            <GroupChatAI groupId={selectedGroupId} api={api} />
          </div>
        </div>
      ) : (
        // Study group list view
        <div className="overflow-y-auto px-4 py-10 sm:px-6 lg:h-full">
          <div className="mx-auto max-w-6xl space-y-8">
            {/* Search and dashboard section */}
            <section className="rounded-[2rem] border border-ink-200 bg-white p-8 shadow-glow">
              <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-brand-600/80">Study groups</p>
                  <h1 className="text-3xl font-semibold text-ink-900">Study group collaboration</h1>
                </div>
                <p className="text-sm text-ink-500">Search, connect, and chat with peers.</p>
              </div>

              {error && <p className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              {status && <p className="mb-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</p>}

              <form onSubmit={handleSearch} className="mb-8 flex flex-col gap-3 sm:flex-row">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search peers by name, email, or subject"
                  className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 outline-none transition focus:border-brand-400"
                />
                <button className="rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600">
                  Search
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="grid gap-4 xl:grid-cols-2">
                  {searchResults.map((student) => (
                    <div key={student._id} className="rounded-[1.75rem] border border-ink-200 bg-ink-50 p-6">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-semibold text-ink-900">{student.name}</h2>
                          <p className="text-sm text-ink-400">{student.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => sendRequest(student._id)}
                          className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                        >
                          Send request
                        </button>
                      </div>
                      <p className="mt-4 text-ink-500">
                        Subjects: {student.interestedSubjects?.join(', ') || 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
              {/* Incoming requests */}
              {incomingRequests.length > 0 && (
                <section className="rounded-[2rem] border border-ink-200 bg-white p-8 shadow-glow">
                  <h2 className="mb-6 text-2xl font-semibold text-ink-900">Incoming requests</h2>
                  <div className="space-y-4">
                    {incomingRequests.map((req) => (
                      <div key={req._id} className="rounded-3xl border border-ink-200 bg-ink-50 p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-lg font-semibold text-ink-900">{req.sender?.name}</p>
                            <p className="text-sm text-ink-500">{req.sender?.email}</p>
                            <p className="mt-1 text-xs uppercase tracking-wide text-brand-600/80">
                              {req.type === 'group_invite'
                                ? `Invite to join "${req.groupId?.groupName || 'a study group'}"`
                                : 'Study partner request'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => respondToRequest(req._id, true)}
                              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-ink-900 transition hover:bg-emerald-400"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => respondToRequest(req._id, false)}
                              className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-ink-900 transition hover:bg-red-400"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* My study groups */}
              <section className="rounded-[2rem] border border-ink-200 bg-white p-8 shadow-glow">
                <h2 className="mb-6 text-2xl font-semibold text-ink-900">My study groups</h2>
                {groups.length > 0 ? (
                  <div className="space-y-4">
                    {groups.map((group) => (
                      <button
                        key={group._id}
                        type="button"
                        onClick={() => {
                          setSelectedGroupId(group._id)
                          setUnreadCounts((prev) => ({ ...prev, [group._id]: 0 }))
                        }}
                        className="flex w-full items-center justify-between rounded-3xl border border-ink-200 bg-ink-50 px-5 py-4 text-left transition hover:border-brand-400 hover:bg-ink-100"
                      >
                        <div>
                          <p className="text-lg font-semibold text-ink-900">{group.groupName || 'Study Group'}</p>
                          <p className="mt-2 text-sm text-ink-500">
                            Members: {group.members?.map((m) => m.name).join(', ')}
                          </p>
                        </div>
                        {unreadCounts[group._id] ? (
                          <span className="rounded-full bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white">
                            {unreadCounts[group._id]}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-500">No study groups yet.</p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
