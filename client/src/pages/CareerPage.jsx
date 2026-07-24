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
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="saas-card shadow-glow">
        <div className="mb-8 border-b border-[var(--divider-main)] pb-6 space-y-2">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">Career guidance</p>
          <h1 className="page-title">Explore career paths</h1>
          <p className="body-text">Recommendations are based on your assessment and interests.</p>
        </div>

        {error && <p className="mb-6 rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{error}</p>}

        {careers.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {careers.map((career) => (
              <div key={career.title} className="lg:col-span-6 saas-elevated-card">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="section-title">{career.title}</h2>
                  <span className="rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/20 px-3 py-1.5 text-xs font-semibold text-[var(--accent-color)]">Recommended</span>
                </div>
                <div className="space-y-3 body-text text-sm">
                  <p><span className="font-semibold text-[var(--text-primary)]">Strong subjects:</span> {career.subjects.join(', ')}</p>
                  <p><span className="font-semibold text-[var(--text-primary)]">Interests:</span> {career.interests.join(', ')}</p>
                  <div className="space-y-1.5 pt-2 border-t border-[var(--divider-main)]">
                    {career.improvement.map((note) => <p key={note} className="small-text">• {note}</p>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="body-text text-sm text-[var(--text-muted)]">Complete an assessment to get career suggestions.</p>
        )}
      </div>
    </main>
  )
}
