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
    <main className="mx-auto max-w-[640px] px-4 py-8 sm:px-6 space-y-6">
      <div className="space-y-2">
        <p className="page-label">Create Account</p>
        <h1 className="page-title text-3xl font-bold">Join Catalyst</h1>
        <p className="page-description text-sm">Register to unlock diagnostics, personalized roadmaps, and AI career guidance.</p>
      </div>

      <hr className="canvas-divider my-4" />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-1.5 small-text font-semibold text-xs text-[var(--text-primary)]">
            <span>Full Name</span>
            <input name="name" value={form.name} onChange={handleChange} className="saas-input w-full min-h-[46px]" />
          </label>
          <label className="block space-y-1.5 small-text font-semibold text-xs text-[var(--text-primary)]">
            <span>Email Address</span>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="saas-input w-full min-h-[46px]" />
          </label>
        </div>

        <label className="block space-y-1.5 small-text font-semibold text-xs text-[var(--text-primary)]">
          <span>Password</span>
          <input name="password" type="password" value={form.password} onChange={handleChange} className="saas-input w-full min-h-[46px]" />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-1.5 small-text font-semibold text-xs text-[var(--text-primary)]">
            <span>Education Level</span>
            <input name="educationLevel" value={form.educationLevel} onChange={handleChange} className="saas-input w-full min-h-[46px]" placeholder="High School, College..." />
          </label>
          <label className="block space-y-1.5 small-text font-semibold text-xs text-[var(--text-primary)]">
            <span>Learning Style</span>
            <select name="learningStyle" value={form.learningStyle} onChange={handleChange} className="saas-input w-full min-h-[46px]">
              <option>Visual</option>
              <option>Reading</option>
              <option>Practice</option>
              <option>Mixed</option>
            </select>
          </label>
        </div>

        <label className="block space-y-1.5 small-text font-semibold text-xs text-[var(--text-primary)]">
          <span>Interested Subjects</span>
          <input name="interestedSubjects" value={form.interestedSubjects} onChange={handleChange} className="saas-input w-full min-h-[46px]" placeholder="Mathematics, Programming" />
        </label>
        <label className="block space-y-1.5 small-text font-semibold text-xs text-[var(--text-primary)]">
          <span>Career Interests</span>
          <input name="careerInterests" value={form.careerInterests} onChange={handleChange} className="saas-input w-full min-h-[46px]" placeholder="Technology, Analytics" />
        </label>

        {message && <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)] font-medium">{message}</p>}

        <button type="submit" className="saas-button-primary w-full min-h-[48px] font-bold text-base shadow-sm">
          Create Account
        </button>
      </form>

      <div className="pt-4 border-t border-[var(--border-main)] text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{' '}
        <a href="/login" className="font-bold text-[var(--accent-color)] hover:underline">
          Sign in
        </a>
      </div>
    </main>
  )
}
