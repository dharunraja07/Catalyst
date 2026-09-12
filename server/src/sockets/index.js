import { setupChatSocket } from './chatSocket.js'
import { setupMeetSocket } from './meetSocket.js'

export function setupSockets(io) {
  setupChatSocket(io)
  setupMeetSocket(io)
}

export { setupChatSocket, setupMeetSocket }
