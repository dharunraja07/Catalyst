import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard', auth: true },
  { href: '/assessment', label: 'Assessment', auth: true },
  { href: '/roadmap', label: 'Roadmap', auth: true },
  { href: '/questions', label: 'Practice', auth: true },
  { href: '/progress', label: 'Progress', auth: true },
  { href: '/career', label: 'Career', auth: true },
  { href: '/study-group', label: 'Study Group', auth: true }
]

function NavButton({ to, active, children, onClick, className = '' }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-[var(--accent-color)] text-[var(--accent-contrast-text)] shadow-sm'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
      } ${className}`}
    >
      {children}
    </Link>
  )
}

function MenuIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <>
          <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)]"
    >
      {isDark ? (
        <svg className="h-5 w-5 text-[var(--accent-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="h-5 w-5 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  )
}

export default function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
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

  const closeMenu = () => setMenuOpen(false)

  const handleLogout = () => {
    closeMenu()
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-main)] bg-[var(--bg-nav)] shadow-sm backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 text-[var(--text-primary)] sm:px-6">
        <Link to="/" onClick={closeMenu} className="flex items-center gap-3 text-lg font-semibold tracking-tight text-[var(--text-primary)]">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-color)] text-lg font-bold text-[var(--accent-contrast-text)]">AI</span>
          <span>AI Learning</span>
        </Link>

        {/* Desktop nav: visible from md breakpoint up */}
        <nav className="hidden flex-wrap items-center gap-2 md:flex">
          {navLinks.map((link) => {
            if (link.auth && !user) return null
            return <NavButton key={link.href} to={link.href} active={location.pathname === link.href}>{link.label}</NavButton>
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          {user ? (
            <>
              <span className="hidden rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-secondary)] lg:inline-flex">{user.name}</span>
              <button
                onClick={handleLogout}
                className="rounded-full bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast-text)] transition hover:opacity-90"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <NavButton to="/login" active={location.pathname === '/login'}>Login</NavButton>
              <NavButton to="/register" active={location.pathname === '/register'}>Register</NavButton>
            </div>
          )}
        </div>

        {/* Mobile controls: Theme toggle + hamburger menu */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition hover:border-[var(--accent-color)]"
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="border-t border-[var(--border-main)] bg-[var(--bg-nav)] px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => {
              if (link.auth && !user) return null
              return (
                <NavButton
                  key={link.href}
                  to={link.href}
                  active={location.pathname === link.href}
                  onClick={closeMenu}
                  className="w-full text-left"
                >
                  {link.label}
                </NavButton>
              )
            })}
          </nav>

          <div className="mt-3 border-t border-[var(--divider-main)] pt-3">
            {user ? (
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-secondary)]">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="rounded-full bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast-text)] transition hover:opacity-90"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <NavButton to="/login" active={location.pathname === '/login'} onClick={closeMenu} className="w-full text-left">Login</NavButton>
                <NavButton to="/register" active={location.pathname === '/register'} onClick={closeMenu} className="w-full text-left">Register</NavButton>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
