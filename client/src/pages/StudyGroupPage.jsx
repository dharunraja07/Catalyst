import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
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
    <div className="flex h-full flex-col rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-6 shadow-glow">
      <div className="mb-4">
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--accent-color)]">AI Study Assistant</p>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Group companion</h3>
      </div>

      {error && <p className="mb-3 rounded-2xl bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-3 py-2 text-xs text-[var(--error-color)]">{error}</p>}

      <div className="max-h-[35vh] flex-1 space-y-3 overflow-y-auto rounded-[1.5rem] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-3 mb-4">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-xs ${message.role === 'user'
                ? 'bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-medium'
                : 'bg-[var(--bg-elevated)] border border-[var(--border-main)] text-[var(--text-primary)]'
                }`}
            >
              <div className="prose prose-invert max-w-none leading-5">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-main)] px-3 py-2">
              <span className="inline-flex gap-0.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-color)]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-color)]" style={{ animationDelay: '0.15s' }} />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-color)]" style={{ animationDelay: '0.3s' }} />
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
          className="min-h-[2.5rem] w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none resize-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isTyping}
          className="self-end rounded-xl bg-[var(--accent-color)] px-3 py-2 text-xs font-semibold text-[var(--accent-contrast-text)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default function StudyGroupPage() {
  const { api } = useAuth()
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
  const messagesEndRef = useRef(null)

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

  useEffect(() => {
    async function loadMessages() {
      if (!selectedGroupId) {
        setMessages([])
        return
      }

      try {
        const response = await api.get(`/study-groups/${selectedGroupId}/messages`)
        setMessages(response.data)
      } catch (err) {
        setError('Unable to load group messages')
      }
    }

    loadMessages()
    const interval = window.setInterval(loadMessages, 4000)
    return () => window.clearInterval(interval)
  }, [api, selectedGroupId])

  const handleSearch = async (event) => {
    event.preventDefault()
    if (!query.trim()) return

    try {
      const response = await api.get(`/study-groups/students/search?query=${encodeURIComponent(query.trim())}`)
      setSearchResults(response.data)
    } catch (err) {
      setError('Search failed')
    }
  }

  const sendRequest = async (recipientId) => {
    try {
      await api.post('/study-groups/requests', { recipientId })
      setStatus('Study group request sent!')
      setTimeout(() => setStatus(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send request')
    }
  }

  const respondToRequest = async (requestId, accept) => {
    try {
      await api.post(`/study-groups/requests/${requestId}/respond`, { accept })
      setIncomingRequests((prev) => prev.filter((item) => item._id !== requestId))
      if (accept) {
        const groupsResp = await api.get('/study-groups/groups')
        setGroups(groupsResp.data)
      }
    } catch (err) {
      setError('Unable to respond to request')
    }
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedGroupId) return

    try {
      const response = await api.post(`/study-groups/${selectedGroupId}/messages`, {
        message: messageText.trim()
      })
      setMessages((prev) => [...prev, response.data])
      setMessageText('')
    } catch (err) {
      setError('Failed to send message')
    }
  }

  const searchMembersToAdd = async (event) => {
    event.preventDefault()
    if (!addMemberQuery.trim()) return

    try {
      const response = await api.get(`/study-groups/students/search?query=${encodeURIComponent(addMemberQuery.trim())}`)
      setAddMemberResults(response.data)
    } catch (err) {
      setError('Member search failed')
    }
  }

  const addMemberToGroup = async (userId) => {
    if (!selectedGroupId) return

    setAddingMember(true)
    try {
      await api.post(`/study-groups/${selectedGroupId}/members`, { userId })
      setStatus('Member added to group!')
      setTimeout(() => setStatus(''), 3000)
      const groupsResp = await api.get('/study-groups/groups')
      setGroups(groupsResp.data)
      setAddMemberResults((prev) => prev.filter((user) => user._id !== userId))
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member')
    } finally {
      setAddingMember(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[var(--bg-primary)] text-[var(--text-primary)] lg:h-[calc(100vh-80px)] lg:overflow-hidden">
      {selectedGroupId && selectedGroup ? (
        <div className="flex h-full flex-col gap-6 p-4 sm:p-6 lg:flex-row max-w-7xl mx-auto">
          <div className="flex w-full flex-col gap-6 lg:w-3/4">
            <div className="saas-card shadow-glow">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--divider-main)] pb-4">
                <div>
                  <h1 className="section-title">{selectedGroup.groupName || 'Study Group'}</h1>
                  <p className="small-text mt-1">
                    Members: {selectedGroup.members?.length || 0}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(true)}
                    className="saas-button-primary min-h-[40px] px-4 text-xs"
                  >
                    + Add Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGroupId(null)}
                    className="saas-button-secondary min-h-[40px] px-4 text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>

              {showAddMemberModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                  <div className="saas-card max-w-md w-full shadow-2xl">
                    <div className="mb-6">
                      <h2 className="section-title">Add Member to Group</h2>
                      <p className="small-text mt-1">Search and add new members to your study group.</p>
                    </div>

                    <form onSubmit={searchMembersToAdd} className="mb-6 flex flex-col gap-3">
                      <input
                        type="text"
                        value={addMemberQuery}
                        onChange={(e) => setAddMemberQuery(e.target.value)}
                        placeholder="Search by name or email"
                        className="saas-input w-full"
                      />
                      <button
                        type="submit"
                        className="saas-button-primary"
                      >
                        Search
                      </button>
                    </form>

                    {addMemberResults.length > 0 && (
                      <div className="mb-6 max-h-64 space-y-3 overflow-y-auto">
                        {addMemberResults.map((user) => (
                          <div key={user._id} className="flex items-center justify-between rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4">
                            <div className="flex-1">
                              <p className="card-title text-base">{user.name}</p>
                              <p className="caption-text">{user.email}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addMemberToGroup(user._id)}
                              disabled={addingMember}
                              className="saas-button-primary min-h-[36px] px-3 text-xs disabled:opacity-50"
                            >
                              Add
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
                        className="saas-button-secondary w-full"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="h-[45vh] saas-card shadow-glow overflow-y-auto lg:h-auto lg:flex-1">
              <div className="space-y-4">
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <div key={msg._id} className="saas-elevated-card p-4">
                      <p className="small-text font-bold text-[var(--accent-color)]">{msg.sender?.name}</p>
                      <p className="body-text mt-1 text-sm">{msg.message}</p>
                      <p className="caption-text mt-2">
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-center body-text text-sm text-[var(--text-muted)] py-8">No messages yet. Start the conversation!</p>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {error && <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{error}</p>}
            {status && <p className="rounded-[14px] bg-[var(--success-bg)] border border-[var(--success-color)]/30 px-4 py-3 text-sm text-[var(--success-color)]">{status}</p>}
            <div className="saas-card shadow-glow">
              <div className="flex flex-col gap-3 sm:flex-row">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message..."
                  rows="2"
                  className="saas-input w-full min-h-[48px]"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  className="saas-button-primary sm:self-end"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          <div className="h-[55vh] w-full lg:h-full lg:w-1/4">
            <GroupChatAI groupId={selectedGroupId} api={api} />
          </div>
        </div>
      ) : (
        <div className="overflow-y-auto px-4 py-8 sm:px-6 lg:h-full">
          <div className="mx-auto max-w-7xl space-y-8">
            <section className="saas-card shadow-glow">
              <div className="mb-8 border-b border-[var(--divider-main)] pb-6 space-y-2">
                <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">Study groups</p>
                <h1 className="page-title">Study group collaboration</h1>
                <p className="body-text">Search, connect, and chat with peers.</p>
              </div>

              {error && <p className="mb-6 rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{error}</p>}
              {status && <p className="mb-6 rounded-[14px] bg-[var(--success-bg)] border border-[var(--success-color)]/30 px-4 py-3 text-sm text-[var(--success-color)]">{status}</p>}

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
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="card-title font-semibold">{req.sender?.name}</p>
                            <p className="caption-text">{req.sender?.email}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => respondToRequest(req._id, true)}
                              className="saas-button-primary min-h-[40px] px-4 text-xs bg-[var(--success-color)] text-white"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => respondToRequest(req._id, false)}
                              className="saas-button-secondary min-h-[40px] px-4 text-xs hover:border-[var(--error-color)] hover:text-[var(--error-color)]"
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
                        <p className="card-title font-semibold">{group.groupName || 'Study Group'}</p>
                        <p className="body-text mt-2 text-sm">
                          Members: {group.members?.map((m) => m.name).join(', ')}
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
