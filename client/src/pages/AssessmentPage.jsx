import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export default function AssessmentPage() {
  const { api } = useAuth()
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [syllabus, setSyllabus] = useState('')
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState('')

  useEffect(() => {
    async function loadAssessmentHistory() {
      try {
        const response = await api.get('/assessment/history')
        if (response.data.length) {
          setResult(response.data[0])
        }
      } catch (err) {
        setError('Unable to load assessment content')
      }
    }
    loadAssessmentHistory()
  }, [api])

  const handleOption = (questionId, option, question) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selected: option,
        correct: option === question.answer,
        subject: question.subject,
        topic: question.topic,
        difficulty: question.difficulty,
        questionId
      }
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const payload = Object.values(answers)
    if (payload.length !== questions.length) {
      setError('Please answer every question before submitting')
      return
    }
    try {
      const response = await api.post('/assessment/submit', { answers: payload })
      setResult(response.data.assessment)
    } catch (err) {
      setError('Assessment submission failed')
    }
  }

  const handleGenerateAssessment = async () => {
    if (!syllabus.trim()) {
      setAiError('Please enter a syllabus before generating questions.')
      return
    }
    setGenerating(true)
    setAiError('')
    setError('')
    setAnswers({})
    setResult(null)
    try {
      const response = await api.post('/ai/generate-assessment', { syllabus: syllabus.trim() })
      setQuestions(response.data.questions || [])
    } catch (err) {
      setAiError(err.response?.data?.error || 'Unable to generate assessment questions')
    } finally {
      setGenerating(false)
    }
  }

  const derivedCorrectAnswers = result?.correctAnswers ?? result?.answers?.filter((item) => item.correct).length ?? 0
  const derivedTotalQuestions = result?.totalQuestions ?? result?.answers?.length ?? questions.length ?? 15
  const derivedPercentage = result?.percentage ?? Math.round((derivedCorrectAnswers / Math.max(derivedTotalQuestions, 1)) * 100)
  const totalQuestions = questions.length || derivedTotalQuestions || 15
  const scoreLabel = result
    ? `${derivedCorrectAnswers} / ${derivedTotalQuestions || totalQuestions}`
    : `0 / ${totalQuestions}`

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      <div className="saas-card shadow-glow">
        <div className="mb-8 border-b border-[var(--divider-main)] pb-6 space-y-2">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">Assessment</p>
          <h1 className="page-title">Diagnostic assessment</h1>
          <p className="body-text max-w-2xl">Answer the questions to generate a better roadmap and get instant recommendations.</p>
        </div>

        {error && <p className="mb-6 rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{error}</p>}
        {aiError && <p className="mb-6 rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{aiError}</p>}

        <div className="mb-8 space-y-4">
          <textarea
            value={syllabus}
            onChange={(event) => setSyllabus(event.target.value)}
            placeholder="Paste your syllabus or topics here..."
            rows="4"
            className="saas-input w-full min-h-[120px]"
          />
          <button
            type="button"
            onClick={handleGenerateAssessment}
            disabled={generating}
            className="saas-button-primary"
          >
            {generating ? 'Generating...' : 'Generate Assessment'}
          </button>
        </div>

        {questions.length ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((question, idx) => (
              <section key={question._id} className="saas-elevated-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-[var(--text-muted)]">
                  <span>{question.subject} • {question.topic}</span>
                  <span className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">{question.difficulty}</span>
                </div>
                <p className="card-title mt-4 text-lg font-semibold">{idx + 1}. {question.text}</p>
                <div className="mt-5 grid gap-3">
                  {question.options.map((option) => (
                    <label key={option} className="flex cursor-pointer items-center gap-4 rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-3.5 transition hover:border-[var(--accent-color)] min-h-[48px]">
                      <input type="radio" name={question._id} value={option} onChange={() => handleOption(question._id, option, question)} checked={answers[question._id]?.selected === option} className="h-4 w-4 text-[var(--accent-color)]" />
                      <span className="body-text text-sm text-[var(--text-primary)]">{option}</span>
                    </label>
                  ))}
                </div>
              </section>
            ))}

            <button type="submit" className="saas-button-primary w-full sm:w-auto">Submit Assessment</button>
          </form>
        ) : (
          <p className="body-text text-sm text-[var(--text-muted)]">Generate an assessment to begin.</p>
        )}
      </div>

      {result && (
        <div className="saas-card shadow-glow">
          <h2 className="section-title mb-6">Recent assessment</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="saas-elevated-card">
              <p className="caption-text uppercase tracking-[0.2em]">Score</p>
              <p className="page-title mt-2">{scoreLabel}</p>
              <p className="small-text mt-1">{derivedCorrectAnswers} correct answers</p>
            </div>
            <div className="saas-elevated-card">
              <p className="caption-text uppercase tracking-[0.2em]">Percentage</p>
              <p className="page-title mt-2">{derivedPercentage}%</p>
            </div>
            <div className="saas-elevated-card">
              <p className="caption-text uppercase tracking-[0.2em]">Classification</p>
              <p className="page-title mt-2">{result.classification}</p>
            </div>
          </div>

          {questions.length > 0 && (
            <section className="mt-8">
              <h3 className="section-title mb-4">Answer review</h3>
              <div className="space-y-4">
                {questions.map((question, idx) => {
                  const answer = result.answers?.find((item) => item.questionId === question._id)
                  const selected = answer?.selected || null
                  const isCorrect = selected === question.answer
                  const correctAnswer = question.answer

                  return (
                    <div key={question._id} className="saas-elevated-card">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="card-title">{idx + 1}. {question.text}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isCorrect ? 'bg-[var(--success-bg)] text-[var(--success-color)]' : 'bg-[var(--error-bg)] text-[var(--error-color)]'}`}>
                          {isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                      <div className="grid gap-2">
                        {question.options.map((option) => {
                          const isSelected = option === selected
                          const isAnswer = option === correctAnswer
                          const optionStyles = isAnswer
                            ? 'border-[var(--success-color)] bg-[var(--success-bg)] text-[var(--text-primary)] font-medium'
                            : isSelected
                              ? 'border-[var(--error-color)] bg-[var(--error-bg)] text-[var(--text-primary)]'
                              : 'border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'

                          return (
                            <div key={option} className={`rounded-[14px] border px-4 py-3 text-sm ${optionStyles}`}>
                              {option}
                            </div>
                          )
                        })}
                      </div>
                      <p className="small-text mt-3">
                        <span className="font-semibold text-[var(--accent-color)]">Correct answer:</span> {correctAnswer}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  )
}
