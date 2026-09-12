import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext.jsx'
import AIChatSurface from './AIChatSurface.jsx'

export default function FloatingAIAssistant() {
  const { user, api } = useAuth()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  const authPaths = ['/login', '/register', '/forgot-password']
  const isAuthPage = authPaths.includes(location.pathname) || location.pathname.startsWith('/reset-password')
  const shouldHide = !user || isAuthPage

  useEffect(() => {
    if (shouldHide) return
    async function loadConversations() {
      try {
        const response = await api.get('/ai/conversations')
        const list = response.data || []
        setConversations(list)
        if (list.length > 0) {
          setActiveConversationId(list[0]._id)
        }
      } catch {
        // Fallback for storage
      }
    }
    loadConversations()
  }, [api, shouldHide])

  const activeConversation = useMemo(() => {
    return conversations.find((conversation) => conversation._id === activeConversationId) || conversations[0] || null
  }, [activeConversationId, conversations])

  if (shouldHide) {
    return null
  }

  const startNewConversation = async () => {
    try {
      const response = await api.post('/ai/conversations', { title: 'New Chat' })
      const newConv = response.data
      setConversations((prev) => [newConv, ...prev])
      setActiveConversationId(newConv._id)
    } catch {
      // ignore
    }
  }

  const selectConversation = (id) => {
    setActiveConversationId(id)
    if (window.innerWidth < 640) {
      setIsSidebarOpen(false)
    }
  }

  const deleteConversation = async (id, event) => {
    if (event) event.stopPropagation()
    try {
      await api.delete(`/ai/conversations/${id}`)
      setConversations((prev) => {
        const filtered = prev.filter((c) => c._id !== id)
        if (activeConversationId === id && filtered.length > 0) {
          setActiveConversationId(filtered[0]._id)
        }
        return filtered
      })
    } catch {
      // ignore
    }
  }

  const startRenaming = (conversation, event) => {
    if (event) event.stopPropagation()
    setEditingId(conversation._id)
    setRenameDraft(conversation.title || 'New Chat')
  }

  const saveRename = async (id) => {
    if (!renameDraft.trim()) {
      setEditingId(null)
      return
    }
    try {
      const response = await api.patch(`/ai/conversations/${id}`, { title: renameDraft.trim() })
      setConversations((prev) => prev.map((c) => (c._id === id ? response.data : c)))
      setEditingId(null)
    } catch {
      setEditingId(null)
    }
  }

  const handleConversationUpdate = (updatedConv) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c._id === updatedConv._id)
      if (idx !== -1) {
        const next = [...prev]
        next[idx] = updatedConv
        return next
      }
      return [updatedConv, ...prev]
    })
  }

  const isStudyGroupPage = location.pathname.startsWith('/study-group')

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          bottom: isStudyGroupPage
            ? 'max(88px, calc(80px + env(safe-area-inset-bottom)))'
            : 'max(16px, env(safe-area-inset-bottom))',
          right: 'max(16px, env(safe-area-inset-right))'
        }}
        className="fixed z-[50] flex h-12 w-12 sm:h-14 sm:w-14 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-amber-400/40 bg-[var(--accent-color)] text-xl text-black font-bold shadow-2xl transition hover:scale-105 active:scale-95 cursor-pointer"
        aria-label="Open AI assistant"
      >
        ✦
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
      {/* Delete Confirmation Modal Overlay */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-main)] bg-[var(--bg-secondary)] p-5 shadow-2xl text-[var(--text-primary)]">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1.5 flex items-center gap-2">
              <span className="text-red-500 text-lg">⚠️</span> Delete Conversation?
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-5 leading-relaxed">
              This conversation will be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-2 min-h-[44px] rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteConversation(deleteConfirmId)
                  setDeleteConfirmId(null)
                }}
                className="px-3.5 py-2 min-h-[44px] rounded-xl border border-red-500/30 bg-red-500/10 text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition cursor-pointer shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))'
        }}
        className="flex h-[94vh] sm:h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-[var(--ai-bubble-border)] bg-[var(--ai-card-bg)] shadow-2xl text-[var(--ai-text-primary)]"
      >
        {/* ChatGPT Style Compact Header Bar */}
        <div className="flex items-center justify-between border-b border-[var(--ai-bubble-border)] bg-[var(--bg-secondary)] px-3 py-2 sm:px-5 select-none shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Sidebar Toggle Button */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-[var(--ai-bubble-border)] bg-[var(--bg-surface)] text-[var(--ai-text-primary)] hover:border-amber-400/60 transition active:scale-95 cursor-pointer text-base font-bold shadow-xs"
              title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              ☰
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-amber-500 dark:text-amber-400 font-extrabold text-base sm:text-lg">✦</span>
              {editingId === activeConversation?._id ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <input
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRename(activeConversation._id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="saas-input min-h-[36px] px-2.5 py-0.5 text-xs w-32 sm:w-48 bg-[var(--bg-input)] border-[var(--border-main)] text-[var(--text-primary)]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => saveRename(activeConversation._id)}
                    className="text-xs text-emerald-500 font-bold px-2 py-1 hover:bg-[var(--bg-elevated)] rounded min-h-[36px] cursor-pointer"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1.5 py-1 min-h-[36px] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm sm:text-base font-bold text-[var(--ai-bold-text)] truncate max-w-[110px] sm:max-w-[280px]">
                    {activeConversation?.title || 'Catalyst AI'}
                  </span>
                  {activeConversation && (
                    <button
                      type="button"
                      onClick={(e) => startRenaming(activeConversation, e)}
                      className="text-xs text-[var(--ai-text-secondary)] hover:text-amber-400 p-1 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer transition text-sm"
                      title="Rename conversation"
                    >
                      ✏
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Icons Bar */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {activeConversation && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteConfirmId(activeConversation._id)
                }}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-2.5 sm:px-3 rounded-xl border border-[var(--ai-bubble-border)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--ai-text-primary)] hover:border-red-500/50 hover:text-red-500 transition cursor-pointer shadow-xs active:scale-95"
                title="Delete current conversation"
              >
                <span className="text-sm">🗑</span>
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}

            {/* Monochromatic New Chat Button */}
            <button
              type="button"
              onClick={startNewConversation}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 sm:px-3.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-primary)] hover:border-amber-400/50 hover:text-amber-500 dark:hover:text-amber-400 transition cursor-pointer shadow-xs active:scale-95"
              title="Start new conversation"
            >
              <svg className="w-3.5 h-3.5 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">New Chat</span>
            </button>

            {/* Separator spacing before Close button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-[var(--ai-bubble-border)] bg-[var(--bg-surface)] text-[var(--ai-text-secondary)] hover:text-[var(--ai-text-primary)] hover:border-amber-400/50 transition cursor-pointer text-base active:scale-95 shadow-xs"
              title="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Workspace Body: Collapsible Sidebar + Expanded Conversation Container */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* ChatGPT Style Collapsible History Sidebar */}
          {isSidebarOpen && (
            <aside className="absolute inset-y-0 left-0 z-20 w-72 max-w-[85vw] sm:relative sm:z-auto sm:w-64 md:w-72 flex-col border-r border-[var(--ai-bubble-border)] bg-[var(--ai-sidebar-bg)] flex shrink-0 transition-all duration-200 shadow-2xl sm:shadow-none">
              <div className="flex items-center justify-between border-b border-[var(--ai-bubble-border)] px-4 py-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ai-text-secondary)]">History</span>
                <button
                  type="button"
                  onClick={startNewConversation}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer min-h-[36px] flex items-center"
                >
                  + New
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 custom-scrollbar space-y-1">
                {conversations
                  .slice()
                  .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                  .map((conversation) => {
                    const isActive = activeConversationId === conversation._id
                    return (
                      <div
                        key={conversation._id}
                        onClick={() => selectConversation(conversation._id)}
                        className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 min-h-[44px] text-xs font-medium cursor-pointer transition ${
                          isActive
                            ? 'bg-[var(--bg-elevated)] text-amber-600 dark:text-amber-400 border border-amber-400/40 shadow-xs font-semibold'
                            : 'text-[var(--ai-text-primary)] hover:bg-[var(--bg-surface)] border border-transparent'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="truncate font-semibold">{conversation.title || 'New Chat'}</p>
                          <p className="text-[10px] text-[var(--ai-text-secondary)] mt-0.5">
                            {new Date(conversation.updatedAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => startRenaming(conversation, e)}
                            className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[var(--ai-text-secondary)] hover:text-amber-500 dark:hover:text-amber-400 hover:bg-[var(--bg-elevated)] text-sm transition cursor-pointer"
                            title="Rename chat"
                          >
                            ✏
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirmId(conversation._id)
                            }}
                            className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[var(--ai-text-secondary)] hover:text-red-500 hover:bg-red-500/10 text-sm transition cursor-pointer"
                            title="Delete chat"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </aside>
          )}

          {/* Conversation Surface (Expands to 100% when sidebar is collapsed) */}
          <div className="flex-1 flex flex-col min-w-0 bg-[var(--ai-chat-bg)] p-2 sm:p-4">
            {activeConversation ? (
              <AIChatSurface
                api={api}
                conversationId={activeConversation._id}
                onConversationUpdate={handleConversationUpdate}
                welcomeMessage="Hi! I can help you with notes, study plans, summaries, or questions across the app."
                title="AI assistant"
                subtitle="Study companion"
                placeholder="Ask for help with your studies..."
                className="h-full"
                showHeader={false}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-[var(--ai-text-secondary)] text-sm gap-3">
                <p>No active conversation.</p>
                <button
                  type="button"
                  onClick={startNewConversation}
                  className="saas-button-primary min-h-[44px] px-4 text-xs font-bold shadow-sm cursor-pointer"
                >
                  + Start New Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
