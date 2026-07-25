import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import AIChatSurface from './AIChatSurface.jsx'

function makeConversationTitle(message) {
  const text = (message || '').trim()
  if (!text) return 'New chat'
  return text.length > 30 ? `${text.slice(0, 27)}...` : text
}

function createConversation(firstMessage) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: makeConversationTitle(firstMessage),
    messages: [
      {
        role: 'assistant',
        content: 'Hi! I can help you with notes, study plans, summaries, or questions across the app.'
      }
    ],
    updatedAt: Date.now()
  }
}

export default function FloatingAIAssistant() {
  const { api } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [showHistoryMobile, setShowHistoryMobile] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [renameDraft, setRenameDraft] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = window.localStorage.getItem('catalyst_ai_conversations')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed)
          setActiveConversationId(parsed[0].id)
          return
        }
      }
    } catch {
      // ignore invalid storage
    }

    const firstConversation = createConversation('')
    setConversations([firstConversation])
    setActiveConversationId(firstConversation.id)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('catalyst_ai_conversations', JSON.stringify(conversations))
    } catch {
      // ignore storage errors
    }
  }, [conversations])

  const activeConversation = useMemo(() => {
    return conversations.find((conversation) => conversation.id === activeConversationId) || conversations[0] || null
  }, [activeConversationId, conversations])

  const startNewConversation = () => {
    const nextConversation = createConversation('')
    setConversations((prev) => [nextConversation, ...prev])
    setActiveConversationId(nextConversation.id)
    setShowHistoryMobile(false)
  }

  const selectConversation = (id) => {
    setActiveConversationId(id)
    setShowHistoryMobile(false)
  }

  const deleteConversation = (id, event) => {
    if (event) event.stopPropagation()
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id)
      if (filtered.length === 0) {
        const brandNew = createConversation('')
        setActiveConversationId(brandNew.id)
        return [brandNew]
      }
      if (activeConversationId === id) {
        setActiveConversationId(filtered[0].id)
      }
      return filtered
    })
  }

  const startRenaming = (conversation, event) => {
    if (event) event.stopPropagation()
    setEditingId(conversation.id)
    setRenameDraft(conversation.title || 'New chat')
  }

  const saveRename = (id) => {
    if (!renameDraft.trim()) {
      setEditingId(null)
      return
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: renameDraft.trim(), updatedAt: Date.now() } : c))
    )
    setEditingId(null)
  }

  const handleMessagesChange = (messages) => {
    if (!activeConversationId) return
    setConversations((prev) => prev.map((conversation) => {
      if (conversation.id !== activeConversationId) return conversation
      const nextTitle = conversation.title === 'New chat' || conversation.title === 'Untitled conversation'
        ? makeConversationTitle(messages.find((message) => message.role === 'user')?.content || '')
        : conversation.title
      return {
        ...conversation,
        messages,
        title: nextTitle || 'New chat',
        updatedAt: Date.now()
      }
    }))
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border-main)] bg-[var(--accent-color)] text-xl text-[var(--accent-contrast-text)] shadow-glow transition hover:scale-105 sm:bottom-6 sm:right-6"
        aria-label="Open AI assistant"
      >
        ✦
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-end bg-black/20 p-3 sm:inset-auto sm:bottom-6 sm:right-6 sm:p-0">
      <div className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-[var(--border-main)] bg-[var(--bg-surface)] shadow-2xl sm:h-[78vh] sm:w-[min(92vw,980px)]">
        <div className="flex items-center justify-between border-b border-[var(--divider-main)] bg-[var(--bg-secondary)] px-4 py-3 sm:px-5">
          <div>
            <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">AI assistant</p>
            <h2 className="section-title">Claude-style companion</h2>
          </div>
          <button type="button" onClick={() => setIsOpen(false)} className="saas-button-secondary min-h-[40px] px-3 text-xs">
            Close
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          <aside className={`${showHistoryMobile ? 'flex' : 'hidden'} w-full flex-col border-b border-[var(--divider-main)] bg-[var(--bg-secondary)] md:flex md:w-72 md:border-b-0 md:border-r`}>
            <div className="flex items-center justify-between border-b border-[var(--divider-main)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">History</p>
              <button type="button" onClick={startNewConversation} className="saas-button-primary min-h-[36px] px-3 text-xs">
                + New chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              <div className="flex items-center justify-between gap-2 md:hidden">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Conversations</p>
                <button type="button" onClick={() => setShowHistoryMobile(false)} className="saas-button-secondary min-h-[36px] px-3 text-xs">
                  Hide
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt).map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => selectConversation(conversation.id)}
                    className={`group relative flex items-center justify-between rounded-[14px] border px-3 py-3 text-left text-sm cursor-pointer transition ${activeConversationId === conversation.id ? 'border-[var(--accent-color)] bg-[var(--bg-elevated)]' : 'border-[var(--border-main)] bg-[var(--bg-surface)] hover:border-[var(--accent-color)]/50'}`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      {editingId === conversation.id ? (
                        <input
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename(conversation.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="saas-input min-h-[30px] px-2 py-0.5 text-xs w-full"
                          autoFocus
                        />
                      ) : (
                        <>
                          <p className="font-semibold text-[var(--text-primary)] truncate">{conversation.title || 'New chat'}</p>
                          <p className="caption-text mt-0.5 text-[11px]">{new Date(conversation.updatedAt).toLocaleDateString()}</p>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingId === conversation.id ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); saveRename(conversation.id) }}
                          className="text-xs text-[var(--success-color)] font-bold px-1"
                        >
                          ✓
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => startRenaming(conversation, e)}
                          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
                          title="Rename chat"
                        >
                          ✎
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => deleteConversation(conversation.id, e)}
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--error-color)] p-1"
                        title="Delete chat"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex flex-1 flex-col min-w-0">
            <div className="flex items-center justify-between border-b border-[var(--divider-main)] px-4 py-3">
              <div className="min-w-0 flex-1 pr-3">
                {editingId === activeConversation?.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename(activeConversation.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="saas-input min-h-[34px] px-2.5 py-1 text-sm max-w-[220px]"
                      autoFocus
                    />
                    <button type="button" onClick={() => saveRename(activeConversation.id)} className="saas-button-primary min-h-[34px] px-3 text-xs">
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="saas-button-secondary min-h-[34px] px-2 text-xs">
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{activeConversation?.title || 'New chat'}</p>
                    {activeConversation && (
                      <button
                        type="button"
                        onClick={(e) => startRenaming(activeConversation, e)}
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title="Rename chat"
                      >
                        ✎
                      </button>
                    )}
                  </div>
                )}
                <p className="caption-text text-xs mt-0.5">Ask anything and keep the conversation going.</p>
              </div>

              <div className="flex items-center gap-2 flex-none">
                {activeConversation && (
                  <button
                    type="button"
                    onClick={(e) => deleteConversation(activeConversation.id, e)}
                    className="saas-button-secondary min-h-[36px] px-3 text-xs hover:border-[var(--error-color)] hover:text-[var(--error-color)]"
                    title="Delete current chat"
                  >
                    🗑️ Delete
                  </button>
                )}
                <button type="button" onClick={() => setShowHistoryMobile(true)} className="saas-button-secondary min-h-[36px] px-3 text-xs md:hidden">
                  History
                </button>
                <button type="button" onClick={startNewConversation} className="saas-button-primary min-h-[36px] px-3 text-xs">
                  + New chat
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-3 sm:p-4">
              {activeConversation && (
                <AIChatSurface
                  api={api}
                  messages={activeConversation.messages}
                  setMessages={(messages) => handleMessagesChange(messages)}
                  welcomeMessage="Hi! I can help you with notes, study plans, summaries, or questions across the app."
                  title="AI assistant"
                  subtitle="Study companion"
                  placeholder="Ask for help with your studies..."
                  className="h-full"
                  showHeader={false}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
