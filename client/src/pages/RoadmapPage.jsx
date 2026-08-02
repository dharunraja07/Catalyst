import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function getScoreTierInfo(score) {
  const p = Math.max(0, Math.min(100, Math.round(score || 0)))
  if (p <= 10) return { tier: 'Foundational', range: '0-10%', level: 1 }
  if (p <= 20) return { tier: 'Novice', range: '11-20%', level: 2 }
  if (p <= 30) return { tier: 'Beginner', range: '21-30%', level: 3 }
  if (p <= 40) return { tier: 'Developing', range: '31-40%', level: 4 }
  if (p <= 50) return { tier: 'Approaching Competency', range: '41-50%', level: 5 }
  if (p <= 60) return { tier: 'Competent', range: '51-60%', level: 6 }
  if (p <= 70) return { tier: 'Proficient', range: '61-70%', level: 7 }
  if (p <= 80) return { tier: 'Advanced', range: '71-80%', level: 8 }
  if (p <= 90) return { tier: 'Excellence', range: '81-90%', level: 9 }
  return { tier: 'Mastery', range: '91-100%', level: 10 }
}

export default function RoadmapPage() {
  const { api } = useAuth()
  const [roadmapData, setRoadmapData] = useState(null)
  const [completedSteps, setCompletedSteps] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRoadmapData() {
      setLoading(true)
      try {
        const response = await api.get('/roadmap')
        setRoadmapData(response.data)
      } catch (err) {
        setError('Unable to load customized roadmap data')
      } finally {
        setLoading(false)
      }
    }
    loadRoadmapData()
  }, [api])

  const toggleStepCompleted = (idx) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }))
  }

  const items = Array.isArray(roadmapData?.items) ? roadmapData.items : []
  const score = Number(roadmapData?.score || 0)
  const tierInfo = getScoreTierInfo(score)
  const strengths = Array.isArray(roadmapData?.strengths) ? roadmapData.strengths : []
  const weaknesses = Array.isArray(roadmapData?.weaknesses) ? roadmapData.weaknesses : []

  return (
    <main className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Monochromatic Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-label text-xs uppercase tracking-widest font-bold text-[var(--text-muted)]">Adaptive Roadmap</p>
          <h1 className="page-title mb-2 text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">Personalized Learning Roadmap</h1>
          <p className="page-description text-sm text-[var(--text-secondary)]">
            Dynamically generated based on your latest assessment score ({score}%) and specific topic performance.
          </p>
        </div>
        <Link
          to="/assessment"
          className="saas-button-primary min-h-[44px] px-6 text-xs font-bold shadow-sm w-fit self-start sm:self-auto flex items-center gap-2"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          <span>Retake Assessment</span>
        </Link>
      </div>

      <hr className="canvas-divider" />

      {error && (
        <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">
          {error}
        </p>
      )}

      {loading ? (
        <div className="py-12 text-center text-[var(--text-muted)] animate-pulse font-medium">
          Loading your personalized roadmap...
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-8">
          {/* Dynamic Score & Tier Banner (Monochromatic Theme) */}
          <div className="rounded-[22px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-6 shadow-sm space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-primary)] text-[var(--text-primary)] font-extrabold text-xl shadow-xs shrink-0">
                  {score}%
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-[var(--text-primary)]">{tierInfo.tier} Tier</h2>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border border-[var(--border-main)] bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                      Bracket: {tierInfo.range}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Calibrated specifically for score range {tierInfo.range}
                  </p>
                </div>
              </div>

              <div className="sm:text-right shrink-0">
                <p className="text-xs font-semibold text-[var(--text-muted)]">Target Level Goal</p>
                <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                  Advance past {tierInfo.range} Mastery Tier
                </p>
              </div>
            </div>

            {/* Score Tier Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-semibold text-[var(--text-muted)]">
                <span>Diagnostic Mastery: {score}%</span>
                <span>Level {tierInfo.level} of 10</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[var(--bg-primary)] overflow-hidden border border-[var(--border-main)] p-0.5">
                <div
                  className="h-full rounded-full bg-[var(--text-primary)] transition-all duration-500"
                  style={{ width: `${Math.max(4, score)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Unique Dual Performance Dashboard (Monochromatic Format) */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Strengthening Target Areas (Wrong Answers Panel) */}
            <div className="rounded-[22px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-6 space-y-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-primary)] text-[var(--text-primary)] shrink-0">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)]">Targeted Focus Areas</h3>
                      <p className="text-xs text-[var(--text-muted)]">Topics requiring re-study based on wrong answers</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-[10px] border border-[var(--border-main)] bg-[var(--bg-primary)] text-[var(--text-secondary)] shrink-0">
                    {weaknesses.length} Weakness{weaknesses.length === 1 ? '' : 'es'}
                  </span>
                </div>

                {weaknesses.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-semibold text-[var(--text-secondary)]">
                      Priority review topics:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {weaknesses.map((topic, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-primary)] text-xs font-bold text-[var(--text-primary)]">
                          <svg className="w-3.5 h-3.5 fill-current text-[var(--text-muted)]" viewBox="0 0 24 24">
                            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                          </svg>
                          <span>{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic pt-2">
                    No weak topics identified! You answered all assessment questions correctly.
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-[var(--border-main)] text-xs font-medium text-[var(--text-muted)] flex items-center justify-between">
                <span>Action: Review incorrect explanations</span>
                <span className="font-bold text-[var(--text-primary)]">Priority High</span>
              </div>
            </div>

            {/* Mastered Strengths (Correct Answers Panel) */}
            <div className="rounded-[22px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-6 space-y-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-primary)] text-[var(--text-primary)] shrink-0">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)]">Mastered Strengths</h3>
                      <p className="text-xs text-[var(--text-muted)]">Concepts answered correctly in assessment</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-[10px] border border-[var(--border-main)] bg-[var(--bg-primary)] text-[var(--text-secondary)] shrink-0">
                    {strengths.length} Mastered
                  </span>
                </div>

                {strengths.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-semibold text-[var(--text-secondary)]">
                      Demonstrated competency in:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {strengths.map((topic, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-primary)] text-xs font-bold text-[var(--text-primary)]">
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                          </svg>
                          <span>{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic pt-2">
                    Complete an assessment to unlock your strengths appreciation.
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-[var(--border-main)] text-xs font-medium text-[var(--text-muted)] flex items-center justify-between">
                <span>Status: Solid Core Foundation</span>
                <span className="font-bold text-[var(--text-primary)]">{score}% Accuracy</span>
              </div>
            </div>
          </div>

          {/* Score-Tailored Roadmap Milestones */}
          <div className="space-y-4">
            <h2 className="section-title text-xl font-extrabold text-[var(--text-primary)]">
              Score-Tailored Roadmap Milestones
            </h2>

            <div className="space-y-4">
              {items.map((item, idx) => {
                const title = typeof item === 'string' ? item : item.title
                const description = typeof item === 'object' ? item.description : `Step ${idx + 1} milestone for ${tierInfo.tier} level.`
                const estTime = typeof item === 'object' ? item.estimatedTime : '20 mins'
                const difficulty = typeof item === 'object' ? item.difficulty : 'Medium'
                const isCompleted = Boolean(completedSteps[idx])

                return (
                  <div
                    key={idx}
                    className={`rounded-[20px] border p-5 transition-all duration-200 ${
                      isCompleted
                        ? 'border-[var(--border-main)] bg-[var(--bg-primary)] opacity-70'
                        : 'border-[var(--border-main)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          onClick={() => toggleStepCompleted(idx)}
                          className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black shrink-0 transition ${
                            isCompleted
                              ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                              : 'border-[var(--border-main)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:border-[var(--text-primary)]'
                          }`}
                        >
                          {isCompleted ? '✓' : idx + 1}
                        </button>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`text-base font-bold ${isCompleted ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                              {title}
                            </h3>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-3xl">
                            {description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 pl-11 sm:pl-0">
                        <span className="text-[11px] font-semibold text-[var(--text-muted)] px-2.5 py-1 rounded-[8px] bg-[var(--bg-primary)] border border-[var(--border-main)] flex items-center gap-1">
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                          </svg>
                          <span>{estTime}</span>
                        </span>
                        <span className="text-[11px] font-bold text-[var(--text-primary)] px-2.5 py-1 rounded-[8px] bg-[var(--bg-primary)] border border-[var(--border-main)]">
                          {difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="py-12 text-center space-y-4 max-w-md mx-auto">
          <div className="mx-auto h-20 w-20 rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] flex items-center justify-center text-3xl">
            <svg className="w-8 h-8 fill-current text-[var(--text-primary)]" viewBox="0 0 24 24">
              <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/>
            </svg>
          </div>
          <h2 className="section-title text-xl font-extrabold text-[var(--text-primary)]">No roadmap generated yet</h2>
          <p className="body-text text-sm text-[var(--text-secondary)]">
            Take a diagnostic assessment to generate your personalized monochromatic learning path.
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
