import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Icons matching the bottom-tab style shown in the design reference:
// simple two-tone outline icons that fill solid when active.
function HomeIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
    </svg>
  )
}

function CoursesIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
      <path d="M10.5 9.5 15 12l-4.5 2.5v-5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill={active ? 'currentColor' : 'none'} />
    </svg>
  )
}

function ChatIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H10l-4.2 3.2a.6.6 0 0 1-.96-.48V16H5.5A1.5 1.5 0 0 1 4 14.5v-9Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
    </svg>
  )
}

function MenuDotsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

const primaryLinks = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon, auth: true },
  { href: '/roadmap', label: 'Courses', icon: CoursesIcon, auth: true },
  { href: '/study-group', label: 'Chat', icon: ChatIcon, auth: true }
]

const menuLinks = [
  { href: '/', label: 'Home', auth: false },
  { href: '/dashboard', label: 'Dashboard', auth: true },
  { href: '/assessment', label: 'Assessment', auth: true },
  { href: '/roadmap', label: 'Roadmap', auth: true },
  { href: '/questions', label: 'Practice', auth: true },
  { href: '/progress', label: 'Progress', auth: true },
  { href: '/career', label: 'Career', auth: true },
  { href: '/study-group', label: 'Study Group', auth: true },
  { href: '/classroom', label: 'Classroom', auth: true },
  { href: '/teacher', label: 'Teacher', auth: true },
  { href: '/settings', label: 'Settings', auth: true }
]

function DesktopNavButton({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
      }`}
    >
      {children}
    </Link>
  )
}

export default function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  const handleLogout = () => {
    closeMenu()
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Top bar: compact brand strip on mobile, full nav on desktop */}
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:py-4">
          <Link to={user ? '/dashboard' : '/'} onClick={closeMenu} className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight text-ink-900">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-base font-bold text-white lg:h-11 lg:w-11">AI</span>
            <span className="hidden sm:inline">Catalyst</span>
          </Link>

          {/* Desktop nav: visible from lg breakpoint up */}
          <nav className="hidden flex-wrap items-center gap-1 lg:flex">
            {menuLinks.filter((l) => !l.auth || user).filter((l) => user || l.href !== '/dashboard').map((link) => (
              <DesktopNavButton key={link.href} to={link.href} active={location.pathname === link.href}>{link.label}</DesktopNavButton>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {user ? (
              <>
                <Link to="/settings" className="flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5 text-sm text-ink-700 transition hover:border-brand-400">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[10px] font-semibold text-white">
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  )}
                  {user.name}
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <DesktopNavButton to="/login" active={location.pathname === '/login'}>Login</DesktopNavButton>
                <Link to="/register" className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Right-side avatar + menu toggle on mobile, mirrors the reference design's header */}
          <div className="flex items-center gap-2 lg:hidden">
            {user ? (
              <Link to="/settings" aria-label="Settings">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full object-cover shadow-soft" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-semibold text-white">
                    {user.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                )}
              </Link>
            ) : (
              <Link to="/login" className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white">Login</Link>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-700 transition hover:border-brand-400 hover:text-brand-600"
            >
              <MenuDotsIcon />
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu (full link list + logout) */}
        {menuOpen && (
          <div className="border-t border-ink-200 bg-white px-4 pb-4 pt-3 lg:hidden">
            <nav className="grid grid-cols-2 gap-2">
              {menuLinks.filter((l) => !l.auth || user).map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={closeMenu}
                  className={`rounded-2xl px-3 py-2.5 text-center text-sm font-medium transition ${
                    location.pathname === link.href ? 'bg-brand-500 text-white' : 'bg-ink-50 text-ink-700 hover:bg-ink-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {user && (
              <button
                onClick={handleLogout}
                className="mt-3 w-full rounded-2xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-red-300 hover:text-red-600"
              >
                Logout
              </button>
            )}
          </div>
        )}
      </header>

      {/* Bottom tab bar: mobile-only, mirrors the reference design (Home / Courses / Chat / Menu) */}
      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-md items-center justify-around">
            {primaryLinks.map((link) => {
              const isActive = location.pathname === link.href
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-medium transition ${
                    isActive ? 'text-brand-600' : 'text-ink-400'
                  }`}
                >
                  <Icon active={isActive} />
                  {link.label}
                </Link>
              )
            })}
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-medium transition ${
                menuOpen ? 'text-brand-600' : 'text-ink-400'
              }`}
            >
              <MenuDotsIcon />
              Menu
            </button>
          </div>
        </nav>
      )}
    </>
  )
}
