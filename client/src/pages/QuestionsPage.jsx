import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import ReactMarkdown from 'react-markdown'
import AIGeneratingLoader from '../components/AIGeneratingLoader.jsx'

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
      <div className="rounded-2xl border border-ink-200 bg-ink-50 p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <p className="text-base font-semibold text-ink-900">
            {idx + 1}. {question.question}
          </p>
          <button
            type="button"
            onClick={() => toggleAnswerVisibility(questionKey)}
            className="w-full rounded-2xl border border-brand-500/50 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-500/10 sm:w-auto"
          >
            {isVisible ? 'Hide Answer' : 'View Answer'}
          </button>
          {isVisible && (
            <div className="rounded-2xl bg-white p-4 border-l-4 border-brand-400">
              <p className="text-xs uppercase tracking-wider text-ink-500 mb-2">Answer:</p>
              <p className="text-ink-800 leading-relaxed">{question.expectedAnswer}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const LongAnswerQuestion = ({ question, idx, questionKey, marks }) => {
    const isVisible = visibleAnswers[questionKey]
    return (
      <div className="rounded-2xl border border-ink-200 bg-ink-50 p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-base font-semibold text-ink-900">
              {idx + 1}. {question.question}
            </p>
            <span className="inline-flex rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 w-fit">
              {marks} marks
            </span>
          </div>
          <button
            type="button"
            onClick={() => toggleAnswerVisibility(questionKey)}
            className="w-full rounded-2xl border border-brand-500/50 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-500/10 sm:w-auto"
          >
            {isVisible ? 'Hide Answer' : 'View Answer'}
          </button>
          {isVisible && (
            <div className="rounded-2xl bg-white p-4 sm:p-6 border-l-4 border-brand-400">
              <p className="text-xs uppercase tracking-wider text-ink-500 mb-3">Expected Answer:</p>
              <div className="prose max-w-none text-sm leading-relaxed text-ink-800 space-y-2">
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
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-[2rem] border border-ink-200 bg-white p-8 shadow-glow">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-brand-600/80">Practice</p>
            <h1 className="text-3xl font-semibold text-ink-900">Adaptive questions</h1>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <label className="text-sm text-ink-500">Student Type</label>
            <select
              value={studentType}
              onChange={(event) => setStudentType(event.target.value)}
              className="rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none"
            >
              <option value="">Unspecified</option>
              <option>School Student</option>
              <option>College Student</option>
            </select>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <textarea
            value={syllabus}
            onChange={(event) => setSyllabus(event.target.value)}
            placeholder="Paste the topic or syllabus you want to practice..."
            rows="4"
            className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleGenerateQuestions}
              disabled={generating}
              className="rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {generating ? 'Generating...' : 'Generate Questions'}
            </button>
          </div>
        </div>

        {aiError && <p className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{aiError}</p>}

        {generating && <div className="mb-6"><AIGeneratingLoader label="Generating practice questions with AI..." /></div>}

        <div className="grid gap-6">
          {practiceData.twoMarkQuestions.length > 0 && (
            <section className="rounded-[1.75rem] border border-ink-200 bg-white p-6">
              <h2 className="text-2xl font-semibold text-ink-900 mb-2">2-mark Questions</h2>
              <p className="text-sm text-ink-500 mb-5">Total: {practiceData.twoMarkQuestions.length} questions</p>
              <div className="mt-5 space-y-4">
                {practiceData.twoMarkQuestions.map((question, idx) => (
                  <TwoMarkQuestion
                    key={`2m-${idx}`}
                    question={question}
                    idx={idx}
                    questionKey={`2m-${idx}`}
                  />
                ))}
              </div>
            </section>
          )}

          {practiceData.longAnswerQuestions.length > 0 && (
            <section className="rounded-[1.75rem] border border-ink-200 bg-white p-6">
              <h2 className="text-2xl font-semibold text-ink-900 mb-2">{longAnswerLabel}</h2>
              <p className="text-sm text-ink-500 mb-5">Total: {practiceData.longAnswerQuestions.length} questions × {practiceData.counts?.longAnswerMarks} marks</p>
              <div className="mt-5 space-y-4">
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
            </section>
          )}

          {!practiceData.twoMarkQuestions.length && !practiceData.longAnswerQuestions.length && (
            <p className="text-ink-500">Generate practice questions to begin.</p>
          )}
        </div>
      </div>
    </main>
  )
}
