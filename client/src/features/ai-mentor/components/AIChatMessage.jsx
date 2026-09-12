import { useState } from 'react'
import MarkdownRenderer from '../../../components/common/MarkdownRenderer.jsx'
import CopyButton from '../../../components/common/CopyButton.jsx'

export default function AIChatMessage({
  message,
  onShareToGroup = null,
  compact = false
}) {
  const isUser = message.role === 'user'
  const content = message.content || ''
  const formattedTime = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Show More / Show Less state for long responses
  const isLong = !isUser && (content.length > 750 || content.split('\n').length > 18)
  const [isExpanded, setIsExpanded] = useState(false)

  if (isUser) {
    return (
      <div className="group relative flex flex-col items-end my-2 min-w-0 max-w-full animate-fadeIn">
        <div
          style={{
            boxShadow: 'var(--ai-user-shadow, 0 4px 14px rgba(0,0,0,0.05))'
          }}
          className="w-fit max-w-[92%] sm:max-w-[82%] md:max-w-[76%] lg:max-w-[72%] min-w-0 rounded-2xl rounded-tr-none bg-[var(--ai-user-bubble-bg)] border border-[var(--ai-user-bubble-border)] p-3.5 text-[var(--ai-user-text)] overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3 mb-1.5 border-b border-[var(--ai-user-bubble-border)] pb-1">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">You</span>
            <span className="text-[10px] text-[var(--text-muted)]">{formattedTime}</span>
          </div>
          <p className="text-sm leading-relaxed break-words [overflow-wrap:anywhere] text-[var(--ai-user-text)] font-normal">
            {content}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative flex flex-col items-start my-2 min-w-0 max-w-full animate-fadeIn">
      <div
        style={{
          boxShadow: 'var(--ai-bubble-shadow, 0 4px 16px rgba(15,23,42,0.06))'
        }}
        className="w-fit max-w-[92%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-[75%] min-w-0 rounded-2xl rounded-tl-none bg-[var(--ai-bubble-bg)] border border-[var(--ai-bubble-border)] p-4 text-[var(--ai-text-primary)] overflow-hidden relative"
      >
        {/* Header Tag with Reusable CopyButton */}
        <div className="flex items-center justify-between gap-3 mb-2 border-b border-[var(--ai-bubble-border)] pb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Catalyst AI</span>
            </span>
            <span className="text-[10px] text-[var(--ai-text-secondary)]">{formattedTime}</span>
          </div>

          <div className="flex items-center gap-2">
            <CopyButton text={content} />
            {onShareToGroup && (
              <button
                type="button"
                onClick={() => onShareToGroup(content)}
                className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                title="Share response to group chat"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Share</span>
              </button>
            )}
          </div>
        </div>

        {/* Message Content Container with optional Show More / Show Less */}
        <div className={`relative ${isLong && !isExpanded ? 'max-h-[380px] overflow-hidden' : ''}`}>
          <MarkdownRenderer>{content}</MarkdownRenderer>

          {/* Gradient Overlay Mask when collapsed */}
          {isLong && !isExpanded && (
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--ai-bubble-bg)] via-[var(--ai-bubble-bg)]/90 to-transparent flex items-end justify-center pb-1 pointer-events-none" />
          )}
        </div>

        {/* Show More / Show Less Toggle Button */}
        {isLong && (
          <div className="mt-2 flex justify-center border-t border-[var(--ai-bubble-border)] pt-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 dark:border-amber-400/60 bg-[var(--bg-secondary)] dark:bg-[#1F2937] px-3.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-300 hover:bg-amber-400 hover:text-black dark:hover:bg-amber-400 dark:hover:text-black focus:ring-2 focus:ring-amber-400/50 outline-none transition shadow-sm cursor-pointer"
            >
              <span>{isExpanded ? 'Show Less 🔼' : 'Show More 🔽'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
