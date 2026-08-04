import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { AvatarVisual } from './ProfileModal.jsx'
import NotificationBell from './NotificationBell.jsx'

const authNavLinks = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/dashboard', label: 'Dashboard', icon: '📌' },
  { href: '/assessment', label: 'Assessment', icon: '📝' },
  { href: '/roadmap', label: 'Roadmap', icon: '🗺' },
  { href: '/questions', label: 'Practice', icon: '🎯' },
  { href: '/progress', label: 'Progress', icon: '📈' },
  { href: '/career', label: 'Career', icon: '💼' },
  { href: '/study-group', label: 'Study Group', icon: '👥' },
  { href: '/meet', label: 'Meet', icon: '📹' }
]

function AnimatedThemeToggle({ isDark, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className="relative flex h-9 w-16 items-center rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] px-1 transition-colors duration-300 focus:outline-none"
    >
      <span className="flex w-full items-center justify-between text-xs font-bold px-1 select-none">
        <span className={isDark ? 'text-[var(--text-muted)]' : 'text-amber-500'}>☀</span>
        <span className={isDark ? 'text-amber-300' : 'text-[var(--text-muted)]'}>🌙</span>
      </span>
      <span
        className={`absolute h-7 w-7 rounded-full bg-[var(--accent-color)] shadow-md transition-transform duration-300 ease-in-out flex items-center justify-center text-xs font-bold text-black ${
          isDark ? 'translate-x-7' : 'translate-x-0'
        }`}
      >
        {isDark ? '🌙' : '☀'}
      </span>
    </button>
  )
}

export default function NavBar({ onOpenProfile }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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

  const closeMobileMenu = () => setMobileMenuOpen(false)

  const handleLogout = () => {
    closeMobileMenu()
    setProfileDropdownOpen(false)
    logout()
    navigate('/login')
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-nav)]/80 backdrop-blur-md shadow-sm transition-colors duration-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 text-[var(--text-primary)] sm:px-6">
          
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            {user && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--accent-color)] transition"
                aria-label="Open Navigation Menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-3 font-bold tracking-tight text-lg">
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

          {/* Desktop Navigation Links — Shown ONLY AFTER Login */}
          {user && (
            <nav className="hidden lg:flex items-center gap-1">
              {authNavLinks.map((link) => {
                const active = location.pathname === link.href
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`inline-flex items-center px-3.5 py-2 rounded-[14px] text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'bg-[var(--accent-color)] text-black font-semibold shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          )}

          {/* Right Section: Theme Toggle & Profile Component (or Login button when logged out) */}
          <div className="flex items-center gap-3">
            {user && <NotificationBell />}

            {/* Animated Theme Toggle */}
            <AnimatedThemeToggle isDark={isDark} onToggle={toggleTheme} />

            {/* Profile Dropdown Component when Logged In */}
            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-1.5 sm:px-3 sm:py-1.5 hover:border-[var(--accent-color)] transition"
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

                {/* Profile Popup Dropdown */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-surface)] p-2 shadow-2xl z-50 divide-y divide-[var(--divider-main)]">
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
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-[12px] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition"
                      >
                        <svg className="h-4 w-4 shrink-0 text-[var(--accent-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Profile</span>
                      </button>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-[12px] text-[var(--error-color)] hover:bg-[var(--error-bg)] transition"
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
              <Link to="/login" className="inline-flex items-center justify-center min-h-[40px] rounded-[14px] px-5 py-2 text-sm font-semibold text-black bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] transition">
                Login
              </Link>
            )}

          </div>
        </div>
      </header>

      {/* Mobile Drawer (Shown on mobile when menu toggle clicked) */}
      {user && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div onClick={closeMobileMenu} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-50 w-[300px] max-w-[85vw] h-full bg-[var(--bg-surface)] border-r border-[var(--border-main)] rounded-r-[24px] p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--divider-main)] pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/favicon.png"
                    alt="Catalyst Logo"
                    className="h-9 w-9 shrink-0 rounded-[12px] object-cover shadow-sm border border-[var(--accent-color)]/30"
                  />
                  <div>
                    <h3 className="font-extrabold text-base text-[var(--text-primary)]">Catalyst</h3>
                    <p className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-semibold">AI Learning</p>
                  </div>
                </div>
                <button type="button" onClick={closeMobileMenu} className="p-2 rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">✕</button>
              </div>

              <nav className="space-y-1.5">
                {authNavLinks.map((link) => {
                  const active = location.pathname === link.href
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3.5 px-4 py-3 rounded-[14px] text-sm font-semibold transition-colors ${
                        active ? 'bg-[var(--accent-color)] text-black font-bold shadow-md' : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <span className="text-base">{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>

            <div className="space-y-3 pt-6 border-t border-[var(--divider-main)] mt-6">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-[14px] text-sm font-bold text-[var(--error-color)] bg-[var(--error-bg)]"
              >
                <span>🚪</span> Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
