import mongoose from 'mongoose'
import Message from '../models/Message.js'
import StudyGroup from '../models/StudyGroup.js'

export async function getGroupMessages(req, res, next) {
  try {
    const group = await StudyGroup.findOne({ _id: req.params.groupId, members: req.user._id })
    if (!group) return res.status(404).json({ error: 'Study group not found or access denied' })

    const { limit, before } = req.query
    const queryFilter = { groupId: group._id }

    if (before) {
      if (mongoose.Types.ObjectId.isValid(before)) {
        const beforeMsg = await Message.findById(before)
        if (beforeMsg) {
          queryFilter.createdAt = { $lt: beforeMsg.createdAt }
        } else {
          queryFilter._id = { $lt: before }
        }
      } else {
        const dateBefore = new Date(before)
        if (!isNaN(dateBefore.getTime())) {
          queryFilter.createdAt = { $lt: dateBefore }
        }
      }
    }

    if (limit || before) {
      const limitNum = Math.min(parseInt(limit, 10) || 40, 100)
      const messages = await Message.find(queryFilter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limitNum)
        .populate('sender', 'name email')

      // Return chronological order for display
      return res.json(messages.reverse())
    }

    // Default behavior for unpaginated calls
    const messages = await Message.find(queryFilter)
      .sort({ createdAt: 1 })
      .populate('sender', 'name email')
    res.json(messages)
  } catch (error) {
    next(error)
  }
}

export async function postGroupMessage(req, res, next) {
  try {
    const group = await StudyGroup.findOne({ _id: req.params.groupId, members: req.user._id })
    if (!group) return res.status(404).json({ error: 'Study group not found or access denied' })
    if (!req.body.message?.trim()) return res.status(400).json({ error: 'Message is required' })

    const message = await Message.create({
      groupId: group._id,
      sender: req.user._id,
      message: req.body.message.trim()
    })
    const populated = await message.populate('sender', 'name email')
    res.status(201).json(populated)
  } catch (error) {
    next(error)
  }
}
