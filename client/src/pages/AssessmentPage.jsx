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
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-8 shadow-glow">
        <div className="mb-8 space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--accent-color)]">Assessment</p>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Diagnostic assessment</h1>
          <p className="max-w-2xl text-[var(--text-secondary)]">Answer the questions to generate a better roadmap and get instant recommendations.</p>
        </div>

        {error && <p className="mb-6 rounded-2xl bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{error}</p>}
        {aiError && <p className="mb-6 rounded-2xl bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{aiError}</p>}

        <div className="mb-6 space-y-3">
          <textarea
            value={syllabus}
            onChange={(event) => setSyllabus(event.target.value)}
            placeholder="Paste your syllabus or topics here..."
            rows="4"
            className="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleGenerateAssessment}
            disabled={generating}
            className="rounded-2xl bg-[var(--accent-color)] px-6 py-3 text-sm font-semibold text-[var(--accent-contrast-text)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {generating ? 'Generating...' : 'Generate Assessment'}
          </button>
        </div>

        {questions.length ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((question, idx) => (
              <section key={question._id} className="rounded-[1.75rem] border border-[var(--border-main)] bg-[var(--bg-elevated)] p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-[var(--text-muted)]">
                  <span>{question.subject} • {question.topic}</span>
                  <span className="rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] px-3 py-1 text-[var(--text-secondary)]">{question.difficulty}</span>
                </div>
                <p className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{idx + 1}. {question.text}</p>
                <div className="mt-5 grid gap-3">
                  {question.options.map((option) => (
                    <label key={option} className="flex cursor-pointer items-center gap-4 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-3 transition hover:border-[var(--accent-color)]">
                      <input type="radio" name={question._id} value={option} onChange={() => handleOption(question._id, option, question)} checked={answers[question._id]?.selected === option} className="h-4 w-4 text-[var(--accent-color)]" />
                      <span className="text-[var(--text-primary)]">{option}</span>
                    </label>
                  ))}
                </div>
              </section>
            ))}

            <button type="submit" className="rounded-2xl bg-[var(--accent-color)] px-6 py-3 text-sm font-semibold text-[var(--accent-contrast-text)] transition hover:bg-[var(--accent-hover)]">Submit Assessment</button>
          </form>
        ) : (
          <p className="text-[var(--text-muted)]">Generate an assessment to begin.</p>
        )}
      </div>

      {result && (
        <div className="mt-8 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-8 shadow-glow">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Recent assessment</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-elevated)] p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--text-muted)]">Score</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{scoreLabel}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{derivedCorrectAnswers} correct answers</p>
            </div>
            <div className="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-elevated)] p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--text-muted)]">Percentage</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{derivedPercentage}%</p>
            </div>
            <div className="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-elevated)] p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--text-muted)]">Classification</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{result.classification}</p>
            </div>
          </div>

          {questions.length > 0 && (
            <section className="mt-8">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">Answer review</h3>
              <div className="mt-4 space-y-4">
                {questions.map((question, idx) => {
                  const answer = result.answers?.find((item) => item.questionId === question._id)
                  const selected = answer?.selected || null
                  const isCorrect = selected === question.answer
                  const correctAnswer = question.answer

                  return (
                    <div key={question._id} className="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-elevated)] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-base font-semibold text-[var(--text-primary)]">{idx + 1}. {question.text}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isCorrect ? 'bg-[var(--success-bg)] text-[var(--success-color)]' : 'bg-[var(--error-bg)] text-[var(--error-color)]'}`}>
                          {isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {question.options.map((option) => {
                          const isSelected = option === selected
                          const isAnswer = option === correctAnswer
                          const optionStyles = isAnswer
                            ? 'border-[var(--success-color)] bg-[var(--success-bg)] text-[var(--text-primary)] font-medium'
                            : isSelected
                              ? 'border-[var(--error-color)] bg-[var(--error-bg)] text-[var(--text-primary)]'
                              : 'border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'

                          return (
                            <div key={option} className={`rounded-2xl border px-4 py-3 text-sm ${optionStyles}`}>
                              {option}
                            </div>
                          )
                        })}
                      </div>
                      <p className="mt-3 text-sm text-[var(--text-secondary)]">
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
