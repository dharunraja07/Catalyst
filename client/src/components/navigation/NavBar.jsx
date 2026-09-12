import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { navItems } from '../../data/navItems.jsx'
import { AvatarVisual } from '../common/ProfileModal.jsx'
import NotificationBell from './NotificationBell.jsx'

function ThemeIconButton({ isDark, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className="flex h-10 w-10 min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] items-center justify-center rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--accent-color)] hover:bg-[var(--bg-surface)] active:scale-95 transition-all duration-200 cursor-pointer shadow-sm"
    >
      {isDark ? (
        <svg
          className="h-5 w-5 text-[var(--text-primary)] transition-transform duration-200 hover:rotate-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ) : (
        <svg
          className="h-5 w-5 text-[var(--text-primary)] transition-transform duration-200 hover:rotate-45"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )}
    </button>
  )
}

export default function NavBar({ onOpenProfile, onOpenMobileDrawer }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileRef = useRef(null)

  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDark(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDark(true)
    }
  }

  const handleLogout = () => {
    setProfileDropdownOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-30 border-b border-[var(--border-main)] bg-[var(--bg-nav)]/80 backdrop-blur-md shadow-sm transition-colors duration-200 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-[var(--text-primary)]">
        
        {/* Left: Brand Logo & Mobile Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          {user && (
            <button
              type="button"
              onClick={onOpenMobileDrawer}
              className="lg:hidden inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--accent-color)] transition cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <Link to="/" className="flex items-center gap-3 font-bold tracking-tight text-lg min-h-[44px]">
            <img
              src="/favicon.png"
              alt="Catalyst Logo"
              className="h-10 w-10 shrink-0 rounded-[14px] object-cover shadow-sm border border-[var(--accent-color)]/30"
            />
            <div className="flex flex-col leading-tight">
              <span className="font-extrabold text-xl tracking-tight text-[var(--text-primary)]">Catalyst</span>
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-bold whitespace-nowrap">
                AI POWERED LEARNING
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Navigation Links Pill Container — Shown ONLY AFTER Login */}
        {user && (
          <nav className="hidden lg:flex items-center gap-1 rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)]/70 backdrop-blur-md p-1.5 shadow-sm overflow-x-auto custom-scrollbar">
            {navItems.map((item) => {
              const active = location.pathname === item.href
              const itemClasses = `inline-flex items-center gap-2 px-3.5 py-1.5 min-h-[36px] rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                active
                  ? 'bg-[var(--accent-color)] text-white font-semibold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`

              if (item.href === '/meet') {
                return (
                  <a
                    key={item.href}
                    href="/meet"
                    target="_blank"
                    rel="noopener noreferrer"
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
                  className={itemClasses}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        )}

        {/* Right Section: Theme Icon Button & Profile Component (or Login button when logged out) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user && <NotificationBell />}

          {/* Theme Icon Button (Replacing Toggle) */}
          <div className="hidden sm:block">
            <ThemeIconButton isDark={isDark} onToggle={toggleTheme} />
          </div>

          {/* Profile Dropdown Component when Logged In */}
          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-1.5 sm:px-3 sm:py-1.5 hover:border-[var(--accent-color)] transition min-h-[44px] min-w-[44px] justify-center cursor-pointer"
              >
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--bg-secondary)] text-xs font-bold shadow-sm">
                  <AvatarVisual avatar={user.avatar} name={user.name} className="text-xs" />
                </span>
                <span className="hidden md:inline-block text-sm font-semibold text-[var(--text-primary)] truncate max-w-[120px]">
                  {user.name}
                </span>
                <svg className={`h-4 w-4 text-[var(--text-secondary)] transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Profile Popup Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-surface)] p-2 shadow-2xl z-[60] divide-y divide-[var(--divider-main)]">
                  <div className="px-3 py-2.5">
                    <p className="text-xs text-[var(--text-muted)] font-medium">Signed in as</p>
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">{user.name}</p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">{user.email}</p>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false)
                        onOpenProfile?.()
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 min-h-[44px] text-sm font-medium rounded-[12px] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition cursor-pointer"
                    >
                      <svg className="h-4 w-4 shrink-0 text-[var(--accent-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Profile</span>
                    </button>

                    {/* Mobile Theme option inside Profile dropdown */}
                    <div className="flex sm:hidden items-center justify-between px-3 py-2 text-sm font-medium text-[var(--text-primary)] min-h-[44px]">
                      <span className="flex items-center gap-2">
                        <span>Theme</span>
                      </span>
                      <ThemeIconButton isDark={isDark} onToggle={toggleTheme} />
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 min-h-[44px] text-sm font-medium rounded-[12px] text-[var(--error-color)] hover:bg-[var(--error-bg)] transition cursor-pointer"
                    >
                      <svg className="h-4 w-4 shrink-0 text-[var(--error-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ThemeIconButton isDark={isDark} onToggle={toggleTheme} />
              <Link to="/login" className="inline-flex items-center justify-center min-h-[44px] rounded-[14px] px-5 py-2 text-sm font-semibold text-white bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] transition shadow-sm">
                Login
              </Link>
            </div>
          )}

        </div>
      </div>
    </header>
  )
}


