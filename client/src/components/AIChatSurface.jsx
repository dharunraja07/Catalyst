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
  messages,
  setMessages,
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
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages))
    } catch {
      // Ignore storage failures for local browser-only history.
    }
  }, [messages, storageKey])

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

      throw new Error('Invalid response format from AI service')
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Unable to contact the AI assistant right now.'
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

  const handleClearHistory = () => {
    setMessages(getDefaultMessages(welcomeMessage))
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

      <div className="flex-1 min-h-0 overflow-y-auto rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-3 sm:p-4">
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
