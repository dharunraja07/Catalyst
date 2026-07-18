import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../context/AuthContext.jsx'

function PanelHeader({ title, onNewChat, onClose }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-brand-600/80">AI study assistant</p>
        <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onNewChat}
          className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-600"
        >
          New chat
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default function GlobalAIChat() {
  const { user, api, token } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)

  const isAuthenticated = Boolean(user && token)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!isAuthenticated) return
    async function loadConversations() {
      try {
        const response = await api.get('/chat')
        setConversations(response.data || [])
        if (response.data?.[0]?._id) {
          setActiveConversationId(response.data[0]._id)
          setMessages([])
        }
      } catch (err) {
        setError('Unable to load chat history')
      }
    }
    loadConversations()
  }, [api, isAuthenticated])

  useEffect(() => {
    if (!activeConversationId || !isAuthenticated) return
    async function loadConversation() {
      setLoadingHistory(true)
      try {
        const response = await api.get(`/chat/${activeConversationId}`)
        setMessages(response.data?.messages || [])
      } catch (err) {
        setMessages([])
      } finally {
        setLoadingHistory(false)
      }
    }
    loadConversation()
  }, [activeConversationId, api, isAuthenticated])

  const selectConversation = async (conversationId) => {
    setActiveConversationId(conversationId)
    setMessages([])
  }

  const startNewChat = async () => {
    try {
      const response = await api.post('/chat', {})
      const created = response.data
      setConversations((prev) => [created, ...prev])
      setActiveConversationId(created._id)
      setMessages([])
      setDraft('')
    } catch (err) {
      setError('Unable to start a new chat')
    }
  }

  const sendMessage = async () => {
    const trimmed = draft.trim()
    if (!trimmed || loading || !activeConversationId) return

    setLoading(true)
    setError('')
    const optimisticUserMessage = { role: 'user', content: trimmed, createdAt: new Date().toISOString() }
    setMessages((prev) => [...prev, optimisticUserMessage])
    setDraft('')

    try {
      const response = await api.post(`/chat/${activeConversationId}/messages`, { message: trimmed })
      const nextMessages = response.data?.messages || []
      setMessages(nextMessages)
      const fresh = await api.get('/chat')
      setConversations(fresh.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to send message')
      setMessages((prev) => prev.filter((item) => item !== optimisticUserMessage))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (conversationId) => {
    try {
      await api.delete(`/chat/${conversationId}`)
      const remaining = conversations.filter((item) => item._id !== conversationId)
      setConversations(remaining)
      if (activeConversationId === conversationId) {
        const nextConversation = remaining[0]
        setActiveConversationId(nextConversation?._id || null)
        setMessages([])
      }
    } catch (err) {
      setError('Unable to delete chat')
    }
  }

  const conversationTitle = useMemo(() => {
    const active = conversations.find((item) => item._id === activeConversationId)
    return active?.title || 'AI Study Assistant'
  }, [activeConversationId, conversations])

  if (!isAuthenticated) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-2xl shadow-brand-500/20 transition hover:scale-105 lg:bottom-5"
        aria-label="Open AI assistant"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
          <path d="M12 3c3.3 0 6 2.7 6 6 0 1.1-.3 2.1-.9 3 .7.9 1.1 2 1.1 3.2 0 3.3-2.7 6-6 6-3.3 0-6-2.7-6-6 0-1.2.4-2.3 1.1-3.2A5.98 5.98 0 0 1 6 9c0-3.3 2.7-6 6-6Zm0 2a4 4 0 0 0-4 4c0 .9.3 1.7.8 2.4l.3.4-.4.4A3.96 3.96 0 0 0 8 13.4c0 2.2 1.8 4 4 4 2.2 0 4-1.8 4-4 0-1-.4-1.9-1.1-2.6l-.4-.4.3-.4A3.98 3.98 0 0 0 16 9a4 4 0 0 0-4-4Z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink-50 p-3 sm:p-6">
          <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-ink-200 bg-white/95 shadow-2xl">
            <PanelHeader title={conversationTitle} onNewChat={startNewChat} onClose={() => setIsOpen(false)} />
            <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
              <aside className="w-full border-b border-ink-200 bg-white p-3 lg:w-72 lg:border-b-0 lg:border-r">
                <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-ink-400">History</p>
                <div className="space-y-2 overflow-y-auto">
                  {conversations.length ? conversations.map((conversation) => (
                    <div key={conversation._id} className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-ink-50 p-2">
                      <button
                        type="button"
                        onClick={() => selectConversation(conversation._id)}
                        className="flex-1 truncate text-left text-sm text-ink-700"
                      >
                        {conversation.title || 'New chat'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(conversation._id)}
                        className="text-xs text-ink-400"
                      >
                        Delete
                      </button>
                    </div>
                  )) : <p className="rounded-2xl border border-dashed border-ink-200 px-3 py-4 text-sm text-ink-500">No conversations yet.</p>}
                </div>
              </aside>

              <div className="flex flex-1 flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto bg-ink-50 p-4">
                  {loadingHistory ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
                          <div className={`h-9 w-2/3 animate-pulse rounded-2xl ${i % 2 ? 'bg-brand-200' : 'bg-ink-200'}`} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {messages.map((message, index) => (
                        <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${message.role === 'user' ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-800'}`}>
                            <div className="prose max-w-none break-words">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      ))}
                      {loading ? (
                        <div className="flex justify-start">
                          <div className="flex items-center gap-1 rounded-2xl bg-ink-100 px-4 py-3">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: '0ms' }} />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: '120ms' }} />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: '240ms' }} />
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                  {error ? <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
                  <div ref={endRef} />
                </div>

                <div className="border-t border-ink-200 bg-white p-3">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows="3"
                    placeholder="Ask anything about your study plan..."
                    className="w-full resize-none rounded-2xl border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-800 outline-none focus:border-brand-400"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        sendMessage()
                      }
                    }}
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-ink-400">Your conversations are stored securely in your account.</p>
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={loading || !draft.trim()}
                      className="rounded-2xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
