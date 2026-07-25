import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import AIChatSurface from '../components/AIChatSurface.jsx'

const MAX_MEMBERS = 15

function GroupChatAI({ groupId, api }) {
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
        welcomeMessage="Hi! I can help explain concepts from your group discussion, generate notes, or suggest study materials."
        title="AI Study Assistant"
        subtitle="Group companion"
        placeholder="Ask the AI..."
        className="h-full"
        showHeader
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
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteResults, setInviteResults] = useState([])
  const [inviting, setInviting] = useState(false)
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [renameDraft, setRenameDraft] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [isEditingGroupName, setIsEditingGroupName] = useState(false)
  const [showSettingsPopover, setShowSettingsPopover] = useState(false)
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
        const response = await api.get(`/study-groups/groups/${selectedGroupId}/messages`)
        setMessages(response.data)
      } catch (err) {
        setError('Unable to load group messages')
      }
    }

    loadMessages()
    const interval = window.setInterval(loadMessages, 4000)
    return () => window.clearInterval(interval)
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
    if (!messageText.trim() || !selectedGroupId) return

    try {
      await api.post(`/study-groups/groups/${selectedGroupId}/messages`, {
        message: messageText.trim()
      })
      setMessageText('')
      const response = await api.get(`/study-groups/groups/${selectedGroupId}/messages`)
      setMessages(response.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message')
    }
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
      setInviteResults((prev) => prev.filter((user) => user._id !== userId))
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
    <main className="min-h-[calc(100vh-80px)] bg-[var(--bg-primary)] text-[var(--text-primary)] lg:h-[calc(100vh-80px)] lg:overflow-hidden">
      {selectedGroupId && selectedGroup ? (
        <div className="mx-auto flex h-full max-w-7xl flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:flex-row">
          <div className="flex min-h-0 w-full flex-col gap-4 lg:w-3/4">
            <div className="saas-card shadow-glow">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--divider-main)] pb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {isEditingGroupName && selectedGroup.createdBy?._id === user?.id ? (
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
                        className="saas-input max-w-[220px] min-h-[40px]"
                        autoFocus
                      />
                    ) : (
                      <h1 className="section-title break-words">{selectedGroup.groupName || 'Study Group'}</h1>
                    )}
                    {selectedGroup.createdBy?._id === user?.id && !isEditingGroupName && (
                      <button
                        type="button"
                        onClick={() => {
                          setRenameDraft(selectedGroup.groupName || '')
                          setIsEditingGroupName(true)
                        }}
                        className="rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] p-2 text-sm text-[var(--text-secondary)]"
                        aria-label="Rename group"
                      >
                        ✎
                      </button>
                    )}
                    {isEditingGroupName && selectedGroup.createdBy?._id === user?.id && (
                      <div className="flex gap-2">
                        <button type="button" onClick={renameGroup} disabled={isRenaming} className="saas-button-primary min-h-[40px] px-3 text-xs">
                          {isRenaming ? 'Saving...' : 'Save'}
                        </button>
                        <button type="button" onClick={() => { setIsEditingGroupName(false); setRenameDraft(selectedGroup.groupName || '') }} className="saas-button-secondary min-h-[40px] px-3 text-xs">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="small-text mt-1">
                    {selectedGroup.members?.length || 0}/{selectedGroup.maxMembers || MAX_MEMBERS} members
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(true)}
                    className="saas-button-primary min-h-[40px] px-4 text-xs"
                    disabled={(selectedGroup.members?.length || 0) >= (selectedGroup.maxMembers || MAX_MEMBERS)}
                  >
                    Invite
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMembersModal(true)}
                    className="saas-button-secondary min-h-[40px] px-4 text-xs"
                  >
                    Members
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

              {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="saas-card max-w-md w-full shadow-2xl">
                    <div className="mb-6">
                      <h2 className="section-title">Invite a member</h2>
                      <p className="small-text mt-1">Search for a student and send them a group invite. They can accept or reject it.</p>
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
                      <div className="mb-6 max-h-64 space-y-3 overflow-y-auto">
                        {inviteResults.map((user) => (
                          <div key={user._id} className="flex items-center justify-between rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4">
                            <div className="flex-1">
                              <p className="card-title text-base">{user.name}</p>
                              <p className="caption-text">{user.email}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => inviteToGroup(user._id)}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="saas-card max-w-md w-full shadow-2xl">
                    <div className="mb-6">
                      <h2 className="section-title">Group members</h2>
                      <p className="small-text mt-1">Everyone currently in this study group.</p>
                    </div>
                    <div className="space-y-3">
                      {selectedGroup.members?.map((member) => (
                        <div key={member._id} className="flex items-center justify-between rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4">
                          <div>
                            <p className="card-title text-base">{member.name}</p>
                            <p className="caption-text">{member.email}</p>
                          </div>
                          {selectedGroup.createdBy?._id === member._id && (
                            <span className="rounded-full bg-[var(--accent-color)] px-3 py-1 text-xs font-semibold text-black">Admin</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 flex gap-3">
                      <button type="button" onClick={() => setShowMembersModal(false)} className="saas-button-secondary w-full">Close</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col saas-card shadow-glow">
              <div className="mb-3 flex items-center justify-between border-b border-[var(--divider-main)] pb-3">
                <div>
                  <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">Conversation</p>
                  <h2 className="section-title">Group chat</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettingsPopover((prev) => !prev)}
                  className="rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                >
                  Settings
                </button>
              </div>

              {showSettingsPopover && (
                <div className="mb-3 rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-3">
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

              <div className="flex-1 min-h-0 overflow-y-auto rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-3 sm:p-4">
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

          <div className="h-[50vh] w-full min-h-0 lg:h-full lg:w-1/4">
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
