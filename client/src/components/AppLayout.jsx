/**
 * App-Wide Z-Index Hierarchy:
 * - Mobile Drawer (MobileDrawer): z-[70]
 * - Modals (ProfileModal, dialogs): z-[60]
 * - Floating Elements (FloatingAIAssistant): z-[50]
 * - Sticky Top Bar (TopUtilityBar, NavBar): z-30
 * - Page Content / Workspace: z-0 to z-10
 */

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import SidebarNav from './SidebarNav.jsx'
import TopUtilityBar from './TopUtilityBar.jsx'
import MobileDrawer from './MobileDrawer.jsx'
import NavBar from './NavBar.jsx'
import ProfileModal from './ProfileModal.jsx'
import FloatingAIAssistant from './FloatingAIAssistant.jsx'

export default function AppLayout({ children }) {
  const { user } = useAuth()
  const { closePanel, fetchNotifications } = useNotifications()
  const location = useLocation()
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
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

  useEffect(() => {
    if (isMobileDrawerOpen || isProfileOpen) {
      document.body.classList.add('body-scroll-lock')
    } else {
      document.body.classList.remove('body-scroll-lock')
    }
    return () => {
      document.body.classList.remove('body-scroll-lock')
    }
  }, [isMobileDrawerOpen, isProfileOpen])

  // Automatically close notification panel & mobile drawer when navigating to a new page, and sync notifications
  useEffect(() => {
    closePanel()
    setIsMobileDrawerOpen(false)
    if (user) {
      fetchNotifications()
    }
  }, [location.pathname, user, closePanel, fetchNotifications])

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev)
  }

  // Logged Out Layout: Render top header without side navigation
  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200 pt-16 max-w-full overflow-x-hidden">
        <NavBar onOpenProfile={() => setIsProfileOpen(true)} />
        <main className="mx-auto w-full max-w-[1600px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-16 min-w-0 overflow-x-hidden">
          {children}
        </main>
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        <FloatingAIAssistant />
      </div>
    )
  }

  // Logged In Layout: Persistent AppShell (Fixed Sidebar + Top Utility Bar + Scrollable Main Workspace)
  return (
    <div className="h-screen w-full max-w-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] flex transition-colors duration-200">
      {/* Left Collapsible Sidebar (Fixed 100vh, hidden on Mobile <768px) */}
      <div className="hidden md:block shrink-0 h-full">
        <SidebarNav isCollapsed={isCollapsed} toggleCollapse={toggleCollapse} />
      </div>

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto custom-scrollbar">
        {/* Sticky Top Utility Bar */}
        <div className="sticky top-0 z-30 shrink-0">
          <TopUtilityBar
            onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
            isCollapsed={isCollapsed}
            toggleCollapse={toggleCollapse}
          />
        </div>

        {/* Main Content Workspace Area */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-12 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Off-canvas Mobile Drawer (<768px) */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <FloatingAIAssistant />
    </div>
  )
}
