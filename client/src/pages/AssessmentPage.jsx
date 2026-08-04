import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import FileCard from '../components/FileCard.jsx'
import FileUploadZone from '../components/FileUploadZone.jsx'
import FilePreviewModal from '../components/FilePreviewModal.jsx'

export default function AssessmentPage() {
  const { api, user } = useAuth()
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [syllabus, setSyllabus] = useState('')
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState('')

  // Document Management State
  const [documents, setDocuments] = useState([])
  const [previewFile, setPreviewFile] = useState(null)
  const [docSearch, setDocSearch] = useState('')

  const isInstructorOrAdmin = user?.role === 'instructor' || user?.role === 'admin'

  useEffect(() => {
    async function loadAssessmentData() {
      try {
        const [historyResp, docsResp] = await Promise.all([
          api.get('/assessment/history'),
          api.get('/documents', { params: { module: 'assessment' } })
        ])
        if (historyResp.data?.length) {
          setResult(historyResp.data[0])
        }
        setDocuments(docsResp.data || [])
      } catch (err) {
        setError('Unable to load assessment content')
      }
    }
    loadAssessmentData()
  }, [api])

  const handleDeleteDocument = async (file) => {
    try {
      await api.delete(`/documents/${file._id || file.id}`)
      setDocuments((prev) => prev.filter((d) => (d._id || d.id) !== (file._id || file.id)))
    } catch (err) {
      setError('Failed to delete document')
    }
  }

  const filteredDocs = documents.filter((doc) => {
    if (!docSearch.trim()) return true
    const q = docSearch.toLowerCase().trim()
    return (
      (doc.originalName || doc.filename || '').toLowerCase().includes(q) ||
      (doc.uploaderName || '').toLowerCase().includes(q)
    )
  })

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
    { id: 'easy', label: 'Easy' },
    { id: 'medium', label: 'Medium' },
    { id: 'hard', label: 'Hard' },
    { id: 'adaptive', label: 'Default / Adaptive' }
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
        difficulty: selectedDifficulty,
        documentIds: documents.map((d) => d._id || d.id).filter(Boolean)
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
    <main className="mx-auto max-w-[1280px] max-w-full overflow-x-hidden px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-label">Assessment</p>
          <h1 className="page-title mb-1.5 text-2xl sm:text-3xl font-extrabold">Diagnostic Assessment</h1>
          <p className="page-description text-xs sm:text-sm text-[var(--text-secondary)]">Answer the questions to generate a personalized roadmap and instant recommendations.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto w-full sm:w-auto">
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
      </div>

      <hr className="canvas-divider opacity-60" />

      {error && (
        <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-xs sm:text-sm text-[var(--error-color)] break-words">
          {error}
        </p>
      )}
      {aiError && (
        <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-xs sm:text-sm text-[var(--error-color)] break-words">
          {aiError}
        </p>
      )}

      {/* Assessment Difficulty / Mode Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <label className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap">
          Select Assessment Mode / Difficulty
        </label>
        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="saas-input min-h-[46px] py-2 px-3.5 text-sm font-medium w-full sm:w-auto min-w-[200px] cursor-pointer"
        >
          {difficultyModes.map((mode) => (
            <option key={mode.id} value={mode.id} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
              {mode.label}
            </option>
          ))}
        </select>
      </div>

      {/* Syllabus Generation Form */}
      <div className="space-y-3 sm:space-y-4">
        <label className="block text-xs sm:text-sm font-semibold text-[var(--text-primary)]">Syllabus / Topics</label>
        <textarea
          value={syllabus}
          onChange={(event) => setSyllabus(event.target.value)}
          placeholder={
            selectedDifficulty === 'adaptive'
              ? 'Enter topics or leave empty to automatically focus on unlearned topics from your previous assessment...'
              : 'Paste your syllabus or topics here...'
          }
          rows="4"
          className="saas-input w-full min-h-[110px] sm:min-h-[120px] p-3.5 sm:p-4 text-sm sm:text-base leading-relaxed"
        />
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleGenerateAssessment}
            disabled={generating}
            className="saas-button-primary font-bold min-h-[48px] px-6 sm:px-8 text-sm sm:text-base w-full sm:w-auto shadow-md cursor-pointer"
          >
            {generating ? 'Generating...' : `Generate ${selectedDifficulty.toUpperCase()} Assessment`}
          </button>
        </div>
      </div>

      {/* Supporting Documents & Reference Materials Module Section */}
      <div className="space-y-4 sm:space-y-5 rounded-2xl sm:rounded-[20px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-main)] pb-3">
          <div>
            <h3 className="section-title text-lg font-bold flex items-center gap-2">
              <span>📚</span>
              <span>Assessment Reference Documents</span>
            </h3>
            <p className="caption-text text-xs text-[var(--text-secondary)]">Question papers, reference notes, and diagrams for study</p>
          </div>

          <input
            type="text"
            value={docSearch}
            onChange={(e) => setDocSearch(e.target.value)}
            placeholder="Search documents by name..."
            className="saas-input py-1.5 px-3 text-xs w-full sm:w-64"
          />
        </div>

        <FileUploadZone
          api={api}
          moduleName="assessment"
          onUploadSuccess={(newDocs) => {
            setDocuments((prev) => [...newDocs, ...prev])
          }}
        />

        {filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {filteredDocs.map((doc) => (
              <FileCard
                key={doc._id || doc.id}
                file={doc}
                onPreview={setPreviewFile}
                onDelete={handleDeleteDocument}
                canDelete={isInstructorOrAdmin || doc.uploadedBy?._id === user?.id || doc.uploadedBy === user?.id}
                showDownload={false}
              />
            ))}
          </div>
        ) : (
          <p className="text-center body-text text-xs text-[var(--text-muted)] italic py-2">
            {docSearch ? 'No matching documents found.' : 'No reference documents uploaded yet.'}
          </p>
        )}
      </div>

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Questions Stream */}
      {questions.length ? (
        <div className="space-y-6 sm:space-y-8 pt-2">
          <hr className="canvas-divider opacity-60" />
          <div className="flex items-center justify-between">
            <h2 className="section-title text-xl sm:text-2xl font-extrabold">Assessment Questions</h2>
            <span className="px-3 py-1 rounded-full bg-[var(--accent-light)] border border-[var(--accent-color)]/30 text-xs font-bold text-[var(--accent-color)]">
              {Object.keys(answers).length} / {questions.length} Answered
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {questions.map((question, idx) => (
              <section key={question._id} className="rounded-2xl sm:rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[var(--text-muted)]">
                  <span className="break-words">{question.subject} • {question.topic}</span>
                  <span className={`rounded-[10px] border px-2.5 py-0.5 text-[11px] font-bold shrink-0 ${
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

                <p className="card-title text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug break-words">
                  {idx + 1}. {question.text}
                </p>

                <div className="grid gap-2.5 sm:gap-3">
                  {question.options.map((option) => (
                    <label
                      key={option}
                      className={`flex cursor-pointer items-center gap-3 sm:gap-4 rounded-xl sm:rounded-[14px] border p-3 sm:p-4 transition min-h-[48px] w-full break-words select-none ${
                        answers[question._id]?.selected === option
                          ? 'border-[var(--accent-color)] bg-[var(--accent-light)]/20 ring-1 ring-[var(--accent-color)]/40'
                          : 'border-[var(--border-main)] bg-[var(--bg-primary)] hover:border-[var(--accent-color)]/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name={question._id}
                        value={option}
                        onChange={() => handleOption(question._id, option, question)}
                        checked={answers[question._id]?.selected === option}
                        className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent-color)]"
                      />
                      <span className="body-text text-xs sm:text-sm text-[var(--text-primary)] font-medium break-words leading-relaxed">
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            ))}

            {/* Sticky Submission & Navigation Action Bar */}
            <div className="sticky bottom-0 z-20 -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 py-3.5 bg-[var(--bg-surface)]/95 backdrop-blur-md border-t border-[var(--border-main)] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
              <p className="text-xs font-semibold text-[var(--text-secondary)] text-center sm:text-left">
                {Object.keys(answers).length === questions.length ? (
                  <span className="text-emerald-500 font-bold">✓ All questions answered! Ready to submit.</span>
                ) : (
                  <span>Answered {Object.keys(answers).length} of {questions.length} questions</span>
                )}
              </p>

              <button
                type="submit"
                className="saas-button-primary font-bold min-h-[48px] px-8 text-sm sm:text-base w-full sm:w-auto shadow-md cursor-pointer shrink-0"
              >
                Submit Assessment
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div>
          <hr className="canvas-divider opacity-60" />
          <p className="body-text text-xs sm:text-sm text-[var(--text-muted)] italic pt-2">Generate an assessment to begin.</p>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="space-y-5 sm:space-y-6 pt-4">
          <hr className="canvas-divider opacity-60" />
          <h2 className="section-title text-xl sm:text-2xl font-extrabold">Recent Assessment Results</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl sm:rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4.5 sm:p-6 text-center shadow-sm">
              <p className="caption-text uppercase tracking-widest font-semibold text-[10px] text-[var(--text-muted)]">Score</p>
              <p className="page-title text-2xl sm:text-3xl font-extrabold mt-1 sm:mt-2 break-words">{scoreLabel}</p>
              <p className="small-text mt-1 text-xs text-[var(--text-secondary)]">{derivedCorrectAnswers} correct answers</p>
            </div>
            <div className="rounded-2xl sm:rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4.5 sm:p-6 text-center shadow-sm">
              <p className="caption-text uppercase tracking-widest font-semibold text-[10px] text-[var(--text-muted)]">Percentage</p>
              <p className="page-title text-2xl sm:text-3xl font-extrabold mt-1 sm:mt-2 text-[var(--accent-color)] break-words">{derivedPercentage}%</p>
            </div>
            <div className="rounded-2xl sm:rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4.5 sm:p-6 text-center shadow-sm">
              <p className="caption-text uppercase tracking-widest font-semibold text-[10px] text-[var(--text-muted)]">Classification</p>
              <p className="page-title text-2xl sm:text-3xl font-extrabold mt-1 sm:mt-2 break-words">{result.classification}</p>
            </div>
          </div>

          {questions.length > 0 && (
            <div className="space-y-4 pt-3">
              <h3 className="section-title text-lg font-bold">Answer Review</h3>
              <div className="space-y-4">
                {questions.map((question, idx) => {
                  const answer = result.answers?.find((item) => item.questionId === question._id)
                  const selected = answer?.selected || null
                  const isCorrect = selected === question.answer
                  const correctAnswer = question.answer

                  return (
                    <div key={question._id} className="rounded-2xl sm:rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4 sm:p-6 shadow-sm space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="card-title text-sm sm:text-base font-bold break-words">{idx + 1}. {question.text}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold w-fit shrink-0 ${isCorrect ? 'bg-[var(--success-bg)] text-[var(--success-color)]' : 'bg-[var(--error-bg)] text-[var(--error-color)]'}`}>
                          {isCorrect ? '✓ Correct' : '✕ Incorrect'}
                        </span>
                      </div>
                      <div className="grid gap-2 pt-1">
                        {question.options.map((option) => {
                          const isSelected = option === selected
                          const isAnswer = option === correctAnswer
                          const optionStyles = isAnswer
                            ? 'border-[var(--success-color)] bg-[var(--success-bg)] text-[var(--text-primary)] font-semibold'
                            : isSelected
                              ? 'border-[var(--error-color)] bg-[var(--error-bg)] text-[var(--text-primary)]'
                              : 'border-[var(--border-main)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'

                          return (
                            <div key={option} className={`rounded-xl sm:rounded-[14px] border p-3 sm:p-3.5 text-xs sm:text-sm font-medium break-words leading-relaxed ${optionStyles}`}>
                              {option}
                            </div>
                          )
                        })}
                      </div>
                      <p className="small-text mt-2 text-xs sm:text-sm break-words">
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
