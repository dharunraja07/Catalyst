import { useNotifications } from '../context/NotificationContext.jsx'
import NotificationPanel from './NotificationPanel.jsx'

export default function NotificationBell() {
  const { unreadCount, togglePanel, isPanelOpen } = useNotifications()

  return (
    <div className="relative">
      <button
        type="button"
        onClick={togglePanel}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        className={`relative flex items-center justify-center p-2.5 rounded-[14px] border bg-[var(--bg-secondary)] transition-all duration-200 focus:outline-none ${
          isPanelOpen
            ? 'border-[var(--accent-color)] text-[var(--accent-color)] shadow-sm'
            : 'border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-color)]'
        }`}
      >
        {/* Bell SVG */}
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Dynamic Badge Counter (WhatsApp / Discord style) */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--accent-color)] px-1 text-[11px] font-black text-black shadow-md ring-2 ring-[var(--bg-primary)] animate-in zoom-in duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown / Panel */}
      <NotificationPanel />
    </div>
  )
}
