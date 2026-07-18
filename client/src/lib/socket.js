import { io } from 'socket.io-client'

// VITE_API_URL points at the REST API, e.g. https://your-api.onrender.com/api
// Socket.IO connects to the server root, so strip a trailing /api if present.
const API_BASE = import.meta.env.VITE_API_URL || '/api'
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '') || window.location.origin

let socket = null

/**
 * Returns a singleton, authenticated Socket.IO connection. Creates it lazily
 * the first time it's needed, and reuses it across components/pages so we
 * don't open a new WebSocket per page.
 */
export function getSocket(token) {
  if (!token) return null

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true
    })
  } else if (socket.auth?.token !== token) {
    // Token changed (e.g. re-login as a different user) — reconnect with the new one.
    socket.auth = { token }
    socket.disconnect().connect()
  }

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
