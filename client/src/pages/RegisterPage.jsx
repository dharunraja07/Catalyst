import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', educationLevel: '', interestedSubjects: '', careerInterests: '', learningStyle: 'Mixed' })
  const [message, setMessage] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        educationLevel: form.educationLevel,
        interestedSubjects: form.interestedSubjects.split(',').map((item) => item.trim()),
        careerInterests: form.careerInterests.split(',').map((item) => item.trim()),
        learningStyle: form.learningStyle
      })
      navigate('/dashboard')
    } catch (error) {
      setMessage(error.response?.data?.error || error.message || 'Registration failed')
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="overflow-hidden rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-8 shadow-glow sm:p-10">
        <div className="mb-8 space-y-3">
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent-color)]">Create your account</p>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">Join AI Learning</h1>
          <p className="max-w-2xl text-[var(--text-secondary)]">Register to unlock diagnostics, personalized roadmaps, and career suggestions designed for your learning goals.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-[var(--text-secondary)]">
              <span>Name</span>
              <input name="name" value={form.name} onChange={handleChange} className="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none" />
            </label>
            <label className="space-y-2 text-sm text-[var(--text-secondary)]">
              <span>Email</span>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none" />
            </label>
          </div>

          <label className="space-y-2 text-sm text-[var(--text-secondary)]">
            <span>Password</span>
            <input name="password" type="password" value={form.password} onChange={handleChange} className="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none" />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-[var(--text-secondary)]">
              <span>Education Level</span>
              <input name="educationLevel" value={form.educationLevel} onChange={handleChange} className="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none" placeholder="High School, College..." />
            </label>
            <label className="space-y-2 text-sm text-[var(--text-secondary)]">
              <span>Learning Style</span>
              <select name="learningStyle" value={form.learningStyle} onChange={handleChange} className="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none">
                <option>Visual</option>
                <option>Reading</option>
                <option>Practice</option>
                <option>Mixed</option>
              </select>
            </label>
          </div>

          <label className="space-y-2 text-sm text-[var(--text-secondary)]">
            <span>Interested Subjects</span>
            <input name="interestedSubjects" value={form.interestedSubjects} onChange={handleChange} className="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none" placeholder="Mathematics, Programming" />
          </label>
          <label className="space-y-2 text-sm text-[var(--text-secondary)]">
            <span>Career Interests</span>
            <input name="careerInterests" value={form.careerInterests} onChange={handleChange} className="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none" placeholder="Technology, Analytics" />
          </label>

          {message && <p className="rounded-2xl bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{message}</p>}

          <button type="submit" className="rounded-2xl bg-[var(--accent-color)] px-6 py-3 text-sm font-semibold text-[var(--accent-contrast-text)] transition hover:bg-[var(--accent-hover)]">Create account</button>
        </form>
      </div>
    </main>
  )
}
