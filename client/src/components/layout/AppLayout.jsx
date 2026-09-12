/**
 * App-Wide Z-Index Hierarchy:
 * - Mobile Drawer (MobileDrawer): z-[70]
 * - Modals (ProfileModal, dialogs): z-[60]
 * - Floating Elements (FloatingAIAssistant): z-[50]
 * - Fixed Top Bar (NavBar): z-30
 * - Page Content / Workspace: z-0 to z-10
 */

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useNotifications } from '../../context/NotificationContext.jsx'
import MobileDrawer from './MobileDrawer.jsx'
import NavBar from '../navigation/NavBar.jsx'
import ProfileModal from '../common/ProfileModal.jsx'
import FloatingAIAssistant from '../../features/ai-mentor/components/FloatingAIAssistant.jsx'

export default function AppLayout({ children }) {
  const { user } = useAuth()
  const { closePanel, fetchNotifications } = useNotifications()
  const location = useLocation()
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  // Automatically close notification panel & mobile drawer when navigating to a new page, and sync notifications
  useEffect(() => {
    closePanel()
    setIsMobileDrawerOpen(false)
    if (user) {
      fetchNotifications()
    }
  }, [location.pathname, user, closePanel, fetchNotifications])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200 pt-16 sm:pt-20 max-w-full overflow-x-hidden">
      {/* Top Header Navigation Bar */}
      <NavBar
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
      />

      {/* Main Page Workspace Area */}
      <main className="mx-auto w-full max-w-[1600px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-16 min-w-0 overflow-x-hidden">
        {children}
      </main>

      {/* Off-canvas Mobile Drawer */}
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

