import { useState, useEffect, useRef } from 'react'

export default function MeetChatPanel({ messages, currentUserId, onSendMessage, onClose }) {
  const [text, setText] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onSendMessage(text.trim())
    setText('')
  }

  const formatTime = (isoString) => {
    if (!isoString) return ''
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch (_) {
      return ''
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] border-l border-[var(--border-main)] overflow-hidden shadow-2xl animate-slideLeft">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-[var(--border-main)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2">
          <span className="text-base">💬</span>
          <h3 className="font-bold text-sm text-[var(--text-primary)]">In-Meeting Chat</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <span className="text-3xl mb-2">💬</span>
            <p className="text-xs font-semibold text-[var(--text-secondary)]">No messages yet</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Send a message to chat with everyone in this meeting.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.userId === currentUserId
            const initial = (msg.name?.[0] || 'U').toUpperCase()

            return (
              <div
                key={msg.id || `${msg.timestamp}_${msg.userId}`}
                className={`flex gap-2 text-xs ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center font-bold text-[11px] text-black ${
                    isSelf ? 'bg-[var(--accent-color)]' : 'bg-slate-600 text-white'
                  }`}
                >
                  {initial}
                </div>

                {/* Bubble */}
                <div className={`max-w-[78%] flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-1 px-0.5">
                    <span className="font-bold text-[11px] text-[var(--text-primary)] truncate max-w-[120px]">
                      {isSelf ? 'You' : msg.name}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>

                  <div
                    className={`px-3 py-2 rounded-[14px] text-xs leading-relaxed break-words shadow-sm ${
                      isSelf
                        ? 'bg-[var(--accent-color)] text-black font-medium rounded-tr-none'
                        : 'bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] rounded-tl-none'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-[var(--border-main)] bg-[var(--bg-secondary)] flex items-center gap-2"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send a message..."
          className="saas-input flex-1 text-xs py-2 px-3 bg-[var(--bg-primary)] border border-[var(--border-main)] focus:border-[var(--accent-color)]"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-3.5 py-2 rounded-[12px] font-bold text-xs bg-[var(--accent-color)] text-black hover:opacity-90 disabled:opacity-40 transition cursor-pointer shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  )
}
