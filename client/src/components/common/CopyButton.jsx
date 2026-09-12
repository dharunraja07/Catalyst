import { useState } from 'react'

export default function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!text) return

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text)
    }

    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-[var(--ai-bubble-border)] bg-[var(--bg-secondary)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--ai-text-primary)] hover:border-amber-400/50 transition-all duration-200 active:scale-95 cursor-pointer shadow-xs ${className}`}
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-emerald-500 font-bold shrink-0 animate-fadeIn" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-emerald-500 font-bold animate-fadeIn">Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5 text-[var(--ai-text-secondary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy</span>
        </>
      )}
    </button>
  )
}
