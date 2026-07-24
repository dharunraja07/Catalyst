import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import SidebarNav from './SidebarNav.jsx'
import TopUtilityBar from './TopUtilityBar.jsx'
import MobileDrawer from './MobileDrawer.jsx'
import NavBar from './NavBar.jsx'

export default function AppLayout({ children }) {
  const { user } = useAuth()
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved !== null) {
      return saved === 'true'
    }
    return window.innerWidth >= 768 && window.innerWidth < 1024
  })

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed ? 'true' : 'false')
  }, [isCollapsed])

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev)
  }

  // Logged Out Layout: Render top header without side navigation
  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 pb-16">
          {children}
        </main>
      </div>
    )
  }

  // Logged In Layout: Render Collapsible Left Sidebar + Top Utility Bar
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex transition-colors duration-200">
      {/* Left Collapsible Sidebar (Hidden on Mobile <768px, visible on Tablet/Desktop >=768px) */}
      <div className="hidden md:block shrink-0">
        <SidebarNav isCollapsed={isCollapsed} toggleCollapse={toggleCollapse} />
      </div>

      {/* Main Workspace Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Utility Bar */}
        <TopUtilityBar
          onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
          isCollapsed={isCollapsed}
          toggleCollapse={toggleCollapse}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-16">
          {children}
        </main>
      </div>

      {/* Mobile Drawer (<768px) */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
      />
    </div>
  )
}
