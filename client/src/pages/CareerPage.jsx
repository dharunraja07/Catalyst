import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export default function CareerPage() {
  const { api } = useAuth()
  const [careers, setCareers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadCareers() {
      try {
        const response = await api.get('/career')
        setCareers(response.data)
      } catch (err) {
        setError('Unable to load career guidance')
      }
    }
    loadCareers()
  }, [api])

  return (
    <main className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <p className="page-label">Career Guidance</p>
        <h1 className="page-title mb-2">Explore Career Paths</h1>
        <p className="page-description">Tailored recommendations based on your assessment and learning interests.</p>
      </div>

      <hr className="canvas-divider" />

      {error && (
        <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">
          {error}
        </p>
      )}

      {careers.length ? (
        <div className="space-y-6">
          <h2 className="section-title">Recommended Paths</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {careers.map((career) => (
              <div
                key={career.title}
                className="rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-6 shadow-sm space-y-4 transition hover:border-[var(--accent-color)]"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="section-title text-xl font-bold">{career.title}</h3>
                  <span className="rounded-full bg-[var(--accent-light)] border border-[var(--accent-color)]/30 px-3 py-1 text-xs font-bold text-[var(--accent-color)] shrink-0">
                    Recommended
                  </span>
                </div>
                <div className="space-y-3 body-text text-sm">
                  <p>
                    <span className="font-bold text-[var(--text-primary)]">Strong subjects:</span> {career.subjects.join(', ')}
                  </p>
                  <p>
                    <span className="font-bold text-[var(--text-primary)]">Interests:</span> {career.interests.join(', ')}
                  </p>
                  <div className="space-y-1.5 pt-3 border-t border-[var(--border-main)]">
                    <p className="caption-text uppercase tracking-widest font-semibold mb-1">Growth Opportunities</p>
                    {career.improvement.map((note) => (
                      <p key={note} className="small-text font-medium text-[var(--text-secondary)]">
                        • {note}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p className="body-text text-[var(--text-muted)] italic">
            Complete an assessment to unlock personalized career path suggestions.
          </p>
        </div>
      )}
    </main>
  )
}
