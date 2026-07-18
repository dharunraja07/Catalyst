import express from 'express'
import {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
  gradeSubmission,
  listAssignments,
  submitAssignment
} from '../controllers/classroomController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(protect)

router.get('/assignments', listAssignments)
router.post('/assignments', authorize(['teacher', 'admin']), createAssignment)
router.patch('/assignments/:id', authorize(['teacher', 'admin']), updateAssignment)
router.delete('/assignments/:id', authorize(['teacher', 'admin']), deleteAssignment)
router.get('/assignments/:id/submissions', authorize(['teacher', 'admin']), getAssignmentSubmissions)
router.post('/assignments/:id/submit', submitAssignment)
router.patch('/submissions/:submissionId/grade', authorize(['teacher', 'admin']), gradeSubmission)

export default router
