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
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-8 shadow-glow">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--accent-color)]">Progress</p>
            <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Track your growth</h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">See recent scores and completed topics in one place.</p>
        </div>

        {error && <p className="mb-6 rounded-2xl bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{error}</p>}

        {progress ? (
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[1.75rem] border border-[var(--border-main)] bg-[var(--bg-elevated)] p-6">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Completed topics</h2>
              <div className="mt-4 space-y-3">
                {progress.completedTopics.length ? progress.completedTopics.map((topic) => (
                  <div key={topic} className="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-3 text-[var(--text-primary)]">{topic}</div>
                )) : <div className="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-3 text-[var(--text-muted)]">No topics completed yet.</div>}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-[var(--border-main)] bg-[var(--bg-elevated)] p-6">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Score history</h2>
              <div className="mt-4 space-y-4">
                {progress.scoreHistory.length ? progress.scoreHistory.map((item) => (
                  <div key={item.date} className="space-y-3 rounded-3xl border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4">
                    <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                      <span>{item.score}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-primary)] border border-[var(--border-main)]">
                      <div className="h-full rounded-full bg-[var(--accent-color)]" style={{ width: `${item.score}%` }} />
                    </div>
                  </div>
                )) : <p className="text-[var(--text-muted)]">No score history yet.</p>}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[var(--text-muted)]">Loading progress...</p>
        )}
      </div>
    </main>
  )
}
