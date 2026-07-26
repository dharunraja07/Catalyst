import express from 'express'
import {
  searchUsers,
  createStudyRequest,
  getIncomingRequests,
  acceptRequest,
  rejectRequest,
  getNotifications,
  markAllNotificationsRead,
  clearNotifications,
  getMyGroups,
  inviteToGroup,
  renameGroup,
  joinByCode,
  addMemberToGroup,
  leaveGroup,
  deleteGroup
} from '../controllers/studyRequestController.js'
import {
  getGroupMessages,
  postGroupMessage
} from '../controllers/messageController.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/users', searchUsers)
router.post('/requests', createStudyRequest)
router.get('/requests/incoming', getIncomingRequests)
router.get('/notifications', getNotifications)
router.patch('/notifications/read-all', markAllNotificationsRead)
router.delete('/notifications', clearNotifications)
router.post('/requests/:id/accept', acceptRequest)
router.post('/requests/:id/reject', rejectRequest)
router.get('/groups', getMyGroups)
router.post('/groups/:groupId/invite', inviteToGroup)
router.patch('/groups/:groupId', renameGroup)
router.post('/groups/join', joinByCode)
router.post('/groups/:groupId/add-member', addMemberToGroup)
router.post('/groups/:groupId/leave', leaveGroup)
router.delete('/groups/:groupId', deleteGroup)
router.get('/groups/:groupId/messages', getGroupMessages)
router.post('/groups/:groupId/messages', postGroupMessage)

export default router
