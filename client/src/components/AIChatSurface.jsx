import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

function getDefaultMessages(welcomeMessage) {
  return [
    {
      role: 'assistant',
      content: welcomeMessage
    }
  ]
}

export default function AIChatSurface({
  api,
  conversationId = null,
  messages: externalMessages,
  setMessages: externalSetMessages,
  onConversationUpdate = null,
  storageKey = null,
  welcomeMessage = 'Hi! I can help you review notes, summarize discussions, or suggest study ideas.',
  title = 'AI assistant',
  subtitle = 'Study companion',
  placeholder = 'Ask for help with your studies...',
  className = '',
  showHeader = true,
  emptyStateText = 'Start a conversation and I will help you study smarter.',
  onShareToGroup = null
}) {
  const [localMessages, setLocalMessages] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState('')
  
  const endRef = useRef(null)
  const scrollContainerRef = useRef(null)

  const messages = conversationId ? localMessages : (externalMessages || [])
  const setMessages = conversationId ? setLocalMessages : externalSetMessages

  const scrollToBottom = (behavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior
      })
    } else {
      endRef.current?.scrollIntoView({ behavior })
    }
  }

  // Load initial messages for conversationId from MongoDB Atlas
  useEffect(() => {
    if (!conversationId) return

    async function loadConversationMessages() {
      setError('')
      try {
        const response = await api.get(`/ai/conversations/${conversationId}/messages`, {
          params: { limit: 30 }
        })
        const fetchedMsgs = response.data || []
        setLocalMessages(fetchedMsgs)
        setHasMore(fetchedMsgs.length >= 30)
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
          }
        })
      } catch (err) {
        setError('Unable to load AI chat messages')
      }
    }

    loadConversationMessages()
  }, [api, conversationId])

  // Reverse Infinite Scroll handler for AI Chat
  const loadOlderMessages = async () => {
    if (!conversationId || loadingOlder || !hasMore || localMessages.length === 0) return

    const container = scrollContainerRef.current
    if (!container) return

    const oldestMsg = localMessages[0]
    if (!oldestMsg || !oldestMsg._id) return

    setLoadingOlder(true)
    const oldScrollHeight = container.scrollHeight
    const oldScrollTop = container.scrollTop

    try {
      const response = await api.get(`/ai/conversations/${conversationId}/messages`, {
        params: { limit: 30, before: oldestMsg._id }
      })
      const older = response.data || []
      if (older.length < 30) {
        setHasMore(false)
      }

      if (older.length > 0) {
        setLocalMessages((prev) => {
          const prevIds = new Set(prev.map((m) => m._id))
          const filteredNew = older.filter((m) => !prevIds.has(m._id))
          return [...filteredNew, ...prev]
        })

        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight
            container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight)
          }
        })
      }
    } catch {
      // ignore
    } finally {
      setLoadingOlder(false)
    }
  }

  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return

    if (container.scrollTop <= 50 && hasMore && !loadingOlder && conversationId) {
      loadOlderMessages()
    }
  }

  useEffect(() => {
    if (!conversationId && storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages))
      } catch {
        // ignore
      }
    }
  }, [conversationId, messages, storageKey])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isTyping) return

    setInput('')
    setError('')
    setIsTyping(true)

    // Mode A: Persistent MongoDB Atlas conversation
    if (conversationId) {
      const tempUserMsg = { _id: `temp-${Date.now()}`, role: 'user', content: trimmed }
      setLocalMessages((prev) => [...prev, tempUserMsg])
      requestAnimationFrame(() => scrollToBottom('smooth'))

      try {
        const response = await api.post(`/ai/conversations/${conversationId}/messages`, {
          message: trimmed
        })

        if (response.data) {
          const { userMessage, assistantMessage, conversation } = response.data
          setLocalMessages((prev) => {
            const withoutTemp = prev.filter((m) => m._id !== tempUserMsg._id)
            return [...withoutTemp, userMessage, assistantMessage]
          })
          if (conversation && onConversationUpdate) {
            onConversationUpdate(conversation)
          }
          requestAnimationFrame(() => scrollToBottom('smooth'))
          return
        }
      } catch (err) {
        const errorMsg = err.response?.data?.error || err.message || 'Unable to contact AI assistant.'
        setError(errorMsg)
        setLocalMessages((prev) => [
          ...prev.filter((m) => m._id !== tempUserMsg._id),
          { role: 'user', content: trimmed },
          { role: 'assistant', content: `Error: ${errorMsg}` }
        ])
      } finally {
        setIsTyping(false)
      }
      return
    }

    // Mode B: Non-persisted or custom handler (Group chat AI companion)
    const userMessage = { role: 'user', content: trimmed }
    const nextMessages = [...(messages || []), userMessage]
    setMessages?.(nextMessages)
    requestAnimationFrame(() => scrollToBottom('smooth'))

    try {
      const response = await api.post('/ai/chat', {
        message: trimmed,
        history: nextMessages.slice(-20)
      })

      if (response.status === 200 && response.data) {
        const reply = response.data.response || response.data.reply
        if (reply && typeof reply === 'string' && reply.trim().length > 0) {
          setMessages?.([
            ...nextMessages,
            {
              role: 'assistant',
              content: reply.trim()
            }
          ])
          requestAnimationFrame(() => scrollToBottom('smooth'))
          return
        }
      }

      throw new Error('Invalid response format from AI service')
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Unable to contact the AI assistant right now.'
      setError(errorMsg)
      setMessages?.([
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

  const handleClearHistory = () => {
    if (conversationId) {
      api.delete(`/ai/conversations/${conversationId}`).catch(() => {})
      setLocalMessages([])
      return
    }
    setMessages?.(getDefaultMessages(welcomeMessage))
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // ignore
      }
    }
  }

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      {showHeader && (
        <div className="mb-3 border-b border-[var(--divider-main)] pb-3 flex items-center justify-between">
          <div>
            <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">{title}</p>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{subtitle}</h3>
          </div>
          <button
            type="button"
            onClick={handleClearHistory}
            className="saas-button-secondary min-h-[34px] px-2.5 text-xs text-[var(--text-secondary)] hover:text-[var(--error-color)] hover:border-[var(--error-color)] flex items-center gap-1"
            title="Clear chat history"
          >
            <span>🗑️ Clear</span>
          </button>
        </div>
      )}

      {error && (
        <p className="mb-3 rounded-[14px] border border-[var(--error-color)]/30 bg-[var(--error-bg)] px-3 py-2 text-xs text-[var(--error-color)]">
          {error}
        </p>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-3 sm:p-4 custom-scrollbar"
      >
        {loadingOlder && (
          <div className="flex justify-center py-2 text-xs text-[var(--accent-color)] font-semibold items-center gap-2">
            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading older messages...</span>
          </div>
        )}
        {messages.length > 0 ? (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[92%] rounded-[14px] px-3 py-2 text-sm leading-6 ${message.role === 'user'
                    ? 'bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-medium'
                    : 'border border-[var(--border-main)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  }`}
                >
                  <div className="prose prose-invert max-w-none text-sm leading-6">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>
                {message.role === 'assistant' && onShareToGroup && (
                  <button
                    type="button"
                    onClick={() => onShareToGroup(message.content)}
                    className="mt-1 text-[11px] font-semibold text-[var(--accent-color)] hover:underline flex items-center gap-1"
                  >
                    <span>📤 Share to Group Chat</span>
                  </button>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 py-2">
                  <span className="inline-flex gap-1">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-color)]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-color)]" style={{ animationDelay: '0.15s' }} />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-color)]" style={{ animationDelay: '0.3s' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        ) : (
          <div className="flex h-full min-h-[8rem] items-center justify-center px-4 text-center text-sm text-[var(--text-muted)]">
            {emptyStateText}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
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
          placeholder={placeholder}
          className="saas-input min-h-[48px] w-full resize-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isTyping}
          className="saas-button-primary self-end"
        >
          Send
        </button>
      </div>
    </div>
  )
}
