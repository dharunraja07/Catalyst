import { useState } from 'react'
import { AvatarVisual } from './ProfileModal.jsx'

function formatRelativeTime(dateString) {
  if (!dateString) return 'Recently'
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 30) return 'Just now'
  if (diffInSeconds < 3600) {
    const mins = Math.max(1, Math.floor(diffInSeconds / 60))
    return `${mins} min ago`
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }
  if (diffInSeconds < 172800) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function NotificationCard({ notification, onAccept, onDecline }) {
  const [loadingAction, setLoadingAction] = useState(null)

  const groupName = notification.group?.groupName || 'Study Group'
  const inviterName = notification.sender?.name || 'A classmate'
  const inviterAvatar = notification.sender?.avatar
  const isPending = notification.status === 'pending'
  const isAccepted = notification.status === 'accepted'
  const isRejected = notification.status === 'rejected'

  const handleAccept = async () => {
    setLoadingAction('accept')
    try {
      await onAccept(notification._id)
    } finally {
      setLoadingAction(null)
    }
  }

  const handleDecline = async () => {
    setLoadingAction('decline')
    try {
      await onDecline(notification._id)
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div
      className={`group relative flex flex-col gap-3 rounded-[20px] border p-4 transition-all duration-200 ${
        !notification.isRead && isPending
          ? 'border-[var(--accent-color)]/40 bg-[var(--bg-secondary)] shadow-sm'
          : 'border-[var(--border-main)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)]'
      }`}
    >
      {/* Unread indicator dot */}
      {!notification.isRead && isPending && (
        <span className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-[var(--accent-color)] animate-pulse" />
      )}

      {/* Header Info */}
      <div className="flex items-start gap-3">
        {/* Inviter / Group Avatar Visual */}
        <div className="relative shrink-0">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br from-[var(--accent-color)]/20 to-[var(--accent-color)]/5 border border-[var(--accent-color)]/30 text-sm font-extrabold shadow-sm">
            <AvatarVisual avatar={inviterAvatar} name={inviterName} className="text-sm font-bold" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[10px] shadow-sm border border-[var(--border-main)]">
            👥
          </span>
        </div>

        {/* Content Details */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
              {groupName}
            </h4>
            <span className="text-[11px] font-medium text-[var(--text-muted)] whitespace-nowrap">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
            <span className="font-semibold text-[var(--text-primary)]">{inviterName}</span> invited you to join this study group.
          </p>
        </div>
      </div>

      {/* Action Buttons or Status Badge */}
      {isPending ? (
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={handleAccept}
            className="flex-1 inline-flex items-center justify-center min-h-[38px] rounded-[12px] bg-[var(--accent-color)] px-4 text-xs font-bold text-black hover:bg-[var(--accent-hover)] active:scale-[0.98] transition shadow-sm disabled:opacity-50"
          >
            {loadingAction === 'accept' ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
            ) : (
              'Accept'
            )}
          </button>

          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={handleDecline}
            className="flex-1 inline-flex items-center justify-center min-h-[38px] rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--error-color)] hover:text-[var(--error-color)] hover:bg-[var(--error-bg)] active:scale-[0.98] transition disabled:opacity-50"
          >
            {loadingAction === 'decline' ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--text-secondary)] border-t-transparent" />
            ) : (
              'Decline'
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-1 border-t border-[var(--divider-main)] text-xs font-medium text-[var(--text-muted)]">
          <span>Status:</span>
          {isAccepted && (
            <span className="inline-flex items-center gap-1 font-bold text-[var(--success-color)]">
              ✓ Joined Group
            </span>
          )}
          {isRejected && (
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-muted)]">
              ✕ Declined
            </span>
          )}
        </div>
      )}
    </div>
  )
}
