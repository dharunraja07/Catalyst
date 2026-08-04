import { Link, useLocation } from 'react-router-dom'
import { navItems } from '../data/navItems.jsx'

export default function SidebarNav({ isCollapsed, toggleCollapse }) {
  const location = useLocation()

  return (
    <aside
      className={`h-full z-30 flex flex-col justify-between border-r border-[var(--border-main)] bg-[var(--bg-surface)] p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] overflow-y-auto custom-scrollbar transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[80px]' : 'w-[280px]'
      }`}
    >
      {/* Sidebar Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2 py-1">
          <Link to="/" title="Catalyst AI Powered Learning" className="flex items-center gap-3 overflow-hidden min-h-[44px]">
            <img
              src="/favicon.png"
              alt="Catalyst Logo"
              className="h-10 w-10 shrink-0 rounded-[14px] object-cover shadow-sm border border-[var(--accent-color)]/30"
            />
            {!isCollapsed && (
              <div className="flex flex-col leading-tight transition-opacity duration-200">
                <span className="font-extrabold text-xl tracking-tight text-[var(--text-primary)]">Catalyst</span>
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-bold whitespace-nowrap">
                  AI POWERED LEARNING
                </span>
              </div>
            )}
          </Link>

          {/* Desktop/Tablet Sidebar Collapse Toggle */}
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden sm:inline-flex items-center justify-center p-1.5 min-h-[44px] min-w-[44px] rounded-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-main)] transition cursor-pointer"
          >
            <svg
              className={`h-5 w-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation Items List */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const active = location.pathname === item.href
            const itemClasses = `flex items-center gap-3.5 px-3.5 py-3 min-h-[44px] rounded-[14px] text-sm font-semibold transition-all duration-200 ${
              active
                ? 'bg-[var(--accent-color)] text-black shadow-md font-bold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
            } ${isCollapsed ? 'justify-center px-0' : ''}`

            if (item.href === '/meet') {
              return (
                <a
                  key={item.href}
                  href="/meet"
                  target="_blank"
                  rel="noopener noreferrer"
                  title={isCollapsed ? item.label : undefined}
                  className={itemClasses}
                >
                  {item.icon}
                  {!isCollapsed && (
                    <span className="truncate transition-opacity duration-200">{item.label}</span>
                  )}
                </a>
              )
            }

            return (
              <Link
                key={item.href}
                to={item.href}
                title={isCollapsed ? item.label : undefined}
                className={itemClasses}
              >
                {item.icon}
                {!isCollapsed && (
                  <span className="truncate transition-opacity duration-200">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
