import LearningProgress from '../models/LearningProgress.js'

function formatDateKey(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().split('T')[0]
}

function computeStreakMetrics(entries = []) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const today = new Date()
  let current = 0
  let cursor = new Date(today)
  let cursorKey = formatDateKey(cursor)

  while (sorted.some((entry) => entry.date === cursorKey && (entry.hasAssessment || entry.hasPractice || entry.studyMinutes >= 30))) {
    current += 1
    cursor.setDate(cursor.getDate() - 1)
    cursorKey = formatDateKey(cursor)
  }

  let longest = 0
  let temp = 0
  let previous = null

  for (const entry of sorted) {
    const qualifies = entry.hasAssessment || entry.hasPractice || entry.studyMinutes >= 30
    if (!qualifies) {
      temp = 0
      previous = entry.date
      continue
    }

    if (!previous) {
      temp = 1
    } else {
      const prevDate = new Date(`${previous}T00:00:00`)
      const nextDate = new Date(`${entry.date}T00:00:00`)
      const diff = Math.round((nextDate - prevDate) / (1000 * 60 * 60 * 24))
      temp = diff === 1 ? temp + 1 : 1
    }

    previous = entry.date
    longest = Math.max(longest, temp)
  }

  return {
    currentStreak: current,
    longestStreak: longest,
    totalActiveDays: sorted.filter((entry) => entry.hasAssessment || entry.hasPractice || entry.studyMinutes >= 30).length
  }
}

export async function getProgress(req, res, next) {
  try {
    const progress = await LearningProgress.findOne({ user: req.user._id })
    const safeProgress = progress || { completedTopics: [], scoreHistory: [], lastReviewed: {}, dailyActivity: [] }
    const streakMetrics = computeStreakMetrics(safeProgress.dailyActivity || [])
    res.json({
      ...safeProgress.toObject?.() || safeProgress,
      streak: streakMetrics
    })
  } catch (error) {
    next(error)
  }
}
