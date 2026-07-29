import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext.jsx'
import getSocket from '../api/socket.js'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user, api } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const groupJoinedListeners = useRef(new Set())

  // Register listener for group join events (used by StudyGroupPage to auto-refresh)
  const subscribeGroupJoined = useCallback((listener) => {
    groupJoinedListeners.current.add(listener)
    return () => groupJoinedListeners.current.delete(listener)
  }, [])

  const notifyGroupJoined = useCallback((group) => {
    groupJoinedListeners.current.forEach((listener) => {
      try {
        listener(group)
      } catch (err) {
        console.error('GroupJoined listener error:', err)
      }
    })
  }, [])

  // Fetch pending / stored notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      let res
      try {
        res = await api.get('/study-groups/notifications')
      } catch (e1) {
        if (e1.response?.status === 401) return
        try {
          res = await api.get('/study-groups/requests/incoming')
        } catch {
          return
        }
      }

      const list = res.data || []
      setNotifications(list)

      const unread = list.filter((item) => item.status === 'pending' && !item.isRead).length
      setUnreadCount(unread)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [user, api])

  // Initial fetch when user logs in
  useEffect(() => {
    if (user) {
      fetchNotifications()
    } else {
      setNotifications([])
      setUnreadCount(0)
    }
  }, [user, fetchNotifications])

  // Socket.IO lifecycle & event handling
  useEffect(() => {
    if (!user) return

    const socket = getSocket()
    if (!socket) return

    if (!socket.connected) {
      socket.connect()
    }

    const handleInviteReceived = (request) => {
      setNotifications((prev) => {
        const exists = prev.some((item) => item._id === request._id)
        if (exists) return prev
        return [request, ...prev]
      })
      setUnreadCount((prev) => prev + 1)
    }

    const handleCountUpdated = ({ unreadCount: count }) => {
      if (typeof count === 'number') {
        setUnreadCount(count)
      }
    }

    const handleInviteAccepted = (data) => {
      const { requestId, group } = data
      setNotifications((prev) =>
        prev.map((item) => (item._id === requestId ? { ...item, status: 'accepted', isRead: true } : item))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      if (group) {
        notifyGroupJoined(group)
      }
    }

    const handleInviteDeclined = (data) => {
      const { requestId } = data
      setNotifications((prev) =>
        prev.map((item) => (item._id === requestId ? { ...item, status: 'rejected', isRead: true } : item))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    socket.on('invite_received', handleInviteReceived)
    socket.on('notification_count_updated', handleCountUpdated)
    socket.on('invite_accepted', handleInviteAccepted)
    socket.on('invite_declined', handleInviteDeclined)

    return () => {
      socket.off('invite_received', handleInviteReceived)
      socket.off('notification_count_updated', handleCountUpdated)
      socket.off('invite_accepted', handleInviteAccepted)
      socket.off('invite_declined', handleInviteDeclined)
    }
  }, [user, notifyGroupJoined])

  // Accept Invite Handler
  const acceptInvite = async (requestId) => {
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('accept_invite', { requestId })
    }

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((item) => (item._id === requestId ? { ...item, status: 'accepted', isRead: true } : item))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    try {
      const res = await api.post(`/study-groups/requests/${requestId}/accept`)
      if (res.data) {
        notifyGroupJoined(res.data)
      }
    } catch (err) {
      console.warn('REST accept invite fallback error/handled:', err?.response?.data?.error || err.message)
    }
  }

  // Decline Invite Handler
  const declineInvite = async (requestId) => {
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('decline_invite', { requestId })
    }

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((item) => (item._id === requestId ? { ...item, status: 'rejected', isRead: true } : item))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    try {
      await api.post(`/study-groups/requests/${requestId}/reject`)
    } catch (err) {
      console.warn('REST decline invite fallback error/handled:', err?.response?.data?.error || err.message)
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
    setUnreadCount(0)

    try {
      await api.patch('/study-groups/notifications/read-all')
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }

  // Clear all notifications
  const clearAllNotifications = async () => {
    setNotifications((prev) => prev.filter((item) => item.status === 'pending'))

    try {
      await api.delete('/study-groups/notifications')
    } catch (err) {
      console.error('Failed to clear notifications:', err)
    }
  }

  // Send group invite helper
  const sendInvite = async ({ groupId, targetUserId }) => {
    const socket = getSocket()
    if (socket && socket.connected) {
      socket.emit('invite_sent', { groupId, targetUserId })
    }

    return await api.post(`/study-groups/groups/${groupId}/invite`, { userId: targetUserId })
  }

  const togglePanel = () => setIsPanelOpen((prev) => !prev)
  const closePanel = () => setIsPanelOpen(false)

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        isPanelOpen,
        togglePanel,
        closePanel,
        acceptInvite,
        declineInvite,
        markAllAsRead,
        clearAllNotifications,
        sendInvite,
        fetchNotifications,
        subscribeGroupJoined
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return ctx
}


