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
      <div className="saas-card shadow-glow sm:p-10">
        <div className="mb-8 space-y-2 border-b border-[var(--divider-main)] pb-6">
          <p className="caption-text uppercase tracking-[0.25em] text-[var(--accent-color)] font-semibold">Create your account</p>
          <h1 className="page-title">Join AI Learning</h1>
          <p className="body-text text-sm">Register to unlock diagnostics, personalized roadmaps, and career suggestions designed for your learning goals.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 small-text font-medium">
              <span>Full Name</span>
              <input name="name" value={form.name} onChange={handleChange} className="saas-input w-full" />
            </label>
            <label className="space-y-2 small-text font-medium">
              <span>Email address</span>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="saas-input w-full" />
            </label>
          </div>

          <label className="space-y-2 small-text font-medium">
            <span>Password</span>
            <input name="password" type="password" value={form.password} onChange={handleChange} className="saas-input w-full" />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 small-text font-medium">
              <span>Education Level</span>
              <input name="educationLevel" value={form.educationLevel} onChange={handleChange} className="saas-input w-full" placeholder="High School, College..." />
            </label>
            <label className="space-y-2 small-text font-medium">
              <span>Learning Style</span>
              <select name="learningStyle" value={form.learningStyle} onChange={handleChange} className="saas-input w-full">
                <option>Visual</option>
                <option>Reading</option>
                <option>Practice</option>
                <option>Mixed</option>
              </select>
            </label>
          </div>

          <label className="space-y-2 small-text font-medium">
            <span>Interested Subjects</span>
            <input name="interestedSubjects" value={form.interestedSubjects} onChange={handleChange} className="saas-input w-full" placeholder="Mathematics, Programming" />
          </label>
          <label className="space-y-2 small-text font-medium">
            <span>Career Interests</span>
            <input name="careerInterests" value={form.careerInterests} onChange={handleChange} className="saas-input w-full" placeholder="Technology, Analytics" />
          </label>

          {message && <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{message}</p>}

          <button type="submit" className="saas-button-primary mt-2">Create account</button>
        </form>
      </div>
    </main>
  )
}
