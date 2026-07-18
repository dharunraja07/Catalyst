import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const MAX_FILE_BYTES = 4 * 1024 * 1024

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatDue(dueDate) {
  if (!dueDate) return 'No due date'
  const date = new Date(dueDate)
  const isPast = date < new Date()
  return `${isPast ? 'Was due' : 'Due'} ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function AttachmentLink({ attachment }) {
  if (!attachment?.dataUrl) return null
  return (
    <a
      href={attachment.dataUrl}
      download={attachment.fileName}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2 text-xs font-medium text-brand-600 hover:bg-ink-100"
    >
      📎 {attachment.fileName}
    </a>
  )
}

// --- Teacher view: post assignments, review submissions ---

function TeacherClassroom({ api }) {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', subject: '', description: '', dueDate: '' })
  const [attachment, setAttachment] = useState(null)
  const [openAssignmentId, setOpenAssignmentId] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [gradeDrafts, setGradeDrafts] = useState({})
  const fileInputRef = useRef(null)

  const loadAssignments = async () => {
    setLoading(true)
    try {
      const response = await api.get('/classroom/assignments')
      setAssignments(response.data)
    } catch (err) {
      setError('Unable to load your assignments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssignments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      setError('Attachment is too large — please keep it under 4MB.')
      return
    }
    const dataUrl = await readFileAsDataUrl(file)
    setAttachment({ fileName: file.name, fileType: file.type, dataUrl })
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('Please give the assignment a title.')
      return
    }
    setCreating(true)
    setError('')
    setStatus('')
    try {
      await api.post('/classroom/assignments', { ...form, attachment })
      setForm({ title: '', subject: '', description: '', dueDate: '' })
      setAttachment(null)
      setStatus('Assignment posted to your class.')
      await loadAssignments()
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to post this assignment')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (assignmentId) => {
    try {
      await api.delete(`/classroom/assignments/${assignmentId}`)
      setAssignments((prev) => prev.filter((a) => a._id !== assignmentId))
      if (openAssignmentId === assignmentId) setOpenAssignmentId(null)
    } catch (err) {
      setError('Unable to delete this assignment')
    }
  }

  const openSubmissions = async (assignmentId) => {
    if (openAssignmentId === assignmentId) {
      setOpenAssignmentId(null)
      return
    }
    setOpenAssignmentId(assignmentId)
    setSubmissionsLoading(true)
    try {
      const response = await api.get(`/classroom/assignments/${assignmentId}/submissions`)
      setSubmissions(response.data.submissions)
    } catch (err) {
      setError('Unable to load submissions')
    } finally {
      setSubmissionsLoading(false)
    }
  }

  const saveGrade = async (submissionId) => {
    const draft = gradeDrafts[submissionId] || {}
    try {
      const response = await api.patch(`/classroom/submissions/${submissionId}/grade`, {
        grade: draft.grade || '',
        feedback: draft.feedback || ''
      })
      setSubmissions((prev) => prev.map((s) => (s._id === submissionId ? response.data : s)))
      setStatus('Grade saved.')
    } catch (err) {
      setError('Unable to save grade')
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {status && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</p>}

      {/* Post assignment form */}
      <section className="rounded-[1.75rem] border border-ink-200 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-ink-900">Post a new assignment</h2>
        <form onSubmit={handleCreate} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none sm:col-span-2"
          />
          <input
            placeholder="Subject (e.g. Mathematics)"
            value={form.subject}
            onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
            className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none"
          />
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
            className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none"
          />
          <textarea
            placeholder="Instructions for students..."
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows="3"
            className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none sm:col-span-2"
          />
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 hover:border-brand-400"
            >
              {attachment ? `📎 ${attachment.fileName}` : '+ Attach a file (optional)'}
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            <button
              type="submit"
              disabled={creating}
              className="ml-auto rounded-2xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-70"
            >
              {creating ? 'Posting...' : 'Post assignment'}
            </button>
          </div>
        </form>
      </section>

      {/* Assignment list */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-ink-900">Your assignments</h2>
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-ink-100" />)}
          </div>
        ) : assignments.length ? (
          assignments.map((assignment) => (
            <div key={assignment._id} className="rounded-[1.5rem] border border-ink-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-brand-600">{assignment.subject}</p>
                  <h3 className="mt-1 text-lg font-semibold text-ink-900">{assignment.title}</h3>
                  <p className="mt-1 text-sm text-ink-500">{formatDue(assignment.dueDate)}</p>
                  {assignment.description && <p className="mt-2 text-sm text-ink-600">{assignment.description}</p>}
                  <AttachmentLink attachment={assignment.attachment} />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="rounded-full bg-ink-50 px-3 py-1 text-xs font-medium text-ink-600">
                    {assignment.submissionCount} submission{assignment.submissionCount === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={() => openSubmissions(assignment._id)}
                    className="text-xs font-semibold text-brand-600 hover:underline"
                  >
                    {openAssignmentId === assignment._id ? 'Hide submissions' : 'View submissions'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(assignment._id)}
                    className="text-xs font-medium text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {openAssignmentId === assignment._id && (
                <div className="mt-4 space-y-3 border-t border-ink-200 pt-4">
                  {submissionsLoading ? (
                    <div className="h-14 animate-pulse rounded-2xl bg-ink-100" />
                  ) : submissions.length ? (
                    submissions.map((submission) => (
                      <div key={submission._id} className="rounded-2xl bg-ink-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-ink-900">{submission.student?.name}</p>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${submission.status === 'graded' ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-500/10 text-brand-600'}`}>
                            {submission.status === 'graded' ? `Graded: ${submission.grade || '—'}` : 'Submitted'}
                          </span>
                        </div>
                        {submission.text && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{submission.text}</p>}
                        <AttachmentLink attachment={submission.attachment} />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <input
                            placeholder="Grade (e.g. A, 9/10)"
                            value={gradeDrafts[submission._id]?.grade ?? submission.grade ?? ''}
                            onChange={(e) => setGradeDrafts((prev) => ({ ...prev, [submission._id]: { ...prev[submission._id], grade: e.target.value } }))}
                            className="w-32 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 focus:border-brand-400 focus:outline-none"
                          />
                          <input
                            placeholder="Feedback"
                            value={gradeDrafts[submission._id]?.feedback ?? submission.feedback ?? ''}
                            onChange={(e) => setGradeDrafts((prev) => ({ ...prev, [submission._id]: { ...prev[submission._id], feedback: e.target.value } }))}
                            className="flex-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 focus:border-brand-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => saveGrade(submission._id)}
                            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-ink-500">No submissions yet.</p>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-ink-500">You haven't posted any assignments yet.</p>
        )}
      </section>
    </div>
  )
}

// --- Student view: browse and submit assignments ---

function StudentClassroom({ api }) {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [drafts, setDrafts] = useState({})
  const [submittingId, setSubmittingId] = useState(null)

  const loadAssignments = async () => {
    setLoading(true)
    try {
      const response = await api.get('/classroom/assignments')
      setAssignments(response.data)
    } catch (err) {
      setError('Unable to load assignments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssignments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFileChange = async (assignmentId, event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      setError('Attachment is too large — please keep it under 4MB.')
      return
    }
    const dataUrl = await readFileAsDataUrl(file)
    setDrafts((prev) => ({
      ...prev,
      [assignmentId]: { ...prev[assignmentId], attachment: { fileName: file.name, fileType: file.type, dataUrl } }
    }))
  }

  const handleSubmit = async (assignmentId) => {
    const draft = drafts[assignmentId] || {}
    setSubmittingId(assignmentId)
    setError('')
    setStatus('')
    try {
      const response = await api.post(`/classroom/assignments/${assignmentId}/submit`, {
        text: draft.text || '',
        attachment: draft.attachment
      })
      setAssignments((prev) => prev.map((a) => (a._id === assignmentId ? { ...a, mySubmission: response.data } : a)))
      setStatus('Submitted! Your teacher will review it soon.')
      setDrafts((prev) => ({ ...prev, [assignmentId]: {} }))
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to submit')
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {status && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</p>}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-ink-100" />)}
        </div>
      ) : assignments.length ? (
        assignments.map((assignment) => {
          const mySubmission = assignment.mySubmission
          const draft = drafts[assignment._id] || {}
          return (
            <div key={assignment._id} className="rounded-[1.5rem] border border-ink-200 bg-white p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
                {assignment.subject} · {assignment.teacher?.name}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-ink-900">{assignment.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{formatDue(assignment.dueDate)}</p>
              {assignment.description && <p className="mt-2 text-sm text-ink-600">{assignment.description}</p>}
              <AttachmentLink attachment={assignment.attachment} />

              <div className="mt-4 border-t border-ink-200 pt-4">
                {mySubmission ? (
                  <div className="rounded-2xl bg-ink-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${mySubmission.status === 'graded' ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-500/10 text-brand-600'}`}>
                        {mySubmission.status === 'graded' ? `Graded: ${mySubmission.grade || '—'}` : 'Submitted — awaiting review'}
                      </span>
                      <span className="text-xs text-ink-400">
                        Submitted {new Date(mySubmission.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {mySubmission.text && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{mySubmission.text}</p>}
                    <AttachmentLink attachment={mySubmission.attachment} />
                    {mySubmission.feedback && (
                      <p className="mt-2 rounded-xl bg-white p-3 text-sm text-ink-700">
                        <span className="font-semibold text-brand-600">Feedback: </span>{mySubmission.feedback}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      placeholder="Write your answer or notes..."
                      value={draft.text || ''}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [assignment._id]: { ...prev[assignment._id], text: e.target.value } }))}
                      rows="3"
                      className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="cursor-pointer rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 hover:border-brand-400">
                        {draft.attachment ? `📎 ${draft.attachment.fileName}` : '+ Attach a file (optional)'}
                        <input type="file" className="hidden" onChange={(e) => handleFileChange(assignment._id, e)} />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleSubmit(assignment._id)}
                        disabled={submittingId === assignment._id}
                        className="ml-auto rounded-2xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-70"
                      >
                        {submittingId === assignment._id ? 'Submitting...' : 'Submit'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })
      ) : (
        <p className="text-ink-500">No assignments have been posted yet.</p>
      )}
    </div>
  )
}

export default function ClassroomPage() {
  const { api, user } = useAuth()
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin'

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.24em] text-brand-600/80">Classroom</p>
        <h1 className="text-3xl font-semibold text-ink-900">
          {isTeacher ? 'Assignments you\u2019ve posted' : 'Your assignments'}
        </h1>
        <p className="mt-2 text-ink-500">
          {isTeacher ? 'Post assignments and review what students submit.' : 'View assignments from your teachers and submit your work.'}
        </p>
      </div>

      {isTeacher ? <TeacherClassroom api={api} /> : <StudentClassroom api={api} />}
    </main>
  )
}
