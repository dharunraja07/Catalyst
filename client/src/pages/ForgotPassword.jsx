import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSent, setIsSent] = useState(false)

  const handleSendLink = async (isResend = false) => {
    if (!email) {
      setError('Please enter your email address.')
      return
    }

    if (isResend) {
      setResending(true)
    } else {
      setLoading(true)
    }
    setError('')
    setMessage('')

    try {
      const response = await axios.post(`${API_BASE}/auth/forgot-password`, {
        email: email.trim().toLowerCase()
      })
      const defaultMsg = isResend
        ? `Reset link resent to ${email.trim()} from Team Catalyst. Please check your inbox or spam folder.`
        : `A password reset link has been sent to ${email.trim()} from Team Catalyst. Please check your inbox or spam folder.`
      setMessage(response.data?.message ? `${response.data.message} Sent from Team Catalyst.` : defaultMsg)
      setIsSent(true)
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to send reset link. Please try again.')
    } finally {
      setLoading(false)
      setResending(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    handleSendLink(false)
  }

  const handleResend = (event) => {
    event.preventDefault()
    handleSendLink(true)
  }

  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-3 sm:px-6 py-6 sm:py-10 max-w-full overflow-x-hidden">
      <div className="w-full max-w-[440px] saas-card bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Top Gradient Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--accent-color)] via-amber-400 to-[var(--accent-color)]" />

        <div className="space-y-1.5 text-center">
          <p className="page-label text-xs uppercase tracking-widest text-[var(--accent-color)] font-bold">Password Recovery</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Forgot Password</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">Enter your registered email address to receive a secure reset link from Team Catalyst.</p>
        </div>

        <hr className="border-t border-[var(--border-main)] opacity-60" />

        {message && (
          <div className="rounded-xl bg-[var(--success-bg)] border border-[var(--success-color)]/30 p-4 text-xs text-[var(--success-color)] leading-relaxed font-semibold space-y-2 break-words overflow-hidden">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-[var(--success-color)] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div className="break-words">{message}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-[var(--error-bg)] border border-[var(--error-color)]/30 p-4 text-xs text-[var(--error-color)] leading-relaxed font-medium break-words overflow-hidden">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5 font-semibold text-xs text-[var(--text-primary)]">
            <span>Email Address</span>
            <input
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="saas-input w-full min-h-[46px] px-4 text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={loading || resending}
            className="saas-button-primary w-full min-h-[46px] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md hover:shadow-lg transition-all cursor-pointer"
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
              <span>{isSent ? 'Send Reset Link Again' : 'Send Reset Link'}</span>
            )}
          </button>
        </form>

        {isSent && (
          <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-main)] p-4 text-center space-y-2">
            <p className="text-xs text-[var(--text-secondary)]">Didn't receive the email from Team Catalyst?</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || loading}
              className="text-xs font-bold text-[var(--accent-color,#E6B325)] hover:underline inline-flex items-center gap-1.5 min-h-[44px] px-3 disabled:opacity-50 cursor-pointer"
            >
              {resending ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-[var(--accent-color,#E6B325)]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Resending Link from Team Catalyst...</span>
                </>
              ) : (
                <span>Resend Link</span>
              )}
            </button>
          </div>
        )}

        <div className="pt-3 border-t border-[var(--border-main)] text-center text-xs sm:text-sm text-[var(--text-secondary)]">
          Remember your password?{' '}
          <Link to="/login" className="font-bold text-[var(--accent-color)] hover:underline min-h-[44px] inline-flex items-center">
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  )
}

