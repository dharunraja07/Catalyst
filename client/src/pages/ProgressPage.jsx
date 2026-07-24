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
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="saas-card shadow-glow">
        <div className="mb-8 border-b border-[var(--divider-main)] pb-6 space-y-2">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">Progress</p>
          <h1 className="page-title">Track your growth</h1>
          <p className="body-text">See recent scores and completed topics in one place.</p>
        </div>

        {error && <p className="mb-6 rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{error}</p>}

        {progress ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 saas-elevated-card">
              <h2 className="section-title mb-4">Completed topics</h2>
              <div className="space-y-3">
                {progress.completedTopics.length ? progress.completedTopics.map((topic) => (
                  <div key={topic} className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-3.5 card-title text-base">{topic}</div>
                )) : <div className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-3.5 body-text text-sm">No topics completed yet.</div>}
              </div>
            </div>

            <div className="lg:col-span-6 saas-elevated-card">
              <h2 className="section-title mb-4">Score history</h2>
              <div className="space-y-4">
                {progress.scoreHistory.length ? progress.scoreHistory.map((item) => (
                  <div key={item.date} className="space-y-3 rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4">
                    <div className="flex items-center justify-between text-sm font-medium text-[var(--text-secondary)]">
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                      <span className="font-bold text-[var(--accent-color)]">{item.score}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-primary)] border border-[var(--border-main)]">
                      <div className="h-full rounded-full bg-[var(--accent-color)] transition-all duration-300" style={{ width: `${item.score}%` }} />
                    </div>
                  </div>
                )) : <p className="body-text text-sm text-[var(--text-muted)]">No score history yet.</p>}
              </div>
            </div>
          </div>
        ) : (
          <p className="body-text text-sm text-[var(--text-muted)]">Loading progress...</p>
        )}
      </div>
    </main>
  )
}
