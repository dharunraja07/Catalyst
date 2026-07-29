import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
    <main className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <p className="page-label">Roadmap</p>
        <h1 className="page-title mb-3">Your Personalized Learning Path</h1>
        <p className="page-description">Complete an assessment to refresh your customized step-by-step roadmap anytime.</p>
      </div>

      <hr className="canvas-divider" />

      {error && (
        <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">
          {error}
        </p>
      )}

      {roadmap.length ? (
        <div className="space-y-6">
          <h2 className="section-title mb-4">Milestones & Next Steps</h2>
          <div className="grid gap-4">
            {roadmap.map((item, idx) => (
              <div
                key={`${item}-${idx}`}
                className="rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-5 flex items-center justify-between gap-4 shadow-sm transition hover:border-[var(--accent-color)]"
              >
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--accent-light)] text-[var(--accent-color)] font-bold text-lg shrink-0">
                    {idx + 1}
                  </span>
                  <span className="card-title text-base">{item}</span>
                </div>
                <span className="caption-text uppercase tracking-widest px-3 py-1.5 rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-primary)] font-semibold shrink-0">
                  Step {idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Canvas-First Flat Empty State */
        <div className="py-12 text-center space-y-4 max-w-md mx-auto">
          <div className="mx-auto h-20 w-20 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-3xl">
            🗺️
          </div>
          <h2 className="section-title text-xl">No roadmap generated yet</h2>
          <p className="body-text text-sm text-[var(--text-secondary)]">
            Take a diagnostic assessment to generate your personalized AI learning path.
          </p>
          <div className="pt-2">
            <Link
              to="/assessment"
              className="saas-button-primary inline-flex items-center justify-center min-h-[48px] px-8 text-sm font-bold shadow-md"
            >
              Start Assessment
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
