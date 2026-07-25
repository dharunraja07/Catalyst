import { io } from 'socket.io-client'

let socket = null

export function getSocketUrl() {
  const apiUrl = import.meta.env.VITE_API_URL
  if (apiUrl) {
    return apiUrl.replace(/\/api\/?$/, '')
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
    const hostname = window.location.hostname || 'localhost'
    return `${protocol}//${hostname}:4000`
  }
  return 'http://localhost:4000'
}

export function getSocket() {
  const token = localStorage.getItem('ai_learning_token')

  if (!socket) {
    const socketUrl = getSocketUrl()
    socket = io(socketUrl, {
      auth: { token },
      autoConnect: false,
      transports: ['websocket', 'polling']
    })
  } else {
    socket.auth = { token }
  }

  return socket
}

export default getSocket
