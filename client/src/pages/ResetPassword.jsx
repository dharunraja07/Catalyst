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
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-4 sm:px-6">
      <div className="w-full max-w-[460px] saas-card bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Top Gradient Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--accent-color)] via-amber-400 to-[var(--accent-color)]" />

        <div className="space-y-1.5 text-center">
          <p className="page-label text-xs uppercase tracking-widest text-[var(--accent-color)] font-bold">Security Update</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Reset Password</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">Create a new strong password for your Catalyst account.</p>
        </div>

        <hr className="border-t border-[var(--border-main)] opacity-60" />

        {message && (
          <div className="rounded-xl bg-[var(--success-bg)] border border-[var(--success-color)]/30 p-4 text-xs text-[var(--success-color)] font-semibold leading-relaxed">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-[var(--error-bg)] border border-[var(--error-color)]/30 p-4 text-xs text-[var(--error-color)] font-medium leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5 font-semibold text-xs text-[var(--text-primary)]">
            <span>New Password</span>
            <input
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="saas-input w-full min-h-[46px] px-4 text-sm"
            />
          </label>

          {/* Realtime Password Rules Checklist */}
          {password.length > 0 && (
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-main)] p-4 space-y-2 text-xs">
              <p className="font-bold text-[var(--text-primary)] text-xs">Password requirements:</p>
              {passwordRequirements.map((req, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className={req.valid ? 'text-[var(--success-color)] font-bold' : 'text-[var(--text-muted)]'}>
                    {req.valid ? '✓' : '○'}
                  </span>
                  <span className={req.valid ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          <label className="block space-y-1.5 font-semibold text-xs text-[var(--text-primary)]">
            <span>Confirm Password</span>
            <input
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="saas-input w-full min-h-[46px] px-4 text-sm"
            />
          </label>

          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="text-xs text-[var(--error-color)] font-semibold">
              Passwords do not match.
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !isPasswordValid || password !== confirmPassword}
            className="saas-button-primary w-full min-h-[46px] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
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

        <div className="pt-3 border-t border-[var(--border-main)] text-center text-xs sm:text-sm text-[var(--text-secondary)]">
          Back to{' '}
          <Link to="/login" className="font-bold text-[var(--accent-color)] hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  )
}
