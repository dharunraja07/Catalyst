import Meet from '../models/Meet.js'

export async function createMeet(req, res, next) {
  try {
    const { title } = req.body
    const sixHours = 6 * 60 * 60 * 1000
    const expiresAt = new Date(Date.now() + sixHours)

    const meet = await Meet.create({
      title: title?.trim() || 'Study Meet',
      createdBy: req.user._id,
      participants: [req.user._id],
      expiresAt
    })

    const populated = await meet.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'participants', select: 'name email' }
    ])

    res.status(201).json(populated)
  } catch (error) {
    next(error)
  }
}

export async function getMeet(req, res, next) {
  try {
    const roomCode = req.params.roomCode?.trim().toUpperCase()
    const meet = await Meet.findOne({ roomCode }).populate('createdBy', 'name email')

    if (!meet || !meet.isActive || new Date(meet.expiresAt) < new Date()) {
      return res.status(404).json({ error: "This meet doesn't exist or has ended" })
    }

    res.json({
      _id: meet._id,
      roomCode: meet.roomCode,
      title: meet.title,
      createdBy: meet.createdBy,
      participantCount: meet.participants?.length || 0,
      isActive: meet.isActive,
      expiresAt: meet.expiresAt
    })
  } catch (error) {
    next(error)
  }
}

export async function joinMeet(req, res, next) {
  try {
    const roomCode = req.params.roomCode?.trim().toUpperCase()
    const meet = await Meet.findOne({ roomCode })

    if (!meet || !meet.isActive || new Date(meet.expiresAt) < new Date()) {
      return res.status(404).json({ error: "This meet doesn't exist or has ended" })
    }

    if (!meet.participants.some((p) => p.toString() === req.user._id.toString())) {
      meet.participants.push(req.user._id)
      await meet.save()
    }

    const populated = await meet.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'participants', select: 'name email' }
    ])

    res.json(populated)
  } catch (error) {
    next(error)
  }
}

export async function getMyMeets(req, res, next) {
  try {
    const meets = await Meet.find({
      $or: [
        { createdBy: req.user._id },
        { participants: req.user._id }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('participants', 'name email')

    const now = new Date()
    const formattedMeets = meets.map((m) => {
      const isExpired = new Date(m.expiresAt) < now
      const effectiveActive = m.isActive && !isExpired
      return {
        _id: m._id,
        roomCode: m.roomCode,
        title: m.title,
        createdBy: m.createdBy,
        participantCount: m.participants?.length || 0,
        isActive: effectiveActive,
        createdAt: m.createdAt,
        expiresAt: m.expiresAt
      }
    })

    res.json(formattedMeets)
  } catch (error) {
    next(error)
  }
}

export async function endMeet(req, res, next) {
  try {
    const roomCode = req.params.roomCode?.trim().toUpperCase()
    const meet = await Meet.findOne({ roomCode })

    if (!meet) {
      return res.status(404).json({ error: 'Meet not found' })
    }

    if (meet.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the host can end this meet' })
    }

    meet.isActive = false
    await meet.save()

    res.json({ message: 'Meet ended successfully', roomCode: meet.roomCode })
  } catch (error) {
    next(error)
  }
}
