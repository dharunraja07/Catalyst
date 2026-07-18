import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import AIGeneratingLoader from '../components/AIGeneratingLoader.jsx'

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
      <div className="overflow-hidden rounded-[2rem] border border-ink-200 bg-white p-8 shadow-glow">
        <div className="mb-8 space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-brand-600/80">Assessment</p>
          <h1 className="text-3xl font-semibold text-ink-900">Diagnostic assessment</h1>
          <p className="max-w-2xl text-ink-500">Answer the questions to generate a better roadmap and get instant recommendations.</p>
        </div>

        {error && <p className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {aiError && <p className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{aiError}</p>}

        <div className="mb-6 space-y-3">
          <textarea
            value={syllabus}
            onChange={(event) => setSyllabus(event.target.value)}
            placeholder="Paste your syllabus or topics here..."
            rows="4"
            className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleGenerateAssessment}
            disabled={generating}
            className="rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {generating ? 'Generating...' : 'Generate Assessment'}
          </button>
        </div>

        {questions.length ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((question, idx) => (
              <section key={question._id} className="rounded-[1.75rem] border border-ink-200 bg-white p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-ink-400">
                  <span>{question.subject} • {question.topic}</span>
                  <span className="rounded-full border border-ink-200 px-3 py-1">{question.difficulty}</span>
                </div>
                <p className="mt-4 text-lg font-semibold text-ink-900">{idx + 1}. {question.text}</p>
                <div className="mt-5 grid gap-3">
                  {question.options.map((option) => (
                    <label key={option} className="flex cursor-pointer items-center gap-4 rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 transition hover:border-brand-400">
                      <input type="radio" name={question._id} value={option} onChange={() => handleOption(question._id, option, question)} checked={answers[question._id]?.selected === option} className="h-4 w-4 text-brand-500" />
                      <span className="text-ink-700">{option}</span>
                    </label>
                  ))}
                </div>
              </section>
            ))}

            <button type="submit" className="rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600">Submit Assessment</button>
          </form>
        ) : generating ? (
          <AIGeneratingLoader label="Generating your assessment with AI..." />
        ) : (
          <p className="text-ink-500">Generate an assessment to begin.</p>
        )}
      </div>

      {result && (
        <div className="mt-8 rounded-[2rem] border border-ink-200 bg-white p-8 shadow-glow">
          <h2 className="text-2xl font-semibold text-ink-900">Recent assessment</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-ink-50 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-ink-400">Score</p>
              <p className="mt-2 text-3xl font-semibold text-ink-900">{scoreLabel}</p>
              <p className="mt-1 text-sm text-ink-500">{derivedCorrectAnswers} correct answers</p>
            </div>
            <div className="rounded-3xl bg-ink-50 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-ink-400">Percentage</p>
              <p className="mt-2 text-3xl font-semibold text-ink-900">{derivedPercentage}%</p>
            </div>
            <div className="rounded-3xl bg-ink-50 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-ink-400">Classification</p>
              <p className="mt-2 text-3xl font-semibold text-ink-900">{result.classification}</p>
            </div>
          </div>

          {questions.length > 0 && (
            <section className="mt-8">
              <h3 className="text-xl font-semibold text-ink-900">Answer review</h3>
              <div className="mt-4 space-y-4">
                {questions.map((question, idx) => {
                  const answer = result.answers?.find((item) => item.questionId === question._id)
                  const selected = answer?.selected || null
                  const isCorrect = selected === question.answer
                  const correctAnswer = question.answer

                  return (
                    <div key={question._id} className="rounded-3xl border border-ink-200 bg-ink-50 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-base font-semibold text-ink-900">{idx + 1}. {question.text}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {question.options.map((option) => {
                          const isSelected = option === selected
                          const isAnswer = option === correctAnswer
                          const optionStyles = isAnswer
                            ? 'border-emerald-500/40 bg-emerald-50 text-emerald-700'
                            : isSelected
                              ? 'border-red-300 bg-red-50 text-red-700'
                              : 'border-ink-200 bg-white text-ink-600'

                          return (
                            <div key={option} className={`rounded-2xl border px-4 py-3 text-sm ${optionStyles}`}>
                              {option}
                            </div>
                          )
                        })}
                      </div>
                      <p className="mt-3 text-sm text-ink-600">
                        <span className="font-semibold text-brand-600">Correct answer:</span> {correctAnswer}
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
