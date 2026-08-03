import User from '../models/User.js'
import StudyRequest from '../models/StudyRequest.js'
import StudyGroup from '../models/StudyGroup.js'
import Message from '../models/Message.js'
import { emitNotificationCount } from '../sockets/chatSocket.js'

async function populateGroup(group) {
  if (!group) return group
  await group.populate([
    { path: 'members', select: 'name email educationLevel' },
    { path: 'createdBy', select: 'name email' }
  ])
  return group
}

export async function searchUsers(req, res, next) {
  try {
    const term = req.query.q?.trim() || ''
    const regex = new RegExp(term, 'i')
    const users = await User.find({
      _id: { $ne: req.user._id },
      role: 'student',
      $or: [{ name: regex }, { email: regex }]
    }).select('name email educationLevel interestedSubjects careerInterests')
    res.json(users)
  } catch (error) {
    next(error)
  }
}

export async function createStudyRequest(req, res, next) {
  try {
    const receiverId = req.body.receiverId
    if (!receiverId) return res.status(400).json({ error: 'Receiver is required' })
    if (receiverId === req.user._id.toString()) return res.status(400).json({ error: 'Cannot send request to yourself' })

    const existing = await StudyRequest.findOne({
      $or: [
        { sender: req.user._id, receiver: receiverId },
        { sender: receiverId, receiver: req.user._id }
      ],
      status: 'pending'
    })
    if (existing) return res.status(400).json({ error: 'A pending request already exists between these users' })

    const request = await StudyRequest.create({ sender: req.user._id, receiver: receiverId })
    await request.populate('sender', 'name email avatar')
    await request.populate('receiver', 'name email avatar')

    const io = req.app.get('io')
    if (io) {
      io.to(`user:${receiverId.toString()}`).emit('invite_received', request)
      await emitNotificationCount(io, receiverId)
    }

    res.json(request)
  } catch (error) {
    next(error)
  }
}

export async function getNotifications(req, res, next) {
  try {
    const notifications = await StudyRequest.find({ receiver: req.user._id })
      .populate('sender', 'name email avatar educationLevel interestedSubjects')
      .populate('group', 'groupName createdBy joinCode')
      .sort({ createdAt: -1 })
    res.json(notifications)
  } catch (error) {
    next(error)
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await StudyRequest.updateMany(
      { receiver: req.user._id, isRead: false },
      { $set: { isRead: true } }
    )
    const io = req.app.get('io')
    if (io) {
      await emitNotificationCount(io, req.user._id)
    }
    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    next(error)
  }
}

export async function clearNotifications(req, res, next) {
  try {
    await StudyRequest.deleteMany({
      receiver: req.user._id,
      status: { $in: ['accepted', 'rejected'] }
    })
    const io = req.app.get('io')
    if (io) {
      await emitNotificationCount(io, req.user._id)
    }
    res.json({ message: 'Notifications cleared' })
  } catch (error) {
    next(error)
  }
}

export async function getIncomingRequests(req, res, next) {
  try {
    const requests = await StudyRequest.find({ receiver: req.user._id, status: 'pending' })
      .populate('sender', 'name email avatar educationLevel interestedSubjects careerInterests')
      .populate('group', 'groupName createdBy')
      .sort({ createdAt: -1 })
    res.json(requests)
  } catch (error) {
    next(error)
  }
}

export async function acceptRequest(req, res, next) {
  try {
    const request = await StudyRequest.findOne({ _id: req.params.id, receiver: req.user._id, status: 'pending' })
    if (!request) return res.status(404).json({ error: 'Request not found' })

    request.status = 'accepted'
    request.isRead = true
    await request.save()

    let populated
    if (request.group) {
      const group = await StudyGroup.findById(request.group)
      if (!group) return res.status(404).json({ error: 'Group not found' })
      if (!group.members.some((memberId) => memberId.toString() === req.user._id.toString())) {
        if (group.members.length >= group.maxMembers) {
          return res.status(400).json({ error: 'This group is full' })
        }
        group.members.push(req.user._id)
        await group.save()
      }
      populated = await populateGroup(group)
    } else {
      const sender = await User.findById(request.sender)
      const receiver = await User.findById(request.receiver)
      const group = await StudyGroup.create({
        groupName: `${sender?.name || 'User'} & ${receiver?.name || 'User'} Study Group`,
        members: [request.sender, request.receiver],
        createdBy: request.sender
      })
      populated = await populateGroup(group)
    }

    const io = req.app.get('io')
    if (io) {
      const payload = {
        requestId: request._id,
        group: populated,
        acceptedBy: { _id: req.user._id, name: req.user.name }
      }
      io.to(`user:${request.receiver.toString()}`).emit('invite_accepted', payload)
      io.to(`user:${request.sender.toString()}`).emit('invite_accepted', payload)
      io.emit('group_updated', populated)

      try {
        const systemMsg = await Message.create({
          groupId: populated._id,
          sender: req.user._id,
          message: `🟢 ${req.user.name} joined the study group`,
          isSystem: true,
          systemEventType: 'join'
        })
        const populatedMsg = await systemMsg.populate('sender', 'name email')
        io.to(populated._id.toString()).emit('receive_message', populatedMsg)
        io.to(populated._id.toString()).emit('member_joined', { userId: req.user._id.toString(), name: req.user.name, groupId: populated._id.toString() })
      } catch (err) {
        console.error('Error broadcasting system join message in acceptRequest:', err)
      }

      await emitNotificationCount(io, request.receiver)
      await emitNotificationCount(io, request.sender)
    }

    res.json(populated)
  } catch (error) {
    next(error)
  }
}

export async function rejectRequest(req, res, next) {
  try {
    const request = await StudyRequest.findOne({ _id: req.params.id, receiver: req.user._id, status: 'pending' })
    if (!request) return res.status(404).json({ error: 'Request not found' })
    request.status = 'rejected'
    request.isRead = true
    await request.save()

    const io = req.app.get('io')
    if (io) {
      const payload = {
        requestId: request._id,
        groupId: request.group,
        declinedBy: { _id: req.user._id, name: req.user.name }
      }
      io.to(`user:${request.receiver.toString()}`).emit('invite_declined', payload)
      io.to(`user:${request.sender.toString()}`).emit('invite_declined', payload)
      await emitNotificationCount(io, request.receiver)
      await emitNotificationCount(io, request.sender)
    }

    res.json(request)
  } catch (error) {
    next(error)
  }
}

export async function getMyGroups(req, res, next) {
  try {
    const groups = await StudyGroup.find({ members: req.user._id })
      .populate('members', 'name email educationLevel')
      .populate('createdBy', 'name email')
    res.json(groups)
  } catch (error) {
    next(error)
  }
}

export async function inviteToGroup(req, res, next) {
  try {
    const { userId } = req.body
    const groupId = req.params.groupId

    if (!groupId || !userId) {
      return res.status(400).json({ error: 'Group ID and User ID are required' })
    }

    const group = await StudyGroup.findById(groupId)
    if (!group) return res.status(404).json({ error: 'Group not found' })

    const isMember = group.members.some((memberId) => memberId.toString() === req.user._id.toString())
    if (!isMember) return res.status(403).json({ error: 'You are not a member of this group' })

    if (group.members.some((memberId) => memberId.toString() === userId.toString())) {
      return res.status(400).json({ error: 'User is already a member of this group' })
    }

    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({ error: 'This group is full' })
    }

    const pendingInvite = await StudyRequest.findOne({
      receiver: userId,
      status: 'pending',
      group: group._id
    })

    if (pendingInvite) {
      return res.status(400).json({ error: 'A pending invite already exists for this user' })
    }

    const request = await StudyRequest.create({ sender: req.user._id, receiver: userId, group: group._id, isRead: false })
    await request.populate('sender', 'name email avatar')
    await request.populate('receiver', 'name email avatar')
    await request.populate('group', 'groupName createdBy joinCode')

    const io = req.app.get('io')
    if (io) {
      io.to(`user:${userId.toString()}`).emit('invite_received', request)
      await emitNotificationCount(io, userId)
    }

    res.json(request)
  } catch (error) {
    next(error)
  }
}

export async function renameGroup(req, res, next) {
  try {
    const { groupName } = req.body
    if (!groupName?.trim()) return res.status(400).json({ error: 'Group name is required' })

    const group = await StudyGroup.findById(req.params.groupId)
    if (!group) return res.status(404).json({ error: 'Group not found' })

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the group admin can rename this group' })
    }

    group.groupName = groupName.trim()
    await group.save()
    const populated = await populateGroup(group)
    res.json(populated)
  } catch (error) {
    next(error)
  }
}

export async function joinByCode(req, res, next) {
  try {
    const { code } = req.body
    if (!code?.trim()) return res.status(400).json({ error: 'Join code is required' })

    const group = await StudyGroup.findOne({ joinCode: code.trim().toUpperCase() })
    if (!group) return res.status(404).json({ error: 'Group not found' })

    if (group.members.some((memberId) => memberId.toString() === req.user._id.toString())) {
      return res.status(400).json({ error: 'You are already a member of this group' })
    }

    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({ error: 'This group is full' })
    }

    group.members.push(req.user._id)
    await group.save()
    const populated = await populateGroup(group)

    const io = req.app.get('io')
    if (io) {
      try {
        const systemMsg = await Message.create({
          groupId: group._id,
          sender: req.user._id,
          message: `🟢 ${req.user.name} joined the study group`,
          isSystem: true,
          systemEventType: 'join'
        })
        const populatedMsg = await systemMsg.populate('sender', 'name email')
        io.to(group._id.toString()).emit('receive_message', populatedMsg)
        io.to(group._id.toString()).emit('member_joined', { userId: req.user._id.toString(), name: req.user.name, groupId: group._id.toString() })
        io.emit('group_updated', populated)
      } catch (err) {
        console.error('Error creating join system message in joinByCode:', err)
      }
    }

    res.json(populated)
  } catch (error) {
    next(error)
  }
}

export async function addMemberToGroup(req, res, next) {
  try {
    const { groupId, userId } = req.body
    if (!groupId || !userId) {
      return res.status(400).json({ error: 'Group ID and User ID are required' })
    }

    // Check if user is a member of the group
    const group = await StudyGroup.findById(groupId)
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ error: 'You are not a member of this group' })
    }

    if (group.members.includes(userId)) {
      return res.status(400).json({ error: 'User is already a member of this group' })
    }

    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({ error: 'This group is full' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    group.members.push(userId)
    await group.save()

    const populated = await populateGroup(group)
    res.json(populated)
  } catch (error) {
    next(error)
  }
}

export async function leaveGroup(req, res, next) {
  try {
    const groupId = req.params.groupId
    const group = await StudyGroup.findById(groupId)
    if (!group) return res.status(404).json({ error: 'Group not found' })

    const isMember = group.members.some((m) => m.toString() === req.user._id.toString())
    if (!isMember) return res.status(400).json({ error: 'You are not a member of this group' })

    const isHost = group.createdBy.toString() === req.user._id.toString()
    group.members = group.members.filter((m) => m.toString() !== req.user._id.toString())

    if (group.members.length === 0) {
      await StudyGroup.deleteOne({ _id: group._id })
      await Message.deleteMany({ groupId: group._id })
      return res.json({ message: 'Left and deleted empty study group', groupId })
    }

    let newHost = null
    if (isHost && group.members.length > 0) {
      group.createdBy = group.members[0]
      newHost = await User.findById(group.createdBy).select('name email')
    }

    await group.save()

    const io = req.app.get('io')
    if (io) {
      try {
        const leaveMsgText = newHost
          ? `🔴 ${req.user.name} left. 👑 ${newHost.name} is now the Host of the group.`
          : `🔴 ${req.user.name} left the study group`

        const systemMsg = await Message.create({
          groupId: group._id,
          sender: req.user._id,
          message: leaveMsgText,
          isSystem: true,
          systemEventType: isHost ? 'host_change' : 'leave'
        })
        const populatedMsg = await systemMsg.populate('sender', 'name email')
        io.to(group._id.toString()).emit('receive_message', populatedMsg)
        io.to(group._id.toString()).emit('member_left', { userId: req.user._id.toString(), name: req.user.name, groupId: group._id.toString() })

        if (newHost) {
          io.to(group._id.toString()).emit('host_changed', {
            groupId: group._id.toString(),
            newHostId: newHost._id.toString(),
            newHostName: newHost.name
          })
        }

        const populated = await populateGroup(group)
        io.emit('group_updated', populated)
      } catch (err) {
        console.error('Error creating leave system message in leaveGroup:', err)
      }
    }

    res.json({ message: 'Left study group successfully', groupId, newHost })
  } catch (error) {
    next(error)
  }
}

export async function transferHost(req, res, next) {
  try {
    const { groupId } = req.params
    const { newHostId } = req.body

    if (!newHostId) {
      return res.status(400).json({ error: 'New Host ID is required' })
    }

    const group = await StudyGroup.findById(groupId)
    if (!group) return res.status(404).json({ error: 'Study group not found' })

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the current Host can transfer Host privileges' })
    }

    const isTargetMember = group.members.some((m) => m.toString() === newHostId.toString())
    if (!isTargetMember) {
      return res.status(400).json({ error: 'Target user is not a member of this group' })
    }

    const targetUser = await User.findById(newHostId).select('name email')
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' })
    }

    group.createdBy = targetUser._id
    await group.save()

    const io = req.app.get('io')
    if (io) {
      try {
        const systemMsg = await Message.create({
          groupId: group._id,
          sender: req.user._id,
          message: `👑 ${req.user.name} transferred Host role to ${targetUser.name}`,
          isSystem: true,
          systemEventType: 'host_change'
        })
        const populatedMsg = await systemMsg.populate('sender', 'name email')
        io.to(group._id.toString()).emit('receive_message', populatedMsg)
        io.to(group._id.toString()).emit('host_changed', {
          groupId: group._id.toString(),
          newHostId: targetUser._id.toString(),
          newHostName: targetUser.name
        })
        const populated = await populateGroup(group)
        io.emit('group_updated', populated)
      } catch (err) {
        console.error('Error broadcasting host transfer:', err)
      }
    }

    res.json({ message: `Host role transferred to ${targetUser.name} successfully`, group: await populateGroup(group) })
  } catch (error) {
    next(error)
  }
}

export async function removeMember(req, res, next) {
  try {
    const { groupId } = req.params
    const { userId } = req.body

    if (!userId) return res.status(400).json({ error: 'User ID is required' })

    const group = await StudyGroup.findById(groupId)
    if (!group) return res.status(404).json({ error: 'Group not found' })

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the Host can remove members' })
    }

    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Host cannot remove themselves. Use Leave Group instead.' })
    }

    const isMember = group.members.some((m) => m.toString() === userId.toString())
    if (!isMember) return res.status(400).json({ error: 'User is not in this group' })

    const removedUser = await User.findById(userId).select('name email')
    group.members = group.members.filter((m) => m.toString() !== userId.toString())
    await group.save()

    const io = req.app.get('io')
    if (io) {
      try {
        const systemMsg = await Message.create({
          groupId: group._id,
          sender: req.user._id,
          message: `🔴 Host ${req.user.name} removed ${removedUser ? removedUser.name : 'a member'} from the study group`,
          isSystem: true,
          systemEventType: 'remove_member'
        })
        const populatedMsg = await systemMsg.populate('sender', 'name email')
        io.to(group._id.toString()).emit('receive_message', populatedMsg)
        io.to(group._id.toString()).emit('member_removed', { userId: userId.toString(), groupId: group._id.toString() })
        const populated = await populateGroup(group)
        io.emit('group_updated', populated)
      } catch (err) {
        console.error('Error broadcasting remove member:', err)
      }
    }

    res.json({ message: 'Member removed successfully', group: await populateGroup(group) })
  } catch (error) {
    next(error)
  }
}

export async function deleteGroup(req, res, next) {
  try {
    const groupId = req.params.groupId
    const group = await StudyGroup.findById(groupId)
    if (!group) return res.status(404).json({ error: 'Group not found' })

    const isHost = group.createdBy.toString() === req.user._id.toString()
    if (!isHost) {
      return res.status(403).json({ error: 'Only the Host can delete the study group' })
    }

    await StudyGroup.deleteOne({ _id: group._id })
    await Message.deleteMany({ groupId: group._id })

    const io = req.app.get('io')
    if (io) {
      io.to(group._id.toString()).emit('group_deleted', { groupId: group._id.toString() })
    }

    res.json({ message: 'Study group deleted successfully', groupId })
  } catch (error) {
    next(error)
  }
}
