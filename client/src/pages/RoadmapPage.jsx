import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export default function RoadmapPage() {
  const { api } = useAuth()
  const [roadmap, setRoadmap] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRoadmap() {
      try {
        const response = await api.get('/roadmap')
        setRoadmap(response.data.items || [])
      } catch (err) {
        setError('Unable to load roadmap')
      }
    }
    loadRoadmap()
  }, [api])

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="saas-card shadow-glow">
        <div className="mb-8 border-b border-[var(--divider-main)] pb-6 space-y-2">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">Roadmap</p>
          <h1 className="page-title">Your personalized learning path</h1>
          <p className="body-text">Complete an assessment to refresh your roadmap anytime.</p>
        </div>

        {error && <p className="mb-6 rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{error}</p>}

        {roadmap.length ? (
          <div className="grid gap-6">
            {roadmap.map((item, idx) => (
              <div key={`${item}-${idx}`} className="saas-elevated-card">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--accent-light)] text-[var(--accent-color)] font-bold text-base">{idx + 1}</span>
                    <span className="card-title">{item}</span>
                  </div>
                  <span className="caption-text uppercase tracking-[0.2em] px-3 py-1 rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)]">Step {idx + 1}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="body-text text-sm text-[var(--text-muted)]">No roadmap available yet. Complete an assessment to generate one.</p>
        )}
      </div>
    </main>
  )
}
