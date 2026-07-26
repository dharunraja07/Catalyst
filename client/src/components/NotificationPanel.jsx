import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '../context/NotificationContext.jsx'
import NotificationCard from './NotificationCard.jsx'

function NotificationSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-[20px] border border-[var(--border-main)] bg-[var(--bg-surface)] animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-[14px] bg-[var(--bg-secondary)]" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-3/4 rounded bg-[var(--bg-secondary)]" />
          <div className="h-3 w-1/2 rounded bg-[var(--bg-secondary)]" />
        </div>
      </div>
      <div className="flex gap-2.5 pt-1">
        <div className="h-9 flex-1 rounded-[12px] bg-[var(--bg-secondary)]" />
        <div className="h-9 flex-1 rounded-[12px] bg-[var(--bg-secondary)]" />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-3xl shadow-sm mb-3">
        🔔
      </div>
      <h4 className="text-base font-bold text-[var(--text-primary)]">All caught up!</h4>
      <p className="text-xs text-[var(--text-secondary)] max-w-[220px] mt-1 leading-relaxed">
        You don't have any study group invite notifications at the moment.
      </p>
    </div>
  )
}

export default function NotificationPanel() {
  const {
    notifications,
    loading,
    isPanelOpen,
    closePanel,
    acceptInvite,
    declineInvite,
    markAllAsRead,
    clearAllNotifications
  } = useNotifications()

  const [activeTab, setActiveTab] = useState('unread')
  const panelRef = useRef(null)

  // Handle click outside to close dropdown/panel
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        closePanel()
      }
    }
    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isPanelOpen, closePanel])

  if (!isPanelOpen) return null

  const unreadNotifications = notifications.filter((n) => n.status === 'pending' && !n.isRead)
  const readNotifications = notifications.filter((n) => n.isRead || n.status !== 'pending')
  const currentList = activeTab === 'unread' ? unreadNotifications : readNotifications

  return (
    <>
      {/* Mobile Backdrop Overlay (<md:) */}
      <div
        onClick={closePanel}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
      />

      {/* Responsive Drawer Container */}
      <div
        ref={panelRef}
        className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[85vh] flex-col rounded-t-[28px] border-t border-[var(--border-main)] bg-[var(--bg-surface)] shadow-2xl transition-all duration-300 md:absolute md:bottom-auto md:left-auto md:right-0 md:top-full md:mt-2 md:w-[420px] md:max-h-[580px] md:rounded-[24px] md:border"
      >
        {/* Mobile Pull Handle Pill */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-[var(--border-main)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--divider-main)] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-extrabold text-[var(--text-primary)]">Notifications</h3>
            {unreadNotifications.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-[var(--accent-color)] px-2 py-0.5 text-[11px] font-black text-black">
                {unreadNotifications.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadNotifications.length > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                title="Mark all as read"
                className="inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-color)] hover:bg-[var(--accent-color)]/10 transition"
              >
                <span>✓</span>
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}

            {readNotifications.length > 0 && (
              <button
                type="button"
                onClick={clearAllNotifications}
                title="Clear read notifications"
                className="inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--error-color)] hover:bg-[var(--error-bg)] transition"
              >
                <span>🗑</span>
              </button>
            )}

            <button
              type="button"
              onClick={closePanel}
              className="p-1.5 rounded-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition"
              aria-label="Close notifications"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs: Unread vs Read */}
        <div className="flex border-b border-[var(--divider-main)] px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={`flex-1 pb-2.5 text-xs font-bold transition-colors relative ${
              activeTab === 'unread'
                ? 'text-[var(--accent-color)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Unread ({unreadNotifications.length})
            {activeTab === 'unread' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[var(--accent-color)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('read')}
            className={`flex-1 pb-2.5 text-xs font-bold transition-colors relative ${
              activeTab === 'read'
                ? 'text-[var(--accent-color)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Read / History ({readNotifications.length})
            {activeTab === 'read' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[var(--accent-color)]" />
            )}
          </button>
        </div>

        {/* Notification List Scroll Workspace */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 min-h-0">
          {loading ? (
            <>
              <NotificationSkeleton />
              <NotificationSkeleton />
            </>
          ) : currentList.length === 0 ? (
            <EmptyState />
          ) : (
            currentList.map((notification) => (
              <NotificationCard
                key={notification._id}
                notification={notification}
                onAccept={acceptInvite}
                onDecline={declineInvite}
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}
