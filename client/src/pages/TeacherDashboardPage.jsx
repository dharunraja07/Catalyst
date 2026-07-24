import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export default function TeacherDashboardPage() {
  const { api } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadTeacherData() {
      try {
        const response = await api.get('/teacher')
        setData(response.data)
      } catch (err) {
        setError('Unable to load teacher dashboard')
      }
    }
    loadTeacherData()
  }, [api])

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-8 shadow-glow">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--accent-color)]">Teacher dashboard</p>
            <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Classroom insights</h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Monitor student progress and review assessment results.</p>
        </div>

        {error && <p className="mb-6 rounded-2xl bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{error}</p>}

        {data ? (
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-[1.75rem] border border-[var(--border-main)] bg-[var(--bg-elevated)] p-6">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Students</h2>
              <div className="mt-5 space-y-4">
                {data.students.map((student) => (
                  <div key={student._id} className="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4">
                    <p className="font-semibold text-[var(--text-primary)]">{student.name}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{student.email}</p>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">Subjects: {student.interestedSubjects.join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-[var(--border-main)] bg-[var(--bg-elevated)] p-6">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Recent assessments</h2>
              <div className="mt-5 space-y-4">
                {data.assessments.map((assessment) => (
                  <div key={assessment._id} className="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4">
                    <p className="text-sm text-[var(--text-muted)]">{new Date(assessment.createdAt).toLocaleDateString()}</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Score: {assessment.score}%</p>
                    <p className="text-sm text-[var(--text-secondary)]">Classification: {assessment.classification}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[var(--text-muted)]">Loading teacher data...</p>
        )}
      </div>
    </main>
  )
}
