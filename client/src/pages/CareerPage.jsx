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
    <main className="mx-auto max-w-[1280px] max-w-full overflow-x-hidden px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      {/* Page Header */}
      <div>
        <p className="page-label">Career Guidance</p>
        <h1 className="page-title mb-1.5 text-2xl sm:text-3xl font-extrabold">Explore Career Paths</h1>
        <p className="page-description text-xs sm:text-sm text-[var(--text-secondary)]">Tailored recommendations based on your assessment and learning interests.</p>
      </div>

      <hr className="canvas-divider opacity-60" />

      {error && (
        <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-xs sm:text-sm text-[var(--error-color)] break-words">
          {error}
        </p>
      )}

      {careers.length ? (
        <div className="space-y-6 sm:space-y-8">
          <div className="space-y-4">
            <h2 className="section-title text-xl sm:text-2xl font-extrabold">Recommended Paths</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {careers.map((career) => (
                <div
                  key={career.title}
                  className="rounded-2xl sm:rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4.5 sm:p-6 shadow-sm space-y-4 transition hover:border-[var(--accent-color)]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                    <h3 className="section-title text-lg sm:text-xl font-bold text-[var(--text-primary)] break-words">{career.title}</h3>
                    <span className="rounded-full bg-[var(--accent-light)] border border-[var(--accent-color)]/30 px-3 py-1 text-xs font-bold text-[var(--accent-color)] shrink-0 self-start sm:self-auto">
                      Recommended
                    </span>
                  </div>
                  <div className="space-y-3 body-text text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed break-words">
                    <p className="break-words">
                      <span className="font-bold text-[var(--text-primary)]">Strong subjects:</span> {career.subjects.join(', ')}
                    </p>
                    <p className="break-words">
                      <span className="font-bold text-[var(--text-primary)]">Interests:</span> {career.interests.join(', ')}
                    </p>
                    <div className="space-y-2 pt-3 border-t border-[var(--border-main)]">
                      <p className="caption-text uppercase tracking-widest font-semibold text-[10px] text-[var(--accent-color)] mb-1">Growth Opportunities</p>
                      {career.improvement.map((note) => (
                        <p key={note} className="small-text font-medium text-[var(--text-secondary)] text-xs sm:text-sm leading-relaxed break-words">
                          • {note}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Career Comparison Matrix */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="section-title text-xl sm:text-2xl font-extrabold">Career Pathway Overview</h2>
              <span className="text-xs font-semibold text-[var(--text-muted)] hidden sm:inline">Scroll horizontally to view all columns →</span>
            </div>

            <div className="w-full max-w-full overflow-x-auto custom-scrollbar rounded-2xl sm:rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-[var(--border-main)] bg-[var(--bg-primary)] text-xs uppercase font-extrabold text-[var(--text-muted)] tracking-wider">
                    <th className="p-4">Career Track</th>
                    <th className="p-4">Core Focus</th>
                    <th className="p-4">Key Skillset</th>
                    <th className="p-4 text-right">Match Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-main)] text-xs sm:text-sm font-medium">
                  {careers.map((career) => (
                    <tr key={`matrix-${career.title}`} className="hover:bg-[var(--bg-primary)]/50 transition-colors">
                      <td className="p-4 font-bold text-[var(--text-primary)] break-words">{career.title}</td>
                      <td className="p-4 text-[var(--text-secondary)] break-words">{career.subjects.slice(0, 2).join(', ')}</td>
                      <td className="p-4 text-[var(--text-secondary)] break-words">{career.interests.slice(0, 2).join(', ')}</td>
                      <td className="p-4 text-right">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-[var(--accent-light)] border border-[var(--accent-color)]/30 text-xs font-bold text-[var(--accent-color)]">
                          High Match
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p className="body-text text-xs sm:text-sm text-[var(--text-muted)] italic">
            Complete an assessment to unlock personalized career path suggestions.
          </p>
        </div>
      )}
    </main>
  )
}
