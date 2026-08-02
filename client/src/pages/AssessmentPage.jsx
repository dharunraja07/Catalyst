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

  const [selectedDifficulty, setSelectedDifficulty] = useState('adaptive')

  const difficultyModes = [
    {
      id: 'easy',
      label: 'Easy',
      icon: '🟢',
      badge: '15 Easy Questions',
      description: 'Foundational concepts & definitions',
      activeClass: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30'
    },
    {
      id: 'medium',
      label: 'Medium',
      icon: '🟡',
      badge: '15 Medium Questions',
      description: 'Standard application & conceptual questions',
      activeClass: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/30'
    },
    {
      id: 'hard',
      label: 'Hard',
      icon: '🔴',
      badge: '15 Hard Questions',
      description: 'Advanced problem-solving & edge cases',
      activeClass: 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/30'
    },
    {
      id: 'adaptive',
      label: 'Default / Adaptive',
      icon: '⚡',
      badge: '15 Focus Unlearned',
      description: 'Targets weak topics from previous assessment',
      activeClass: 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-[var(--text-primary)] ring-2 ring-[var(--accent-color)]/30'
    }
  ]

  const handleGenerateAssessment = async () => {
    if (!syllabus.trim() && selectedDifficulty !== 'adaptive') {
      setAiError('Please enter a syllabus or topics before generating questions.')
      return
    }
    setGenerating(true)
    setAiError('')
    setError('')
    setAnswers({})
    setResult(null)
    try {
      const provider = localStorage.getItem('ai_provider') || 'gemini'

      let targetSyllabus = syllabus.trim()
      if (selectedDifficulty === 'adaptive' && result?.answers?.length) {
        const unlearnedList = result.answers
          .filter((a) => !a.correct)
          .map((a) => a.topic || a.subject)
          .filter(Boolean)
        const uniqueUnlearned = Array.from(new Set(unlearnedList))
        if (uniqueUnlearned.length > 0) {
          const focusContext = `Focus specifically on unlearned topics: ${uniqueUnlearned.join(', ')}`
          targetSyllabus = targetSyllabus ? `${targetSyllabus} (${focusContext})` : focusContext
        }
      }

      if (!targetSyllabus) {
        targetSyllabus = 'General Diagnostic Assessment'
      }

      const response = await api.post('/ai/generate-assessment', {
        syllabus: targetSyllabus,
        provider,
        difficulty: selectedDifficulty
      })
      setQuestions(response.data.questions || [])
    } catch (err) {
      setAiError(err.response?.data?.error || 'Unable to generate assessment questions')
    } finally {
      setGenerating(false)
    }
  }

  const derivedCorrectAnswers = result?.correctAnswers ?? result?.answers?.filter((item) => item.correct).length ?? 0
  const [selectedProvider, setSelectedProvider] = useState(() => {
    return localStorage.getItem('ai_provider') || 'gemini'
  })

  const derivedTotalQuestions = result?.totalQuestions ?? result?.answers?.length ?? questions.length ?? 15
  const derivedPercentage = result?.percentage ?? Math.round((derivedCorrectAnswers / Math.max(derivedTotalQuestions, 1)) * 100)
  const totalQuestions = questions.length || derivedTotalQuestions || 15
  const scoreLabel = result
    ? `${derivedCorrectAnswers} / ${derivedTotalQuestions || totalQuestions}`
    : `0 / ${totalQuestions}`

  return (
    <main className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-label">Assessment</p>
          <h1 className="page-title mb-2">Diagnostic Assessment</h1>
          <p className="page-description">Answer the questions to generate a personalized roadmap and instant recommendations.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="small-text font-semibold whitespace-nowrap text-[var(--text-primary)]">AI Model</label>
          <select
            value={selectedProvider}
            onChange={(e) => {
              const val = e.target.value
              setSelectedProvider(val)
              localStorage.setItem('ai_provider', val)
            }}
            className="saas-input min-h-[44px] py-2 px-3 text-sm font-medium"
          >
            <option value="gemini">Gemini</option>
            <option value="groq">Groq</option>
          </select>
        </div>
      </div>

      <hr className="canvas-divider" />

      {error && (
        <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">
          {error}
        </p>
      )}
      {aiError && (
        <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">
          {aiError}
        </p>
      )}

      {/* Assessment Difficulty / Mode Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-[var(--text-primary)]">
          Select Assessment Mode / Difficulty
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {difficultyModes.map((mode) => {
            const isSelected = selectedDifficulty === mode.id
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setSelectedDifficulty(mode.id)}
                className={`flex flex-col justify-between text-left p-4 rounded-[18px] border transition-all duration-200 min-h-[110px] ${
                  isSelected
                    ? mode.activeClass
                    : 'border-[var(--border-main)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] text-[var(--text-secondary)]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xl">{mode.icon}</span>
                  <span
                    className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${
                      isSelected
                        ? 'border-current bg-current/10'
                        : 'border-[var(--border-main)] bg-[var(--bg-primary)] text-[var(--text-muted)]'
                    }`}
                  >
                    {mode.badge}
                  </span>
                </div>
                <div className="mt-3">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    {mode.label}
                    {isSelected && <span className="text-xs font-black">✓</span>}
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-snug">
                    {mode.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Syllabus Generation Form */}
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-[var(--text-primary)]">Syllabus / Topics</label>
        <textarea
          value={syllabus}
          onChange={(event) => setSyllabus(event.target.value)}
          placeholder={
            selectedDifficulty === 'adaptive'
              ? 'Enter topics or leave empty to automatically focus on unlearned topics from your previous assessment...'
              : 'Paste your syllabus or topics here...'
          }
          rows="4"
          className="saas-input w-full min-h-[120px] p-4 text-base"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleGenerateAssessment}
            disabled={generating}
            className="saas-button-primary font-bold px-8 shadow-sm"
          >
            {generating ? 'Generating...' : `Generate ${selectedDifficulty.toUpperCase()} Assessment`}
          </button>
        </div>
      </div>

      {/* Questions Stream */}
      {questions.length ? (
        <div className="space-y-8">
          <hr className="canvas-divider" />
          <h2 className="section-title">Assessment Questions</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((question, idx) => (
              <section key={question._id} className="rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-6 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs font-semibold text-[var(--text-muted)]">
                  <span>{question.subject} • {question.topic}</span>
                  <span className={`rounded-[10px] border px-3 py-1 text-xs font-bold w-fit ${
                    (question.difficulty || selectedDifficulty).toLowerCase() === 'easy'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : (question.difficulty || selectedDifficulty).toLowerCase() === 'hard'
                        ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : (question.difficulty || selectedDifficulty).toLowerCase() === 'adaptive'
                          ? 'border-[var(--accent-color)]/40 bg-[var(--accent-color)]/10 text-[var(--text-primary)]'
                          : 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}>
                    {question.difficulty && question.difficulty !== 'Medium'
                      ? question.difficulty
                      : selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}
                  </span>
                </div>
                <p className="card-title mt-4 text-lg font-bold">{idx + 1}. {question.text}</p>
                <div className="mt-5 grid gap-3">
                  {question.options.map((option) => (
                    <label key={option} className="flex cursor-pointer items-center gap-4 rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-primary)] px-4 py-3.5 transition hover:border-[var(--accent-color)] min-h-[48px]">
                      <input type="radio" name={question._id} value={option} onChange={() => handleOption(question._id, option, question)} checked={answers[question._id]?.selected === option} className="h-4 w-4 text-[var(--accent-color)]" />
                      <span className="body-text text-sm text-[var(--text-primary)] font-medium">{option}</span>
                    </label>
                  ))}
                </div>
              </section>
            ))}

            <div className="pt-4">
              <button type="submit" className="saas-button-primary font-bold px-10 min-h-[48px] text-base w-full sm:w-auto shadow-md">
                Submit Assessment
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div>
          <hr className="canvas-divider" />
          <p className="body-text text-sm text-[var(--text-muted)] italic">Generate an assessment to begin.</p>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="space-y-6 pt-4">
          <hr className="canvas-divider" />
          <h2 className="section-title">Recent Assessment Results</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-6 text-center shadow-sm">
              <p className="caption-text uppercase tracking-widest font-semibold">Score</p>
              <p className="page-title text-3xl mt-2">{scoreLabel}</p>
              <p className="small-text mt-1">{derivedCorrectAnswers} correct answers</p>
            </div>
            <div className="rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-6 text-center shadow-sm">
              <p className="caption-text uppercase tracking-widest font-semibold">Percentage</p>
              <p className="page-title text-3xl mt-2 text-[var(--accent-color)]">{derivedPercentage}%</p>
            </div>
            <div className="rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-6 text-center shadow-sm">
              <p className="caption-text uppercase tracking-widest font-semibold">Classification</p>
              <p className="page-title text-3xl mt-2">{result.classification}</p>
            </div>
          </div>

          {questions.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="section-title">Answer Review</h3>
              <div className="space-y-4">
                {questions.map((question, idx) => {
                  const answer = result.answers?.find((item) => item.questionId === question._id)
                  const selected = answer?.selected || null
                  const isCorrect = selected === question.answer
                  const correctAnswer = question.answer

                  return (
                    <div key={question._id} className="rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-6 shadow-sm">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="card-title text-base font-bold">{idx + 1}. {question.text}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isCorrect ? 'bg-[var(--success-bg)] text-[var(--success-color)]' : 'bg-[var(--error-bg)] text-[var(--error-color)]'}`}>
                          {isCorrect ? '✓ Correct' : '✕ Incorrect'}
                        </span>
                      </div>
                      <div className="grid gap-2">
                        {question.options.map((option) => {
                          const isSelected = option === selected
                          const isAnswer = option === correctAnswer
                          const optionStyles = isAnswer
                            ? 'border-[var(--success-color)] bg-[var(--success-bg)] text-[var(--text-primary)] font-semibold'
                            : isSelected
                              ? 'border-[var(--error-color)] bg-[var(--error-bg)] text-[var(--text-primary)]'
                              : 'border-[var(--border-main)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'

                          return (
                            <div key={option} className={`rounded-[14px] border px-4 py-3 text-sm font-medium ${optionStyles}`}>
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
            </div>
          )}
        </div>
      )}
    </main>
  )
}
