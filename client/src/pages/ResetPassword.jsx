import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const passwordRequirements = [
    { label: 'At least 8 characters long', valid: password.length >= 8 },
    { label: 'One uppercase letter (A-Z)', valid: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a-z)', valid: /[a-z]/.test(password) },
    { label: 'One number (0-9)', valid: /\d/.test(password) },
    { label: 'One special character (!@#$%^&*)', valid: /[@$!%*?&#^()_\-+=~`[\]{}|:;"'<>,.?/]/.test(password) }
  ]

  const isPasswordValid = passwordRequirements.every((req) => req.valid)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!token) {
      setError('Invalid or missing password reset token.')
      return
    }

    if (!isPasswordValid) {
      setError('Password does not meet the security requirements.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post(`${API_BASE}/auth/reset-password`, {
        token,
        password
      })

      setMessage(response.data?.message || 'Password updated successfully. Redirecting to Login...')

      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Password reset failed. Token may be invalid or expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:py-10">
      <div className="saas-card shadow-glow p-6 sm:p-8">
        <div className="mb-6 space-y-1.5 border-b border-[var(--divider-main)] pb-5 text-center sm:text-left">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">
            Security Update
          </p>
          <h1 className="page-title text-2xl font-bold">Reset Password</h1>
          <p className="body-text text-xs text-[var(--text-secondary)]">
            Create a new strong password for your Catalyst account.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-[14px] bg-[var(--success-bg)] border border-[var(--success-color)]/30 p-4 text-xs text-[var(--success-color)] font-semibold leading-relaxed">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 p-4 text-xs text-[var(--error-color)] font-medium leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="space-y-1.5 small-text font-medium text-xs">
            <span>New Password</span>
            <input
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="saas-input w-full min-h-[44px] px-3.5 py-2.5 text-sm"
            />
          </label>

          {/* Realtime Password Rules Checklist */}
          {password.length > 0 && (
            <div className="rounded-[12px] bg-[var(--bg-secondary)] border border-[var(--border-main)] p-3 space-y-1.5 text-xs">
              <p className="font-semibold text-[var(--text-primary)] text-[11px]">Password requirements:</p>
              {passwordRequirements.map((req, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className={req.valid ? 'text-[var(--success-color)]' : 'text-[var(--text-muted)]'}>
                    {req.valid ? '✓' : '○'}
                  </span>
                  <span className={req.valid ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          <label className="space-y-1.5 small-text font-medium text-xs">
            <span>Confirm Password</span>
            <input
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="saas-input w-full min-h-[44px] px-3.5 py-2.5 text-sm"
            />
          </label>

          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="text-[11px] text-[var(--error-color)] font-medium">
              Passwords do not match.
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !isPasswordValid || password !== confirmPassword}
            className="saas-button-primary mt-2 w-full min-h-[46px] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Update Password</span>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-[var(--divider-main)] pt-4 text-center text-xs text-[var(--text-secondary)]">
          Back to{' '}
          <Link to="/login" className="font-bold text-[var(--accent-color)] hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  )
}
