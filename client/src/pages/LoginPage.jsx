import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [message, setMessage] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await login({ email: form.email, password: form.password })
      navigate('/dashboard')
    } catch (error) {
      setMessage(error.response?.data?.error || error.message || 'Login failed')
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="overflow-hidden rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-8 shadow-glow sm:p-10">
        <div className="mb-8 space-y-3">
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent-color)]">Login</p>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Welcome back</h1>
          <p className="max-w-xl text-[var(--text-secondary)]">Enter your credentials to continue your personalized learning journey.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <label className="space-y-2 text-sm text-[var(--text-secondary)]">
            <span>Email</span>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none" />
          </label>
          <label className="space-y-2 text-sm text-[var(--text-secondary)]">
            <span>Password</span>
            <input name="password" type="password" value={form.password} onChange={handleChange} className="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none" />
          </label>
          {message && <p className="rounded-2xl bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{message}</p>}
          <button type="submit" className="rounded-2xl bg-[var(--accent-color)] px-6 py-3 text-sm font-semibold text-[var(--accent-contrast-text)] transition hover:bg-[var(--accent-hover)]">Sign in</button>
        </form>
      </div>
    </main>
  )
}
