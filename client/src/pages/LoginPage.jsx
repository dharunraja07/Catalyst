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
      <div className="overflow-hidden rounded-[2rem] border border-ink-200 bg-ink-50 p-8 shadow-glow sm:p-10">
        <div className="mb-8 space-y-3">
          <p className="text-sm uppercase tracking-[0.25em] text-brand-600/80">Login</p>
          <h1 className="text-3xl font-semibold text-ink-900">Welcome back</h1>
          <p className="max-w-xl text-ink-500">Enter your credentials to continue your personalized learning journey.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <label className="space-y-2 text-sm text-ink-600">
            <span>Email</span>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none" />
          </label>
          <label className="space-y-2 text-sm text-ink-600">
            <span>Password</span>
            <input name="password" type="password" value={form.password} onChange={handleChange} className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none" />
          </label>
          {message && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}
          <button type="submit" className="rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600">Sign in</button>
        </form>
      </div>
    </main>
  )
}
