import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

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

export default function TopUtilityBar({ onOpenMobileDrawer, toggleCollapse, isCollapsed }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
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

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border-main)] bg-[var(--bg-nav)]/95 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6">
        
        {/* Left Side: Mobile Drawer Trigger / Desktop Sidebar Collapse Trigger */}
        <div className="flex items-center gap-3">
          {/* Mobile Drawer Trigger (<768px) */}
          <button
            type="button"
            onClick={onOpenMobileDrawer}
            aria-label="Open Mobile Drawer"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--accent-color)] transition"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Brand Logo displayed when sidebar is collapsed or on mobile */}
          {(isCollapsed || window.innerWidth < 768) && (
            <Link to="/" className="flex items-center gap-3 font-bold tracking-tight text-lg">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--accent-color)] text-base font-extrabold text-black shadow-sm">
                AI
              </span>
              <div className="flex flex-col leading-tight">
                <span className="font-extrabold text-xl tracking-tight text-[var(--text-primary)]">Catalyst</span>
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-bold whitespace-nowrap">
                  AI POWERED LEARNING
                </span>
              </div>
            </Link>
          )}
        </div>

        {/* Center: Search Component */}
        <div className="flex-1 max-w-md mx-auto hidden sm:block">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search courses, topics, assessments..."
              className="w-full h-10 rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-input)] pl-10 pr-4 text-xs text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none transition shadow-sm"
            />
            <svg className="absolute left-3.5 top-2.5 h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Right Side Utilities: Notifications, Theme Toggle, Profile */}
        <div className="flex items-center gap-3">
          {/* Notification Bell Icon */}
          <button
            type="button"
            aria-label="Notifications"
            className="relative p-2.5 rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-color)] transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--accent-color)]" />
          </button>

          {/* Animated Theme Toggle */}
          <AnimatedThemeToggle isDark={isDark} onToggle={toggleTheme} />

          {/* Profile Dropdown Component */}
          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-1.5 sm:px-3 sm:py-1.5 hover:border-[var(--accent-color)] transition"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--accent-color)] to-[var(--accent-sage)] text-xs font-bold text-black shadow-sm">
                  {getInitials(user.name)}
                </span>
                <span className="hidden md:inline-block text-sm font-semibold text-[var(--text-primary)] truncate max-w-[120px]">
                  {user.name}
                </span>
                <svg className={`h-4 w-4 text-[var(--text-secondary)] transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-surface)] p-2 shadow-2xl z-50 divide-y divide-[var(--divider-main)]">
                  <div className="px-3 py-2.5">
                    <p className="text-xs text-[var(--text-muted)] font-medium">Signed in as</p>
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">{user.name}</p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">{user.email}</p>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <Link
                      to="/dashboard"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-[12px] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition"
                    >
                      <svg className="h-4 w-4 shrink-0 text-[var(--accent-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Profile</span>
                    </Link>
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
            <div className="flex items-center gap-2">
              <Link to="/login" className="inline-flex items-center justify-center min-h-[38px] rounded-[14px] px-3.5 py-1.5 text-xs font-medium text-[var(--text-primary)] border border-[var(--border-main)] bg-[var(--bg-secondary)] hover:border-[var(--accent-color)] transition">
                Login
              </Link>
              <Link to="/register" className="inline-flex items-center justify-center min-h-[38px] rounded-[14px] px-3.5 py-1.5 text-xs font-bold text-black bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] transition">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
