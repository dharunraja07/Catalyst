import Assignment from '../models/Assignment.js'
import Submission from '../models/Submission.js'

const MAX_ATTACHMENT_CHARS = 6_000_000 // ~4.3MB decoded, keeps documents well under MongoDB's 16MB limit

function validateAttachment(attachment) {
  if (!attachment) return null
  const { fileName, fileType, dataUrl } = attachment
  if (!dataUrl) return null
  if (dataUrl.length > MAX_ATTACHMENT_CHARS) {
    const error = new Error('Attachment is too large. Please upload a file under 4MB.')
    error.status = 413
    throw error
  }
  return { fileName: fileName || 'attachment', fileType: fileType || 'application/octet-stream', dataUrl }
}

// --- Teacher endpoints ---

export async function createAssignment(req, res, next) {
  try {
    const { title, description, subject, dueDate, attachment } = req.body
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' })

    const assignment = await Assignment.create({
      teacher: req.user._id,
      title: title.trim(),
      description: description?.trim() || '',
      subject: subject?.trim() || 'General',
      dueDate: dueDate || undefined,
      attachment: validateAttachment(attachment) || undefined
    })

    res.status(201).json(assignment)
  } catch (error) {
    next(error)
  }
}

export async function updateAssignment(req, res, next) {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, teacher: req.user._id })
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' })

    const { title, description, subject, dueDate, attachment } = req.body
    if (title !== undefined) assignment.title = title.trim()
    if (description !== undefined) assignment.description = description.trim()
    if (subject !== undefined) assignment.subject = subject.trim()
    if (dueDate !== undefined) assignment.dueDate = dueDate || undefined
    if (attachment !== undefined) assignment.attachment = validateAttachment(attachment) || undefined

    await assignment.save()
    res.json(assignment)
  } catch (error) {
    next(error)
  }
}

export async function deleteAssignment(req, res, next) {
  try {
    const assignment = await Assignment.findOneAndDelete({ _id: req.params.id, teacher: req.user._id })
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' })
    await Submission.deleteMany({ assignment: assignment._id })
    res.json({ message: 'Assignment deleted' })
  } catch (error) {
    next(error)
  }
}

// Every submission for one assignment (teacher grading view)
export async function getAssignmentSubmissions(req, res, next) {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, teacher: req.user._id }).lean()
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' })

    const submissions = await Submission.find({ assignment: assignment._id })
      .populate('student', 'name email')
      .sort({ submittedAt: -1 })
      .lean()

    res.json({ assignment, submissions })
  } catch (error) {
    next(error)
  }
}

export async function gradeSubmission(req, res, next) {
  try {
    const { grade, feedback } = req.body
    const submission = await Submission.findById(req.params.submissionId).populate('assignment')
    if (!submission) return res.status(404).json({ error: 'Submission not found' })
    if (!submission.assignment.teacher.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to grade this submission' })
    }

    submission.grade = grade || ''
    submission.feedback = feedback || ''
    submission.status = 'graded'
    await submission.save()

    res.json(submission)
  } catch (error) {
    next(error)
  }
}

// --- Shared / student endpoints ---

// Lists assignments. Teachers see the ones they created (with submission
// counts); students see every assignment plus their own submission status.
export async function listAssignments(req, res, next) {
  try {
    if (req.user.role === 'teacher' || req.user.role === 'admin') {
      const assignments = await Assignment.find({ teacher: req.user._id }).sort({ createdAt: -1 }).lean()
      const counts = await Submission.aggregate([
        { $match: { assignment: { $in: assignments.map((a) => a._id) } } },
        { $group: { _id: '$assignment', count: { $sum: 1 } } }
      ])
      const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]))
      const withCounts = assignments.map((a) => ({ ...a, submissionCount: countMap.get(a._id.toString()) || 0 }))
      return res.json(withCounts)
    }

    const assignments = await Assignment.find({}).populate('teacher', 'name').sort({ createdAt: -1 }).lean()
    const mySubmissions = await Submission.find({ student: req.user._id, assignment: { $in: assignments.map((a) => a._id) } }).lean()
    const submissionMap = new Map(mySubmissions.map((s) => [s.assignment.toString(), s]))
    const withStatus = assignments.map((a) => ({ ...a, mySubmission: submissionMap.get(a._id.toString()) || null }))
    res.json(withStatus)
  } catch (error) {
    next(error)
  }
}

export async function submitAssignment(req, res, next) {
  try {
    const assignment = await Assignment.findById(req.params.id)
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' })

    const { text, attachment } = req.body
    if (!text?.trim() && !attachment?.dataUrl) {
      return res.status(400).json({ error: 'Add some text or attach a file before submitting' })
    }

    const payload = {
      text: text?.trim() || '',
      attachment: validateAttachment(attachment) || undefined,
      status: 'submitted',
      submittedAt: new Date()
    }

    const submission = await Submission.findOneAndUpdate(
      { assignment: assignment._id, student: req.user._id },
      { $set: payload, $setOnInsert: { assignment: assignment._id, student: req.user._id } },
      { new: true, upsert: true }
    )

    res.status(201).json(submission)
  } catch (error) {
    next(error)
  }
}
