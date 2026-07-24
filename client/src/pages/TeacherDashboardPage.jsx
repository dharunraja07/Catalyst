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
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="saas-card shadow-glow">
        <div className="mb-8 border-b border-[var(--divider-main)] pb-6 space-y-2">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">Teacher dashboard</p>
          <h1 className="page-title">Classroom insights</h1>
          <p className="body-text">Monitor student progress and review assessment results.</p>
        </div>

        {error && <p className="mb-6 rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{error}</p>}

        {data ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 saas-elevated-card">
              <h2 className="section-title mb-4">Students</h2>
              <div className="space-y-4">
                {data.students.map((student) => (
                  <div key={student._id} className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4">
                    <p className="card-title font-semibold">{student.name}</p>
                    <p className="small-text mt-0.5">{student.email}</p>
                    <p className="caption-text mt-2">Subjects: {student.interestedSubjects.join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-5 saas-elevated-card">
              <h2 className="section-title mb-4">Recent assessments</h2>
              <div className="space-y-4">
                {data.assessments.map((assessment) => (
                  <div key={assessment._id} className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4">
                    <p className="caption-text">{new Date(assessment.createdAt).toLocaleDateString()}</p>
                    <p className="card-title font-bold mt-1 text-[var(--accent-color)]">Score: {assessment.score}%</p>
                    <p className="small-text mt-0.5">Classification: {assessment.classification}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="body-text text-sm text-[var(--text-muted)]">Loading teacher data...</p>
        )}
      </div>
    </main>
  )
}
