import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import ReactMarkdown from 'react-markdown'

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
        syllabus: syllabus.trim()
      })
      setPracticeData(response.data)
      setVisibleAnswers({}) // Reset visible answers
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
      <div className="saas-card p-5">
        <div className="flex flex-col gap-4">
          <p className="card-title font-semibold">
            {idx + 1}. {question.question}
          </p>
          <button
            type="button"
            onClick={() => toggleAnswerVisibility(questionKey)}
            className="saas-button-secondary self-start min-h-[40px] px-4 text-xs font-semibold text-[var(--accent-color)]"
          >
            {isVisible ? 'Hide Answer' : 'View Answer'}
          </button>
          {isVisible && (
            <div className="rounded-[14px] bg-[var(--bg-secondary)] p-4 border-l-4 border-[var(--accent-color)]">
              <p className="caption-text uppercase font-semibold mb-1">Answer:</p>
              <p className="body-text leading-relaxed">{question.expectedAnswer}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const LongAnswerQuestion = ({ question, idx, questionKey, marks }) => {
    const isVisible = visibleAnswers[questionKey]
    return (
      <div className="saas-card p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="card-title font-semibold">
              {idx + 1}. {question.question}
            </p>
            <span className="inline-flex items-center rounded-[14px] bg-[var(--accent-light)] px-3 py-1 text-xs font-semibold text-[var(--accent-color)] border border-[var(--accent-color)]/20 w-fit">
              {marks} marks
            </span>
          </div>
          <button
            type="button"
            onClick={() => toggleAnswerVisibility(questionKey)}
            className="saas-button-secondary self-start min-h-[40px] px-4 text-xs font-semibold text-[var(--accent-color)]"
          >
            {isVisible ? 'Hide Answer' : 'View Answer'}
          </button>
          {isVisible && (
            <div className="rounded-[14px] bg-[var(--bg-secondary)] p-5 border-l-4 border-[var(--accent-color)]">
              <p className="caption-text uppercase font-semibold mb-2">Expected Answer:</p>
              <div className="prose prose-invert max-w-none text-sm leading-relaxed text-[var(--text-primary)] space-y-2">
                <ReactMarkdown>
                  {question.expectedAnswer}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-label">Practice</p>
          <h1 className="page-title mb-2">Adaptive Questions</h1>
          <p className="page-description">Generate personalized practice questions from any syllabus or topic.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="small-text font-semibold whitespace-nowrap text-[var(--text-primary)]">Student Type</label>
          <select
            value={studentType}
            onChange={(event) => setStudentType(event.target.value)}
            className="saas-input min-h-[44px] py-2 px-3 text-sm font-medium"
          >
            <option value="">Unspecified</option>
            <option>School Student</option>
            <option>College Student</option>
          </select>
        </div>
      </div>

      <hr className="canvas-divider" />

      {/* Interactive Form Section */}
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-[var(--text-primary)]">Syllabus / Topics</label>
        <textarea
          value={syllabus}
          onChange={(event) => setSyllabus(event.target.value)}
          placeholder="Paste the topic or syllabus you want to practice..."
          rows="4"
          className="saas-input w-full min-h-[120px] p-4 text-base"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleGenerateQuestions}
            disabled={generating}
            className="saas-button-primary font-bold px-8 shadow-sm"
          >
            {generating ? 'Generating...' : 'Generate Questions'}
          </button>
        </div>
      </div>

      {aiError && (
        <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">
          {aiError}
        </p>
      )}

      {/* Questions Output Stream */}
      <div className="space-y-10">
        {practiceData.twoMarkQuestions.length > 0 && (
          <div>
            <hr className="canvas-divider" />
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <h2 className="section-title">2-mark Questions</h2>
                <span className="small-text text-[var(--text-muted)] font-medium">Total: {practiceData.twoMarkQuestions.length} questions</span>
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
            <hr className="canvas-divider" />
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <h2 className="section-title">{longAnswerLabel}</h2>
                <span className="small-text text-[var(--text-muted)] font-medium">
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
            <hr className="canvas-divider" />
            <p className="body-text text-sm text-[var(--text-muted)] italic">
              Paste your syllabus above and click "Generate Questions" to begin.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
