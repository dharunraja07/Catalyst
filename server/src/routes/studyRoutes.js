import express from 'express'
import {
  searchUsers,
  createStudyRequest,
  getIncomingRequests,
  acceptRequest,
  rejectRequest,
  getMyGroups,
  addMemberToGroup
} from '../controllers/studyRequestController.js'
import {
  getGroupMessages,
  postGroupMessage
} from '../controllers/messageController.js'
import {
  listMaterials,
  getMaterial,
  uploadMaterial,
  deleteMaterial
} from '../controllers/studyMaterialController.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/users', searchUsers)
router.post('/requests', createStudyRequest)
router.get('/requests/incoming', getIncomingRequests)
router.post('/requests/:id/accept', acceptRequest)
router.post('/requests/:id/reject', rejectRequest)
router.get('/groups', getMyGroups)
router.post('/groups/:groupId/add-member', addMemberToGroup)
router.get('/groups/:groupId/messages', getGroupMessages)
router.post('/groups/:groupId/messages', postGroupMessage)
router.get('/groups/:groupId/materials', listMaterials)
router.post('/groups/:groupId/materials', uploadMaterial)
router.get('/materials/:materialId', getMaterial)
router.delete('/materials/:materialId', deleteMaterial)

export default router
