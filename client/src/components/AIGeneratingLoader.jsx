/**
 * Animated placeholder shown while the AI is generating content (assessment
 * questions, practice questions, etc.) — gives clear, dynamic feedback that
 * something is happening instead of a static spinner or frozen UI.
 */
export default function AIGeneratingLoader({ label = 'Generating questions with AI...', rows = 3 }) {
  return (
    <div className="space-y-4 rounded-[1.75rem] border border-ink-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <span className="relative flex h-9 w-9 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-50" />
          <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-sm text-white">✨</span>
        </span>
        <div>
          <p className="text-sm font-semibold text-ink-900">{label}</p>
          <p className="text-xs text-ink-400">This usually takes a few seconds.</p>
        </div>
        <span className="ml-auto inline-flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: '120ms' }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: '240ms' }} />
        </span>
      </div>

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-ink-200 bg-ink-50 p-4">
            <div className="h-3 w-1/3 animate-pulse rounded-full bg-ink-200" />
            <div className="mt-3 h-4 w-5/6 animate-pulse rounded-full bg-ink-200" />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="h-9 animate-pulse rounded-xl bg-ink-100" style={{ animationDelay: `${(i * 4 + j) * 60}ms` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
