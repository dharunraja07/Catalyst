import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', educationLevel: '', interestedSubjects: '', careerInterests: '', learningStyle: 'Mixed' })
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

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
      const destination = location.state?.from || '/dashboard'
      navigate(destination)
    } catch (error) {
      setMessage(error.response?.data?.error || error.message || 'Registration failed')
    }
  }

  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-3 sm:px-6 py-6 sm:py-10 max-w-full overflow-x-hidden">
      <div className="w-full max-w-[600px] saas-card bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Top Gradient Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--accent-color)] via-[var(--accent-hover)] to-[var(--accent-color)]" />

        <div className="space-y-1.5 text-center">
          <p className="page-label text-xs uppercase tracking-widest text-[var(--accent-color)] font-bold">Create Account</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Join Catalyst</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">Register to unlock diagnostics, personalized roadmaps, and AI career guidance.</p>
        </div>

        <hr className="border-t border-[var(--border-main)] opacity-60" />

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 font-semibold text-xs text-[var(--text-primary)]">
              <span>Full Name</span>
              <input name="name" required value={form.name} onChange={handleChange} placeholder="John Doe" className="saas-input w-full min-h-[46px] px-4 text-sm" />
            </label>
            <label className="block space-y-1.5 font-semibold text-xs text-[var(--text-primary)]">
              <span>Email Address</span>
              <input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="name@example.com" className="saas-input w-full min-h-[46px] px-4 text-sm" />
            </label>
          </div>

          <label className="block space-y-1.5 font-semibold text-xs text-[var(--text-primary)]">
            <span>Password</span>
            <div className="relative w-full">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="saas-input w-full min-h-[46px] pl-4 pr-12 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer text-sm"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 font-semibold text-xs text-[var(--text-primary)]">
              <span>Education Level</span>
              <input name="educationLevel" value={form.educationLevel} onChange={handleChange} className="saas-input w-full min-h-[46px] px-4 text-sm" placeholder="High School, College..." />
            </label>
            <label className="block space-y-1.5 font-semibold text-xs text-[var(--text-primary)]">
              <span>Learning Style</span>
              <select name="learningStyle" value={form.learningStyle} onChange={handleChange} className="saas-input w-full min-h-[46px] px-4 text-sm">
                <option>Visual</option>
                <option>Reading</option>
                <option>Practice</option>
                <option>Mixed</option>
              </select>
            </label>
          </div>

          <label className="block space-y-1.5 font-semibold text-xs text-[var(--text-primary)]">
            <span>Interested Subjects</span>
            <input name="interestedSubjects" value={form.interestedSubjects} onChange={handleChange} className="saas-input w-full min-h-[46px] px-4 text-sm" placeholder="Mathematics, Programming" />
          </label>
          <label className="block space-y-1.5 font-semibold text-xs text-[var(--text-primary)]">
            <span>Career Interests</span>
            <input name="careerInterests" value={form.careerInterests} onChange={handleChange} className="saas-input w-full min-h-[46px] px-4 text-sm" placeholder="Technology, Analytics" />
          </label>

          {message && <p className="rounded-xl bg-[var(--error-bg)] border border-[var(--error-color)]/30 p-3 text-xs text-[var(--error-color)] font-medium break-words leading-relaxed">{message}</p>}

          <button type="submit" className="saas-button-primary w-full min-h-[46px] font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer">
            Create Account
          </button>
        </form>

        <div className="pt-3 border-t border-[var(--border-main)] text-center text-xs sm:text-sm text-[var(--text-secondary)]">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-[var(--accent-color)] hover:underline min-h-[44px] inline-flex items-center">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  )
}
