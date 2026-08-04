import mongoose from 'mongoose'
import Message from '../models/Message.js'
import StudyGroup from '../models/StudyGroup.js'

export async function getGroupMessages(req, res, next) {
  try {
    const group = await StudyGroup.findOne({ _id: req.params.groupId, members: req.user._id })
    if (!group) return res.status(404).json({ error: 'Study group not found or access denied' })

    const { limit, before } = req.query
    const queryFilter = {
      groupId: group._id,
      deletedForUsers: { $ne: req.user._id }
    }

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

    let messages = []
    if (limit || before) {
      const limitNum = Math.min(parseInt(limit, 10) || 40, 100)
      const rawMessages = await Message.find(queryFilter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limitNum)
        .populate('sender', 'name email')

      messages = rawMessages.reverse()
    } else {
      messages = await Message.find(queryFilter)
        .sort({ createdAt: 1 })
        .populate('sender', 'name email')
    }

    // Format deleted messages
    const formatted = messages.map((msg) => {
      const msgObj = msg.toObject()
      if (msgObj.isDeleted || msgObj.deletedForEveryone) {
        msgObj.message = 'This message was deleted.'
      }
      return msgObj
    })

    res.json(formatted)
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

export async function deleteGroupMessage(req, res, next) {
  try {
    const { groupId, messageId } = req.params
    const deleteType = req.query.deleteType || req.body.deleteType || 'me'

    const group = await StudyGroup.findOne({ _id: groupId, members: req.user._id })
    if (!group) return res.status(404).json({ error: 'Study group not found or access denied' })

    const msg = await Message.findOne({ _id: messageId, groupId: group._id })
    if (!msg) return res.status(404).json({ error: 'Message not found' })

    if (deleteType === 'me') {
      if (!msg.deletedForUsers.some((id) => id.toString() === req.user._id.toString())) {
        msg.deletedForUsers.push(req.user._id)
        await msg.save()
      }
      return res.json({ messageId: msg._id, deleteType: 'me', success: true })
    }

    if (deleteType === 'everyone') {
      const isSender = msg.sender.toString() === req.user._id.toString()
      const isAdmin = group.createdBy.toString() === req.user._id.toString()

      if (!isSender && !isAdmin) {
        return res.status(403).json({ error: 'You are not authorized to delete this message for everyone' })
      }

      msg.isDeleted = true
      msg.deletedForEveryone = true
      msg.deletedAt = new Date()
      msg.deletedBy = req.user._id
      msg.message = 'This message was deleted.'
      await msg.save()

      const populated = await msg.populate('sender', 'name email')
      const msgObj = populated.toObject()
      msgObj.message = 'This message was deleted.'

      // Broadcast via socket if available
      if (req.app.get('io')) {
        req.app.get('io').to(groupId.toString()).emit('message_deleted', {
          messageId: msg._id.toString(),
          groupId: groupId.toString(),
          deleteType: 'everyone',
          isDeleted: true,
          deletedForEveryone: true,
          message: 'This message was deleted.',
          deletedAt: msg.deletedAt,
          sender: populated.sender
        })
      }

      return res.json(msgObj)
    }

    res.status(400).json({ error: 'Invalid deleteType' })
  } catch (error) {
    next(error)
  }
}
