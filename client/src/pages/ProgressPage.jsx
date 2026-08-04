import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProgressPage() {
  const { api } = useAuth()
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProgress() {
      try {
        const response = await api.get('/progress')
        setProgress(response.data)
      } catch (err) {
        setError('Unable to load progress data')
      }
    }
    loadProgress()
  }, [api])

  return (
    <main className="mx-auto max-w-[1280px] max-w-full overflow-x-hidden px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      {/* Page Header */}
      <div>
        <p className="page-label">Progress</p>
        <h1 className="page-title mb-1.5 text-2xl sm:text-3xl font-extrabold">Track Your Growth</h1>
        <p className="page-description text-xs sm:text-sm text-[var(--text-secondary)]">See your recent assessment scores, performance breakdown, and completed topics in one place.</p>
      </div>

      <hr className="canvas-divider opacity-60" />

      {error && (
        <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-xs sm:text-sm text-[var(--error-color)] break-words">
          {error}
        </p>
      )}

      {progress ? (
        <div className="space-y-6 sm:space-y-8">
          {/* Learning Statistics Summary */}
          <section className="space-y-3 sm:space-y-4">
            <h2 className="section-title text-xl sm:text-2xl font-extrabold">Learning Statistics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-2xl sm:rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4.5 sm:p-5 text-center shadow-sm hover:border-[var(--accent-color)]/50 transition">
                <p className="caption-text uppercase tracking-widest font-semibold text-[10px] text-[var(--text-muted)]">Total Completed</p>
                <p className="page-title text-2xl sm:text-3xl font-extrabold mt-1 sm:mt-2 text-[var(--text-primary)] break-words">{progress.completedTopics.length}</p>
                <p className="caption-text mt-1 text-[11px] text-[var(--text-secondary)]">Topics mastered</p>
              </div>
              <div className="rounded-2xl sm:rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4.5 sm:p-5 text-center shadow-sm hover:border-[var(--accent-color)]/50 transition">
                <p className="caption-text uppercase tracking-widest font-semibold text-[10px] text-[var(--text-muted)]">Assessments Taken</p>
                <p className="page-title text-2xl sm:text-3xl font-extrabold mt-1 sm:mt-2 text-[var(--text-primary)] break-words">{progress.scoreHistory.length}</p>
                <p className="caption-text mt-1 text-[11px] text-[var(--text-secondary)]">Tests completed</p>
              </div>
              <div className="rounded-2xl sm:rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4.5 sm:p-5 text-center shadow-sm hover:border-[var(--accent-color)]/50 transition">
                <p className="caption-text uppercase tracking-widest font-semibold text-[10px] text-[var(--text-muted)]">Average Score</p>
                <p className="page-title text-2xl sm:text-3xl font-extrabold mt-1 sm:mt-2 text-[var(--accent-color)] break-words">
                  {progress.scoreHistory.length
                    ? `${Math.round(progress.scoreHistory.reduce((acc, curr) => acc + curr.score, 0) / progress.scoreHistory.length)}%`
                    : 'N/A'}
                </p>
                <p className="caption-text mt-1 text-[11px] text-[var(--text-secondary)]">Overall performance</p>
              </div>
            </div>
          </section>

          <hr className="canvas-divider opacity-60" />

          {/* Score History Section */}
          <section className="space-y-3 sm:space-y-4">
            <h2 className="section-title text-xl sm:text-2xl font-extrabold">Score History</h2>
            {progress.scoreHistory.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
                {progress.scoreHistory.map((item) => (
                  <div
                    key={item.date}
                    className="space-y-2.5 sm:space-y-3 rounded-2xl sm:rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4 sm:p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">
                      <span>{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span className="font-extrabold text-[var(--accent-color)] text-sm sm:text-base">{item.score}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-primary)] border border-[var(--border-main)] p-0.5">
                      <div
                        className="h-full rounded-full bg-[var(--accent-color)] transition-all duration-500"
                        style={{ width: `${Math.max(4, Math.min(100, item.score))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="body-text text-xs sm:text-sm text-[var(--text-muted)] italic pt-1">No score history logged yet.</p>
            )}
          </section>

          <hr className="canvas-divider opacity-60" />

          {/* Completed Topics Section */}
          <section className="space-y-3 sm:space-y-4">
            <h2 className="section-title text-xl sm:text-2xl font-extrabold">Completed Topics</h2>
            {progress.completedTopics.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {progress.completedTopics.map((topic) => (
                  <div
                    key={topic}
                    className="rounded-xl sm:rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-[var(--text-primary)] shadow-sm min-w-0"
                  >
                    <span className="truncate flex-1 min-w-0" title={topic}>{topic}</span>
                    <span className="text-[var(--success-color)] text-xs font-bold shrink-0 bg-[var(--success-bg)] px-2.5 py-1 rounded-full border border-[var(--success-color)]/20">
                      ✓ Done
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="body-text text-xs sm:text-sm text-[var(--text-muted)] italic pt-1">No completed topics yet.</p>
            )}
          </section>
        </div>
      ) : (
        <p className="body-text text-xs sm:text-sm text-[var(--text-muted)] italic pt-1">Loading progress...</p>
      )}
    </main>
  )
}
