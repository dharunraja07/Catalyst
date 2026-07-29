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
    <main className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Page Header */}
      <div>
        <p className="page-label">Progress</p>
        <h1 className="page-title mb-3">Track your growth</h1>
        <p className="page-description">See recent scores and completed topics in one place.</p>
      </div>

      <hr className="canvas-divider" />

      {error && (
        <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">
          {error}
        </p>
      )}

      {progress ? (
        <div className="space-y-10">
          {/* Completed Topics Section */}
          <section className="space-y-4">
            <h2 className="section-title">Completed Topics</h2>
            {progress.completedTopics.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {progress.completedTopics.map((topic) => (
                  <div
                    key={topic}
                    className="rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-secondary)] px-5 py-4 flex items-center justify-between text-base font-semibold text-[var(--text-primary)] shadow-sm"
                  >
                    <span>{topic}</span>
                    <span className="text-[var(--success-color)] text-sm font-bold">✓ Done</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="body-text text-[var(--text-muted)] italic">No completed topics yet.</p>
            )}
          </section>

          <hr className="canvas-divider" />

          {/* Score History Section */}
          <section className="space-y-4">
            <h2 className="section-title">Score History</h2>
            {progress.scoreHistory.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {progress.scoreHistory.map((item) => (
                  <div
                    key={item.date}
                    className="space-y-3 rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-sm font-semibold text-[var(--text-secondary)]">
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                      <span className="font-bold text-[var(--accent-color)] text-base">{item.score}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-primary)] border border-[var(--border-main)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent-color)] transition-all duration-300"
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="body-text text-[var(--text-muted)] italic">No score history yet.</p>
            )}
          </section>

          <hr className="canvas-divider" />

          {/* Learning Statistics Summary */}
          <section className="space-y-4">
            <h2 className="section-title">Learning Statistics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-5 text-center shadow-sm">
                <p className="caption-text uppercase tracking-widest font-semibold">Total Completed</p>
                <p className="page-title text-3xl mt-2">{progress.completedTopics.length}</p>
                <p className="caption-text mt-1">Topics mastered</p>
              </div>
              <div className="rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-5 text-center shadow-sm">
                <p className="caption-text uppercase tracking-widest font-semibold">Assessments Taken</p>
                <p className="page-title text-3xl mt-2">{progress.scoreHistory.length}</p>
                <p className="caption-text mt-1">Tests completed</p>
              </div>
              <div className="rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-5 text-center shadow-sm">
                <p className="caption-text uppercase tracking-widest font-semibold">Average Score</p>
                <p className="page-title text-3xl mt-2 text-[var(--accent-color)]">
                  {progress.scoreHistory.length
                    ? `${Math.round(progress.scoreHistory.reduce((acc, curr) => acc + curr.score, 0) / progress.scoreHistory.length)}%`
                    : 'N/A'}
                </p>
                <p className="caption-text mt-1">Overall performance</p>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <p className="body-text text-[var(--text-muted)]">Loading progress...</p>
      )}
    </main>
  )
}
