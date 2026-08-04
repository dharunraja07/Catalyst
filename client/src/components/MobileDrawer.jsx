import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { navItems } from '../data/navItems.jsx'

export default function MobileDrawer({ isOpen, onClose, onOpenProfile }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleLogout = () => {
    onClose()
    logout()
    navigate('/login')
  }

  return (
    <div className="fixed inset-0 z-[70] flex">
      {/* Backdrop Overlay with Blur */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
      />

      {/* 280px Off-canvas Mobile Drawer */}
      <div className="relative z-50 w-[280px] max-w-[85vw] h-full bg-[var(--bg-surface)] border-r border-[var(--border-main)] rounded-r-[24px] p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] shadow-2xl flex flex-col justify-between overflow-y-auto transform transition-transform duration-300 ease-in-out animate-in slide-in-from-left">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--divider-main)] pb-4">
            <div className="flex items-center gap-3">
              <img
                src="/favicon.png"
                alt="Catalyst Logo"
                className="h-9 w-9 shrink-0 rounded-[12px] object-cover shadow-sm border border-[var(--accent-color)]/30"
              />
              <div>
                <h3 className="font-extrabold text-base text-[var(--text-primary)]">Catalyst</h3>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-semibold">
                  AI Powered Learning
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = location.pathname === item.href
              const itemClasses = `flex items-center gap-3.5 px-4 py-3 min-h-[44px] rounded-[14px] text-sm font-semibold transition-colors ${
                active
                  ? 'bg-[var(--accent-color)] text-black font-bold shadow-md'
                  : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`

              if (item.href === '/meet') {
                return (
                  <a
                    key={item.href}
                    href="/meet"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}
                    className={itemClasses}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </a>
                )
              }

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={itemClasses}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="space-y-3 pt-6 border-t border-[var(--divider-main)] mt-6">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenProfile?.()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-[14px] text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-secondary)] hover:opacity-90 transition cursor-pointer"
              >
                <svg className="h-5 w-5 shrink-0 text-[var(--accent-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-[14px] text-sm font-bold text-[var(--error-color)] bg-[var(--error-bg)] hover:opacity-90 transition cursor-pointer"
              >
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
                Logout
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Link
                to="/login"
                onClick={onClose}
                className="w-full py-3 min-h-[44px] flex items-center justify-center text-center text-sm font-medium rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="w-full py-3 min-h-[44px] flex items-center justify-center text-center text-sm font-bold rounded-[14px] bg-[var(--accent-color)] text-black"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
