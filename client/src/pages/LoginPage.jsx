import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [message, setMessage] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await login({ email: form.email, password: form.password })
      const destination = location.state?.from || '/dashboard'
      navigate(destination)
    } catch (error) {
      setMessage(error.response?.data?.error || error.message || 'Login failed')
    }
  }

  const hasGoogleClientId = Boolean(
    import.meta.env.VITE_GOOGLE_CLIENT_ID &&
    !import.meta.env.VITE_GOOGLE_CLIENT_ID.includes('dummy')
  )

  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setMessage('Authenticating with Google...')
        await googleLogin(tokenResponse.access_token)
        const destination = location.state?.from || '/dashboard'
        navigate(destination)
      } catch (error) {
        setMessage(error.message || 'Google authentication failed.')
      }
    },
    onError: (errorResponse) => {
      console.error('Google Auth Error:', errorResponse)
      setMessage('Google authentication was cancelled or failed.')
    }
  })

  const handleGoogleClick = () => {
    if (!hasGoogleClientId) {
      setMessage('Google Sign-In is not configured. Please add VITE_GOOGLE_CLIENT_ID to your client/.env file.')
      return
    }
    triggerGoogleLogin()
  }

  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-4 sm:px-6">
      <div className="w-full max-w-[460px] saas-card bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Top Gradient Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--accent-color)] via-amber-400 to-[var(--accent-color)]" />

        <div className="space-y-1.5 text-center">
          <p className="page-label text-xs uppercase tracking-widest text-[var(--accent-color)] font-bold">Account Login</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Welcome back</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">Enter your credentials to access your Catalyst workspace.</p>
        </div>

        <hr className="border-t border-[var(--border-main)] opacity-60" />

        {resetSent && (
          <div className="rounded-xl bg-[var(--success-bg)] border border-[var(--success-color)]/30 p-3.5 text-xs text-[var(--success-color)] font-semibold">
            Reset link sent to <strong>{form.email}</strong>.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5 font-semibold text-xs text-[var(--text-primary)]">
            <span>Email Address</span>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="name@example.com"
              className="saas-input w-full min-h-[46px] px-4 text-sm"
            />
          </label>

          <label className="block space-y-1.5 font-semibold text-xs text-[var(--text-primary)]">
            <div className="flex items-center justify-between">
              <span>Password</span>
              <Link
                to="/forgot-password"
                className="text-xs font-bold text-[var(--accent-color)] hover:underline focus:outline-none"
              >
                Forgot Password?
              </Link>
            </div>
            <input
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="saas-input w-full min-h-[46px] px-4 text-sm"
            />
          </label>

          {message && (
            <p className="rounded-xl bg-[var(--error-bg)] border border-[var(--error-color)]/30 p-3 text-xs text-[var(--error-color)] font-medium">
              {message}
            </p>
          )}

          <button type="submit" className="saas-button-primary w-full min-h-[46px] text-sm font-bold shadow-md hover:shadow-lg transition-all">
            Sign in
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-main)]" />
          </div>
          <span className="relative bg-[var(--bg-surface)] px-3 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">
            Or continue with
          </span>
        </div>

        {/* Google Authentication Button */}
        <button
          type="button"
          onClick={handleGoogleClick}
          className="saas-button-secondary w-full flex items-center justify-center gap-3 font-semibold min-h-[46px] text-xs sm:text-sm shadow-sm hover:border-[var(--accent-color)] transition-all cursor-pointer"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Sign up prompt */}
        <div className="pt-3 border-t border-[var(--border-main)] text-center text-xs sm:text-sm text-[var(--text-secondary)]">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-[var(--accent-color)] hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </main>
  )
}
