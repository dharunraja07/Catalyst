import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!email) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await axios.post(`${API_BASE}/auth/forgot-password`, {
        email: email.trim().toLowerCase()
      })
      setMessage(response.data?.message || 'If an account exists, a reset link has been sent.')
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to send reset link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:py-10">
      <div className="saas-card shadow-glow p-6 sm:p-8">
        <div className="mb-6 space-y-1.5 border-b border-[var(--divider-main)] pb-5 text-center sm:text-left">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">
            Password Recovery
          </p>
          <h1 className="page-title text-2xl font-bold">Forgot Password</h1>
          <p className="body-text text-xs text-[var(--text-secondary)]">
            Enter your registered email address to receive a secure password reset link.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-[14px] bg-[var(--success-bg)] border border-[var(--success-color)]/30 p-4 text-xs text-[var(--success-color)] leading-relaxed font-medium">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 p-4 text-xs text-[var(--error-color)] leading-relaxed font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="space-y-1.5 small-text font-medium text-xs">
            <span>Email address</span>
            <input
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="saas-input w-full min-h-[44px] px-3.5 py-2.5 text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="saas-button-primary mt-1 w-full min-h-[46px] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Sending Reset Link...</span>
              </>
            ) : (
              <span>Send Reset Link</span>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-[var(--divider-main)] pt-4 text-center text-xs text-[var(--text-secondary)]">
          Remember your password?{' '}
          <Link to="/login" className="font-bold text-[var(--accent-color)] hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  )
}
