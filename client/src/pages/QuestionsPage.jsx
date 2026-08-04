import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import MarkdownRenderer from '../components/MarkdownRenderer.jsx'

export default function QuestionsPage() {
  const { api } = useAuth()
  const [studentType, setStudentType] = useState('')
  const [syllabus, setSyllabus] = useState('')
  const [generating, setGenerating] = useState(false)
  const [practiceData, setPracticeData] = useState({
    twoMarkQuestions: [],
    longAnswerQuestions: []
  })
  const [aiError, setAiError] = useState('')
  const [visibleAnswers, setVisibleAnswers] = useState({})

  const [selectedProvider, setSelectedProvider] = useState(() => {
    return localStorage.getItem('ai_provider') || 'gemini'
  })

  const longAnswerLabel = practiceData.counts?.longAnswerMarks === 14 ? '14-mark Questions' : '5-mark Questions'

  const handleGenerateQuestions = async () => {
    if (!syllabus.trim()) {
      setAiError('Please enter a syllabus before generating questions.')
      return
    }

    setGenerating(true)
    setAiError('')
    try {
      const response = await api.post('/ai/generate-practice', {
        studentType,
        syllabus: syllabus.trim(),
        provider: selectedProvider
      })
      setPracticeData(response.data)
      setVisibleAnswers({}) // Reset visible answers

      // Stamp today's date into catalyst_practice_days in localStorage
      try {
        const localDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
        const stored = JSON.parse(localStorage.getItem('catalyst_practice_days') || '[]')
        if (!stored.includes(localDate)) {
          stored.push(localDate)
          localStorage.setItem('catalyst_practice_days', JSON.stringify(stored))
        }
      } catch (e) {
        console.error('Failed to stamp practice day in localStorage', e)
      }
    } catch (err) {
      setAiError(err.response?.data?.error || 'Unable to generate practice questions')
    } finally {
      setGenerating(false)
    }
  }

  const toggleAnswerVisibility = (key) => {
    setVisibleAnswers((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const TwoMarkQuestion = ({ question, idx, questionKey }) => {
    const isVisible = visibleAnswers[questionKey]
    return (
      <div className="saas-card p-4 sm:p-6 rounded-2xl sm:rounded-[20px]">
        <div className="flex flex-col gap-3.5">
          <p className="card-title font-bold text-sm sm:text-base text-[var(--text-primary)] leading-snug break-words">
            {idx + 1}. {question.question}
          </p>
          <button
            type="button"
            onClick={() => toggleAnswerVisibility(questionKey)}
            className="saas-button-secondary self-start min-h-[44px] px-4 text-xs font-bold text-[var(--accent-color)] cursor-pointer"
          >
            {isVisible ? 'Hide Answer' : 'View Answer'}
          </button>
          {isVisible && (
            <div className="rounded-xl sm:rounded-[14px] bg-[var(--bg-secondary)] p-3.5 sm:p-5 border-l-4 border-[var(--accent-color)] max-w-full overflow-hidden">
              <p className="caption-text uppercase font-semibold mb-1.5 text-[10px] text-[var(--accent-color)]">Expected Answer:</p>
              <p className="body-text text-xs sm:text-sm leading-relaxed text-[var(--text-primary)] break-words max-w-full overflow-x-auto custom-scrollbar">{question.expectedAnswer}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const LongAnswerQuestion = ({ question, idx, questionKey, marks }) => {
    const isVisible = visibleAnswers[questionKey]
    return (
      <div className="saas-card p-4 sm:p-6 rounded-2xl sm:rounded-[20px]">
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="card-title font-bold text-sm sm:text-base text-[var(--text-primary)] leading-snug break-words">
              {idx + 1}. {question.question}
            </p>
            <span className="inline-flex items-center rounded-[12px] bg-[var(--accent-light)] px-2.5 py-1 text-xs font-bold text-[var(--accent-color)] border border-[var(--accent-color)]/20 w-fit shrink-0">
              {marks} marks
            </span>
          </div>
          <button
            type="button"
            onClick={() => toggleAnswerVisibility(questionKey)}
            className="saas-button-secondary self-start min-h-[44px] px-4 text-xs font-bold text-[var(--accent-color)] cursor-pointer"
          >
            {isVisible ? 'Hide Answer' : 'View Answer'}
          </button>
          {isVisible && (
            <div className="rounded-xl sm:rounded-[14px] bg-[var(--bg-secondary)] p-3.5 sm:p-5 border-l-4 border-[var(--accent-color)] max-w-full overflow-hidden">
              <p className="caption-text uppercase font-semibold mb-2 text-[10px] text-[var(--accent-color)]">Expected Answer:</p>
              <div className="max-w-full overflow-x-auto custom-scrollbar">
                <MarkdownRenderer>
                  {question.expectedAnswer}
                </MarkdownRenderer>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-[1280px] max-w-full overflow-x-hidden px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-label">Practice</p>
          <h1 className="page-title mb-1.5 text-2xl sm:text-3xl font-extrabold">Adaptive Questions</h1>
          <p className="page-description text-xs sm:text-sm text-[var(--text-secondary)]">Generate personalized practice questions from any syllabus or topic.</p>
        </div>
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-3 shrink-0 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <label className="small-text font-semibold whitespace-nowrap text-[var(--text-primary)] text-xs sm:text-sm">AI Model</label>
            <select
              value={selectedProvider}
              onChange={(e) => {
                const val = e.target.value
                setSelectedProvider(val)
                localStorage.setItem('ai_provider', val)
              }}
              className="saas-input min-h-[46px] py-2 px-3.5 text-sm font-medium w-full sm:w-auto cursor-pointer"
            >
              <option value="gemini">Gemini</option>
              <option value="groq">Groq</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="small-text font-semibold whitespace-nowrap text-[var(--text-primary)] text-xs sm:text-sm">Student Type</label>
            <select
              value={studentType}
              onChange={(event) => setStudentType(event.target.value)}
              className="saas-input min-h-[46px] py-2 px-3.5 text-sm font-medium w-full sm:w-auto cursor-pointer"
            >
              <option value="">Unspecified</option>
              <option>School Student</option>
              <option>College Student</option>
            </select>
          </div>
        </div>
      </div>

      <hr className="canvas-divider opacity-60" />

      {/* Interactive Form Section */}
      <div className="space-y-3 sm:space-y-4">
        <label className="block text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Syllabus / Topics</label>
        <textarea
          value={syllabus}
          onChange={(event) => setSyllabus(event.target.value)}
          placeholder="Paste the topic or syllabus you want to practice..."
          rows="4"
          className="saas-input w-full min-h-[110px] sm:min-h-[120px] p-3.5 sm:p-4 text-sm sm:text-base leading-relaxed"
        />
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleGenerateQuestions}
            disabled={generating}
            className="saas-button-primary font-bold min-h-[48px] px-6 sm:px-8 text-sm sm:text-base w-full sm:w-auto shadow-md cursor-pointer"
          >
            {generating ? 'Generating...' : 'Generate Questions'}
          </button>
        </div>
      </div>

      {aiError && (
        <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-xs sm:text-sm text-[var(--error-color)] break-words">
          {aiError}
        </p>
      )}

      {/* Questions Output Stream */}
      <div className="space-y-8 sm:space-y-10">
        {practiceData.twoMarkQuestions.length > 0 && (
          <div>
            <hr className="canvas-divider opacity-60" />
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <h2 className="section-title text-xl sm:text-2xl font-extrabold">2-mark Questions</h2>
                <span className="small-text text-[var(--text-muted)] font-medium text-xs">Total: {practiceData.twoMarkQuestions.length} questions</span>
              </div>
              <div className="space-y-4">
                {practiceData.twoMarkQuestions.map((question, idx) => (
                  <TwoMarkQuestion
                    key={`2m-${idx}`}
                    question={question}
                    idx={idx}
                    questionKey={`2m-${idx}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {practiceData.longAnswerQuestions.length > 0 && (
          <div>
            <hr className="canvas-divider opacity-60" />
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <h2 className="section-title text-xl sm:text-2xl font-extrabold">{longAnswerLabel}</h2>
                <span className="small-text text-[var(--text-muted)] font-medium text-xs">
                  Total: {practiceData.longAnswerQuestions.length} questions × {practiceData.counts?.longAnswerMarks} marks
                </span>
              </div>
              <div className="space-y-4">
                {practiceData.longAnswerQuestions.map((question, idx) => (
                  <LongAnswerQuestion
                    key={`la-${idx}`}
                    question={question}
                    idx={idx}
                    questionKey={`la-${idx}`}
                    marks={practiceData.counts?.longAnswerMarks || 5}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {!practiceData.twoMarkQuestions.length && !practiceData.longAnswerQuestions.length && (
          <div>
            <hr className="canvas-divider opacity-60" />
            <p className="body-text text-xs sm:text-sm text-[var(--text-muted)] italic pt-2">
              Paste your syllabus above and click "Generate Questions" to begin.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
