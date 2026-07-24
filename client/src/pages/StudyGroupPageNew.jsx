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

    const sendMessage = async () => {
        if (!selectedGroupId || !messageText.trim()) return
        setStatus('')
        setError('')
        try {
            await api.post(`/study-groups/groups/${selectedGroupId}/messages`, { message: messageText.trim() })
            setMessageText('')
            const response = await api.get(`/study-groups/groups/${selectedGroupId}/messages`)
            setMessages(response.data)
        } catch (err) {
            setError(err.response?.data?.error || 'Unable to send message')
        }
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-[var(--bg-primary)] text-[var(--text-primary)] lg:h-[calc(100vh-80px)] lg:overflow-hidden">
            {selectedGroupId && selectedGroup ? (
                <div className="flex h-full flex-col gap-4 p-4 lg:flex-row">
                    <div className="flex w-full flex-col gap-4 lg:w-3/4">
                        <div className="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-6 shadow-glow">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{selectedGroup.groupName || 'Study Group'}</h1>
                                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                        Members: {selectedGroup.members?.length || 0}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedGroupId(null)}
                                    className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-color)]"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        <div className="h-[45vh] rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-6 shadow-glow overflow-y-auto lg:h-auto lg:flex-1">
                            <div className="space-y-4">
                                {messages.length > 0 ? (
                                    messages.map((msg) => (
                                        <div key={msg._id} className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-elevated)] p-4">
                                            <p className="text-sm font-semibold text-[var(--accent-color)]">{msg.sender?.name}</p>
                                            <p className="mt-2 text-[var(--text-primary)]">{msg.message}</p>
                                            <p className="mt-2 text-xs text-[var(--text-muted)]">
                                                {new Date(msg.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-[var(--text-muted)]">No messages yet. Start the conversation!</p>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {error && <p className="rounded-2xl bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{error}</p>}
                        {status && <p className="rounded-2xl bg-[var(--success-bg)] border border-[var(--success-color)]/30 px-4 py-3 text-sm text-[var(--success-color)]">{status}</p>}
                        <div className="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-6 shadow-glow">
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <textarea
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder="Type your message..."
                                    rows="3"
                                    className="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={sendMessage}
                                    className="rounded-2xl bg-[var(--accent-color)] px-6 py-3 text-sm font-semibold text-[var(--accent-contrast-text)] transition hover:bg-[var(--accent-hover)] sm:self-end"
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
                <div className="overflow-y-auto px-4 py-10 sm:px-6 lg:h-full">
                    <div className="mx-auto max-w-6xl space-y-8">
                        <section className="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-8 shadow-glow">
                            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-sm uppercase tracking-[0.24em] text-[var(--accent-color)]">Study groups</p>
                                    <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Study group collaboration</h1>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)]">Search, connect, and chat with peers.</p>
                            </div>

                            {error && <p className="mb-6 rounded-2xl bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{error}</p>}
                            {status && <p className="mb-6 rounded-2xl bg-[var(--success-bg)] border border-[var(--success-color)]/30 px-4 py-3 text-sm text-[var(--success-color)]">{status}</p>}

                            <form onSubmit={handleSearch} className="mb-8 flex flex-col gap-3 sm:flex-row">
                                <input
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Search peers by name, email, or subject"
                                    className="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-color)]"
                                />
                                <button className="rounded-2xl bg-[var(--accent-color)] px-5 py-3 text-sm font-semibold text-[var(--accent-contrast-text)] transition hover:bg-[var(--accent-hover)]">
                                    Search
                                </button>
                            </form>

                            {searchResults.length > 0 && (
                                <div className="grid gap-4 xl:grid-cols-2">
                                    {searchResults.map((student) => (
                                        <div key={student._id} className="rounded-[1.75rem] border border-[var(--border-main)] bg-[var(--bg-elevated)] p-6">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">{student.name}</h2>
                                                    <p className="text-sm text-[var(--text-muted)]">{student.email}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => sendRequest(student._id)}
                                                    className="rounded-full bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast-text)] transition hover:bg-[var(--accent-hover)]"
                                                >
                                                    Send request
                                                </button>
                                            </div>
                                            <p className="mt-4 text-[var(--text-secondary)]">
                                                Subjects: {student.interestedSubjects?.join(', ') || 'N/A'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
                            {incomingRequests.length > 0 && (
                                <section className="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-8 shadow-glow">
                                    <h2 className="mb-6 text-2xl font-semibold text-[var(--text-primary)]">Incoming requests</h2>
                                    <div className="space-y-4">
                                        {incomingRequests.map((req) => (
                                            <div key={req._id} className="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-elevated)] p-5">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div>
                                                        <p className="text-lg font-semibold text-[var(--text-primary)]">{req.sender?.name}</p>
                                                        <p className="text-sm text-[var(--text-secondary)]">{req.sender?.email}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => respondToRequest(req._id, true)}
                                                            className="rounded-full bg-[var(--success-color)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => respondToRequest(req._id, false)}
                                                            className="rounded-full bg-[var(--error-color)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
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

                            <section className="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-8 shadow-glow">
                                <h2 className="mb-6 text-2xl font-semibold text-[var(--text-primary)]">My study groups</h2>
                                {groups.length > 0 ? (
                                    <div className="space-y-4">
                                        {groups.map((group) => (
                                            <button
                                                key={group._id}
                                                type="button"
                                                onClick={() => setSelectedGroupId(group._id)}
                                                className="w-full rounded-3xl border border-[var(--border-main)] bg-[var(--bg-elevated)] px-5 py-4 text-left transition hover:border-[var(--accent-color)] hover:bg-[var(--bg-secondary)]"
                                            >
                                                <p className="text-lg font-semibold text-[var(--text-primary)]">{group.groupName || 'Study Group'}</p>
                                                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                                    Members: {group.members?.map((m) => m.name).join(', ')}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[var(--text-muted)]">No study groups yet.</p>
                                )}
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
