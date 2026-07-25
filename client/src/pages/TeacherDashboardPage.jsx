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
    <main className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <p className="page-label">Teacher Dashboard</p>
        <h1 className="page-title mb-2">Classroom Insights</h1>
        <p className="page-description">Monitor student progress, track subject interests, and review assessment results.</p>
      </div>

      <hr className="canvas-divider" />

      {error && (
        <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">
          {error}
        </p>
      )}

      {data ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Students Column */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="section-title">Students ({data.students.length})</h2>
            <div className="space-y-4">
              {data.students.map((student) => (
                <div
                  key={student._id}
                  className="rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-5 shadow-sm space-y-2 transition hover:border-[var(--accent-color)]"
                >
                  <p className="card-title text-base font-bold">{student.name}</p>
                  <p className="small-text text-[var(--text-muted)]">{student.email}</p>
                  <p className="caption-text pt-2 border-t border-[var(--border-main)] font-medium">
                    <span className="font-semibold text-[var(--text-primary)]">Subjects:</span> {student.interestedSubjects.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Assessments Column */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="section-title">Recent Assessments</h2>
            <div className="space-y-4">
              {data.assessments.map((assessment) => (
                <div
                  key={assessment._id}
                  className="rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-5 shadow-sm space-y-2 transition hover:border-[var(--accent-color)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="caption-text font-semibold">{new Date(assessment.createdAt).toLocaleDateString()}</span>
                    <span className="rounded-full bg-[var(--accent-light)] px-3 py-1 text-xs font-bold text-[var(--accent-color)]">
                      {assessment.score}% Score
                    </span>
                  </div>
                  <p className="small-text font-medium text-[var(--text-primary)]">
                    Classification: <span className="font-bold">{assessment.classification}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="body-text text-[var(--text-muted)] italic">Loading classroom data...</p>
      )}
    </main>
  )
}
