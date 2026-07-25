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
    <main className="mx-auto max-w-[480px] px-4 py-8 sm:px-6 space-y-6">
      <div className="space-y-2">
        <p className="page-label">Password Recovery</p>
        <h1 className="page-title text-3xl font-bold">Forgot Password</h1>
        <p className="page-description text-sm">Enter your registered email address to receive a secure password reset link.</p>
      </div>

      <hr className="canvas-divider my-4" />

      {message && (
        <div className="rounded-[14px] bg-[var(--success-bg)] border border-[var(--success-color)]/30 p-4 text-xs text-[var(--success-color)] leading-relaxed font-semibold">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 p-4 text-xs text-[var(--error-color)] leading-relaxed font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5 small-text font-semibold text-xs text-[var(--text-primary)]">
          <span>Email Address</span>
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="saas-input w-full min-h-[46px] px-4 text-base"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="saas-button-primary w-full min-h-[48px] text-base font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
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

      <div className="pt-4 border-t border-[var(--border-main)] text-center text-sm text-[var(--text-secondary)]">
        Remember your password?{' '}
        <Link to="/login" className="font-bold text-[var(--accent-color)] hover:underline">
          Back to Login
        </Link>
      </div>
    </main>
  )
}
