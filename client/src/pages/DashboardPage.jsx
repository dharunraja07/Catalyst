import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import ProductivityHub from '../components/ProductivityHub.jsx'

const TIMER_STORAGE_KEY = 'catalyst_active_goal_timer'
const PRACTICE_DAYS_KEY = 'catalyst_practice_days'

const FOCUS_DURATION = 25 * 60
const BREAK_DURATION = 5 * 60

function toDateKey(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function normalizeStudySessions(sessions) {
  const map = new Map()

  sessions.forEach((entry) => {
    if (!entry || !entry.date) return
    const key = entry.date.length >= 10 ? entry.date.slice(0, 10) : entry.date
    const minutes = Number(entry.minutes || 0)
    if (!Number.isFinite(minutes) || minutes <= 0) return

    map.set(key, (map.get(key) || 0) + minutes)
  })

  return Array.from(map.entries())
    .map(([date, minutes]) => ({ date, minutes }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function getMinutesForDate(sessions, dateKey) {
  return sessions.find((entry) => entry.date === dateKey)?.minutes || 0
}

function getGoalParts(totalMinutes) {
  const safeMinutes = Math.max(0, Number(totalMinutes) || 0)
  return {
    hours: Math.floor(safeMinutes / 60),
    minutes: safeMinutes % 60
  }
}

function computeStreakMetrics(sessions, goalMinutes) {
  const goal = Math.max(1, Number(goalMinutes || 60))

  const completedSet = new Set(
    sessions
      .filter((entry) => entry.minutes >= goal && entry.date)
      .map((entry) => (entry.date.length >= 10 ? entry.date.slice(0, 10) : entry.date))
  )

  const completedDates = Array.from(completedSet).sort()

  const totalCompletedDays = completedDates.length

  let longestStreak = 0
  let currentChain = 0
  let prevDateObj = null

  for (const dateStr of completedDates) {
    const currentDateObj = new Date(`${dateStr}T00:00:00`)
    if (!prevDateObj) {
      currentChain = 1
    } else {
      const diffMs = currentDateObj.getTime() - prevDateObj.getTime()
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        currentChain += 1
      } else {
        currentChain = 1
      }
    }
    prevDateObj = currentDateObj
    if (currentChain > longestStreak) {
      longestStreak = currentChain
    }
  }

  const today = new Date()
  const todayKey = toDateKey(today)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = toDateKey(yesterday)

  let currentStreak = 0

  let anchorDate = null
  if (completedSet.has(todayKey)) {
    anchorDate = new Date(today)
  } else if (completedSet.has(yesterdayKey)) {
    anchorDate = new Date(yesterday)
  }

  if (anchorDate) {
    const cursor = new Date(anchorDate)
    while (completedSet.has(toDateKey(cursor))) {
      currentStreak += 1
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak
  }

  return {
    currentStreak,
    longestStreak,
    totalCompletedDays
  }
}

function getLevelColor(level, isDark) {
  switch (level) {
    case 3:
      return 'bg-[#2E7D32] border-[#2E7D32] text-white shadow-sm'
    case 2:
      return 'bg-[#7ED957] border-[#7ED957] text-black font-semibold'
    case 1:
      return 'bg-[#C6F6C6] border-[#B2E8B2] text-black'
    case 0:
    default:
      return isDark ? 'bg-[#1E293B] border-[#334155]/60' : 'bg-[#EBEDF0] border-[#D1D5DB]/60'
  }
}

export default function DashboardPage() {
  const { api } = useAuth()
  const { addLocalNotification } = useNotifications()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  const [hoursInput, setHoursInput] = useState('1')
  const [minutesInput, setMinutesInput] = useState('0')
  const [savingGoal, setSavingGoal] = useState(false)

  // 1. Pomodoro Timer State
  const [pomoMode, setPomoMode] = useState('focus')
  const [pomoSecondsLeft, setPomoSecondsLeft] = useState(FOCUS_DURATION)
  const [isPomoRunning, setIsPomoRunning] = useState(false)

  // 2. Goal-Driven Countdown Timer State
  const [goalEndsAt, setGoalEndsAt] = useState(null)
  const [timerDurationMinutes, setTimerDurationMinutes] = useState(0)
  const [goalSecondsLeft, setGoalSecondsLeft] = useState(0)
  const [isGoalTimerRunning, setIsGoalTimerRunning] = useState(false)
  const [showSuccessPulse, setShowSuccessPulse] = useState(false)

  // 3. Activity Sources for Heatmap
  const [assessmentDates, setAssessmentDates] = useState(new Set())
  const [practiceDates, setPracticeDates] = useState(new Set())
  const [loadingHeatmap, setLoadingHeatmap] = useState(true)
  const [activeTooltip, setActiveTooltip] = useState(null)

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Pomodoro Interval Effect
  useEffect(() => {
    if (!isPomoRunning) return undefined

    const timer = window.setInterval(() => {
      setPomoSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer)
          setIsPomoRunning(false)
          if (pomoMode === 'focus') {
            setPomoMode('break')
            setPomoSecondsLeft(BREAK_DURATION)
          } else {
            setPomoMode('focus')
            setPomoSecondsLeft(FOCUS_DURATION)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isPomoRunning, pomoMode])

  const addStudySession = useCallback(
    async (minutesToAdd) => {
      if (!profile || !minutesToAdd) return null

      const nextSessions = normalizeStudySessions([
        ...(profile.studySessions || []),
        { date: toDateKey(new Date()), minutes: minutesToAdd }
      ])

      try {
        const response = await api.put('/auth/profile', { studySessions: nextSessions })
        setProfile(response.data)
        return response.data
      } catch (err) {
        setError('Unable to save study session')
        return null
      }
    },
    [api, profile]
  )

  const handleGoalTimerComplete = useCallback(
    async (minutesCompleted) => {
      const updatedProfile = await addStudySession(minutesCompleted)
      const currentGoal = Math.max(
        1,
        Number(updatedProfile?.dailyGoalMinutes || profile?.dailyGoalMinutes || 60)
      )
      const currentSessions = normalizeStudySessions(
        updatedProfile?.studySessions || profile?.studySessions || []
      )
      const metrics = computeStreakMetrics(currentSessions, currentGoal)

      addLocalNotification({
        title: 'Goal Completed! 🎉',
        message: `You completed today's study goal. Current streak: ${metrics.currentStreak} day${
          metrics.currentStreak === 1 ? '' : 's'
        }.`
      })

      setShowSuccessPulse(true)
      setTimeout(() => setShowSuccessPulse(false), 4000)
    },
    [addStudySession, addLocalNotification, profile]
  )

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await api.get('/auth/profile')
        setProfile(response.data)
      } catch (err) {
        setError('Unable to load profile')
      }
    }
    loadProfile()
  }, [api])

  useEffect(() => {
    if (profile) {
      const { hours, minutes } = getGoalParts(profile.dailyGoalMinutes || 60)
      setHoursInput(String(hours))
      setMinutesInput(String(minutes))
    }
  }, [profile])

  useEffect(() => {
    async function loadActivityData() {
      setLoadingHeatmap(true)
      try {
        try {
          const res = await api.get('/assessment/history')
          const history = Array.isArray(res.data) ? res.data : []
          const dates = new Set()
          history.forEach((item) => {
            if (item.createdAt) {
              dates.add(toDateKey(new Date(item.createdAt)))
            } else if (item.date) {
              dates.add(item.date.slice(0, 10))
            }
          })
          setAssessmentDates(dates)
        } catch (e) {
          console.warn('Could not load assessment history:', e.message)
        }

        try {
          const raw = localStorage.getItem(PRACTICE_DAYS_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              setPracticeDates(new Set(parsed))
            }
          }
        } catch (e) {
          console.warn('Could not read practice days from localStorage:', e.message)
        }
      } finally {
        setLoadingHeatmap(false)
      }
    }
    loadActivityData()
  }, [api])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.goalEndsAt) {
          const rem = Math.max(0, Math.round((parsed.goalEndsAt - Date.now()) / 1000))
          if (rem > 0) {
            setGoalEndsAt(parsed.goalEndsAt)
            setTimerDurationMinutes(parsed.totalMinutes || Math.ceil(rem / 60))
            setGoalSecondsLeft(rem)
            setIsGoalTimerRunning(Boolean(parsed.isRunning))
          } else {
            localStorage.removeItem(TIMER_STORAGE_KEY)
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse timer state:', e)
    }
  }, [])

  useEffect(() => {
    if (!isGoalTimerRunning || !goalEndsAt) return undefined

    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.round((goalEndsAt - Date.now()) / 1000))
      setGoalSecondsLeft(remaining)

      if (remaining <= 0) {
        window.clearInterval(timer)
        setIsGoalTimerRunning(false)
        setGoalEndsAt(null)
        try {
          localStorage.removeItem(TIMER_STORAGE_KEY)
        } catch (e) {}
        handleGoalTimerComplete(timerDurationMinutes)
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isGoalTimerRunning, goalEndsAt, timerDurationMinutes, handleGoalTimerComplete])

  const startGoalTimer = (totalMinutes) => {
    const targetEndsAt = Date.now() + totalMinutes * 60 * 1000
    setGoalEndsAt(targetEndsAt)
    setTimerDurationMinutes(totalMinutes)
    setGoalSecondsLeft(totalMinutes * 60)
    setIsGoalTimerRunning(true)

    try {
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          goalEndsAt: targetEndsAt,
          totalMinutes,
          isRunning: true
        })
      )
    } catch (e) {
      console.error('Failed to save timer state:', e)
    }
  }

  const saveDailyGoal = async () => {
    const hours = Math.max(0, Number(hoursInput) || 0)
    const minutes = Math.max(0, Number(minutesInput) || 0)
    const total = hours * 60 + minutes

    if (!Number.isFinite(total) || total <= 0) {
      setError('Daily goal must be at least 1 minute')
      return
    }

    setSavingGoal(true)
    setError('')

    try {
      const response = await api.put('/auth/profile', { dailyGoalMinutes: total })
      setProfile(response.data)
      startGoalTimer(total)
    } catch (err) {
      setError('Unable to update daily goal')
    } finally {
      setSavingGoal(false)
    }
  }

  const togglePauseGoalTimer = () => {
    setIsGoalTimerRunning((prev) => {
      const next = !prev
      if (next && goalSecondsLeft > 0) {
        const newEndsAt = Date.now() + goalSecondsLeft * 1000
        setGoalEndsAt(newEndsAt)
        try {
          localStorage.setItem(
            TIMER_STORAGE_KEY,
            JSON.stringify({
              goalEndsAt: newEndsAt,
              totalMinutes: timerDurationMinutes,
              isRunning: true
            })
          )
        } catch (e) {}
      } else if (!next && goalEndsAt) {
        try {
          localStorage.setItem(
            TIMER_STORAGE_KEY,
            JSON.stringify({
              goalEndsAt,
              totalMinutes: timerDurationMinutes,
              isRunning: false
            })
          )
        } catch (e) {}
      }
      return next
    })
  }

  const resetGoalTimer = () => {
    setIsGoalTimerRunning(false)
    setGoalEndsAt(null)
    setGoalSecondsLeft(0)
    setTimerDurationMinutes(0)
    try {
      localStorage.removeItem(TIMER_STORAGE_KEY)
    } catch (e) {}
  }

  const normalizedSessions = useMemo(
    () => normalizeStudySessions(profile?.studySessions || []),
    [profile]
  )

  const todayKey = toDateKey(new Date())
  const dailyGoal = Math.max(1, Number(profile?.dailyGoalMinutes || 60))
  const todayMinutes = getMinutesForDate(normalizedSessions, todayKey)
  const progressWidth = Math.min(100, Math.round((todayMinutes / dailyGoal) * 100))

  const { currentStreak, longestStreak, totalCompletedDays } = useMemo(
    () => computeStreakMetrics(normalizedSessions, dailyGoal),
    [normalizedSessions, dailyGoal]
  )

  // LeetCode Month-Grouped 365-Day Contribution Heatmap Data
  const heatmapData = useMemo(() => {
    const today = new Date()
    const days = []

    for (let i = 364; i >= 0; i -= 1) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dateKey = toDateKey(d)

      const studyGoalDone = getMinutesForDate(normalizedSessions, dateKey) >= dailyGoal
      const assessmentDone = assessmentDates.has(dateKey)
      const practiceDone = practiceDates.has(dateKey)

      const completedCount = (studyGoalDone ? 1 : 0) + (assessmentDone ? 1 : 0) + (practiceDone ? 1 : 0)

      let level = 0
      if (completedCount === 1) level = 1
      else if (completedCount === 2) level = 2
      else if (completedCount === 3) level = 3

      days.push({
        date: d,
        dateKey,
        studyGoalDone,
        assessmentDone,
        practiceDone,
        completedCount,
        level,
        year: d.getFullYear(),
        month: d.getMonth(),
        dayOfWeek: d.getDay()
      })
    }

    // Group days by Year-Month
    const monthGroups = []
    let currentGroup = null

    days.forEach((dayObj) => {
      const groupKey = `${dayObj.year}-${dayObj.month}`
      if (!currentGroup || currentGroup.key !== groupKey) {
        if (currentGroup) {
          monthGroups.push(currentGroup)
        }
        currentGroup = {
          key: groupKey,
          name: dayObj.date.toLocaleDateString(undefined, { month: 'short' }),
          days: []
        }
      }
      currentGroup.days.push(dayObj)
    })
    if (currentGroup) {
      monthGroups.push(currentGroup)
    }

    // For each month group, cluster days into week columns (up to 7 days per column)
    const monthBlocks = monthGroups.map((group) => {
      const weeks = []
      let currentWeek = []

      const firstDayOfWeek = group.days[0].dayOfWeek
      for (let i = 0; i < firstDayOfWeek; i += 1) {
        currentWeek.push(null)
      }

      group.days.forEach((dayObj) => {
        currentWeek.push(dayObj)
        if (currentWeek.length === 7) {
          weeks.push(currentWeek)
          currentWeek = []
        }
      })
      if (currentWeek.length > 0) {
        weeks.push(currentWeek)
      }

      return {
        key: group.key,
        name: group.name,
        weeks
      }
    })

    const activeDaysCount = days.filter((d) => d.completedCount > 0).length
    const studyGoalsCompletedCount = days.filter((d) => d.studyGoalDone).length
    const assessmentsCompletedCount = days.filter((d) => d.assessmentDone).length
    const practiceSessionsCount = days.filter((d) => d.practiceDone).length

    return {
      monthBlocks,
      totalDaysCount: days.length,
      activeDaysCount,
      studyGoalsCompletedCount,
      assessmentsCompletedCount,
      practiceSessionsCount
    }
  }, [normalizedSessions, dailyGoal, assessmentDates, practiceDates])

  const formatTimerDisplay = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60

    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <main className="mx-auto max-w-[1280px] max-w-full overflow-x-hidden px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-label">Dashboard</p>
          <h1 className="page-title mb-1.5 text-2xl sm:text-3xl font-extrabold">Student Overview</h1>
          <p className="page-description text-xs sm:text-sm text-[var(--text-secondary)]">Welcome back! Track your study stats, daily goals, pomodoro sessions, and learning consistency.</p>
        </div>
        <span className="inline-flex items-center min-h-[44px] rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] shadow-sm shrink-0 self-start sm:self-auto">
          Academic Workspace
        </span>
      </div>

      <hr className="canvas-divider opacity-60" />

      {error && (
        <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-xs sm:text-sm text-[var(--error-color)] break-words">
          {error}
        </p>
      )}

      {profile ? (
        <div className="space-y-6 sm:space-y-8">
          {/* Hero Welcome Banner Widget */}
          <div className="rounded-2xl sm:rounded-[20px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4.5 sm:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 sm:gap-6">
              <div>
                <h2 className="section-title text-xl sm:text-2xl md:text-3xl font-bold">Hello, {profile.name} 👋</h2>
                <p className="body-text mt-1.5 sm:mt-2 max-w-2xl text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  Track your learning progress, stay on top of daily goals, and maintain your study streak.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
                <div className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-primary)] px-3.5 py-3 text-center sm:text-left min-w-0">
                  <p className="caption-text uppercase tracking-widest font-semibold text-[10px] text-[var(--text-muted)]">Focus Goal</p>
                  <p className="card-title mt-0.5 text-sm sm:text-base font-bold truncate">{dailyGoal} min</p>
                </div>
                <div className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-primary)] px-3.5 py-3 text-center sm:text-left min-w-0">
                  <p className="caption-text uppercase tracking-widest font-semibold text-[10px] text-[var(--text-muted)]">Today</p>
                  <p className="card-title mt-0.5 text-sm sm:text-base font-bold text-[var(--accent-color)] truncate">{todayMinutes} min</p>
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Timers (Pomodoro Timer + Daily Goal Timer) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            
            {/* 1. Pomodoro Timer Card */}
            <div className="rounded-2xl sm:rounded-[20px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4.5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <p className="caption-text uppercase tracking-widest font-semibold text-[10px] text-[var(--accent-color)]">Focus Widget</p>
                    <h3 className="section-title mt-0.5 text-lg sm:text-xl font-bold">
                      {pomoMode === 'focus' ? 'Pomodoro Focus Session' : 'Rest Break'}
                    </h3>
                  </div>
                  <span className="rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-primary)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)] shrink-0">
                    {pomoMode === 'focus' ? '25 min' : '5 min'}
                  </span>
                </div>

                <div className="my-3 sm:my-6 rounded-2xl sm:rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-primary)] p-6 sm:p-8 text-center">
                  <p className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-primary)] font-mono break-all">
                    {formatTimerDisplay(pomoSecondsLeft)}
                  </p>
                  <p className="text-[11px] sm:text-xs font-semibold text-[var(--text-muted)] mt-2.5 sm:mt-3 uppercase tracking-wider">
                    {isPomoRunning ? 'Session in progress' : 'Ready to start'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setIsPomoRunning((prev) => !prev)}
                  className="flex-1 saas-button-primary min-h-[46px] font-bold shadow-sm cursor-pointer text-sm"
                >
                  {isPomoRunning ? 'Pause' : 'Start Focus'}
                </button>
                <button
                  onClick={() => {
                    setIsPomoRunning(false)
                    setPomoSecondsLeft(pomoMode === 'focus' ? FOCUS_DURATION : BREAK_DURATION)
                  }}
                  className="saas-button-secondary min-h-[46px] px-5 font-semibold cursor-pointer text-sm"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* 2. Daily Goal Timer Card */}
            <div className="rounded-2xl sm:rounded-[20px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4.5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <p className="caption-text uppercase tracking-widest font-semibold text-[10px] text-[var(--accent-color)]">Goal Countdown</p>
                    <h3 className="section-title mt-0.5 text-lg sm:text-xl font-bold">
                      {isGoalTimerRunning ? 'Study Goal in Progress' : goalSecondsLeft > 0 ? 'Study Goal Paused' : 'Daily Goal Countdown'}
                    </h3>
                  </div>
                  <span className="rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-primary)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)] shrink-0">
                    {timerDurationMinutes > 0 ? `${timerDurationMinutes} min target` : `${dailyGoal} min goal`}
                  </span>
                </div>

                <div className={`my-3 sm:my-6 rounded-2xl sm:rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-primary)] p-6 sm:p-8 text-center transition-all duration-300 ${
                  showSuccessPulse ? 'ring-4 ring-[var(--accent-sage)] bg-[var(--success-bg)]' : ''
                }`}>
                  <p className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-primary)] font-mono break-all">
                    {formatTimerDisplay(goalSecondsLeft)}
                  </p>
                  <p className="text-[11px] sm:text-xs font-semibold text-[var(--text-muted)] mt-2.5 sm:mt-3 uppercase tracking-wider">
                    {isGoalTimerRunning
                      ? 'Live Goal Countdown Active'
                      : goalSecondsLeft > 0
                        ? 'Timer Paused'
                        : 'Set a goal below and click Save Goal to start'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                {goalSecondsLeft > 0 ? (
                  <>
                    <button
                      onClick={togglePauseGoalTimer}
                      className="flex-1 saas-button-primary min-h-[46px] font-bold shadow-sm cursor-pointer text-sm"
                    >
                      {isGoalTimerRunning ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={resetGoalTimer}
                      className="saas-button-secondary min-h-[46px] px-5 font-semibold cursor-pointer text-sm"
                    >
                      Reset
                    </button>
                  </>
                ) : (
                  <button
                    onClick={saveDailyGoal}
                    disabled={savingGoal}
                    className="w-full saas-button-primary min-h-[46px] font-bold shadow-sm cursor-pointer text-sm"
                  >
                    {savingGoal ? 'Starting...' : 'Start Goal Countdown'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Study Statistics & Daily Goal Settings Widget */}
          <div className="rounded-2xl sm:rounded-[20px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4.5 sm:p-6 shadow-sm space-y-5 sm:space-y-6">
            <div>
              <p className="caption-text uppercase tracking-widest font-semibold text-[10px] text-[var(--accent-color)] mb-1">Study Statistics</p>
              <div className="flex justify-between text-xs sm:text-sm font-semibold text-[var(--text-secondary)] mt-2">
                <span>Today's Progress</span>
                <span className="text-[var(--text-primary)] font-bold">{todayMinutes} / {dailyGoal} min</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-[var(--bg-primary)] overflow-hidden border border-[var(--border-main)]">
                <div
                  className={`h-full rounded-full bg-[var(--accent-color)] transition-all duration-500 ${
                    showSuccessPulse ? 'bg-[#7ED957] animate-pulse' : ''
                  }`}
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Current Streak Card with Fire Emoji */}
              <div className="rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-primary)] p-4 text-center hover:border-[var(--accent-color)]/50 transition">
                <p className="caption-text uppercase font-semibold text-[var(--text-muted)] text-[10px]">Current Streak</p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] break-words">{currentStreak} days</span>
                  {currentStreak > 0 ? (
                    <span className="inline-block text-lg sm:text-xl animate-pulse" title="Active Streak!">🔥</span>
                  ) : (
                    <span className="inline-block text-lg sm:text-xl grayscale opacity-35" title="Streak inactive">🔥</span>
                  )}
                </div>
              </div>

              {/* Best Streak Card with Vibrant Fire Emoji */}
              <div className="rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-primary)] p-4 text-center hover:border-[var(--accent-color)]/50 transition">
                <p className="caption-text uppercase font-semibold text-[var(--text-muted)] text-[10px]">Best Streak</p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] break-words">{longestStreak} days</span>
                  <span className="inline-block text-lg sm:text-xl" title="Best Streak Record">🔥</span>
                </div>
              </div>

              {/* Study Days Card */}
              <div className="rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-primary)] p-4 text-center hover:border-[var(--accent-color)]/50 transition">
                <p className="caption-text uppercase font-semibold text-[var(--text-muted)] text-[10px]">Study Days</p>
                <p className="text-xl sm:text-2xl font-bold mt-1 text-[var(--text-primary)] break-words">{totalCompletedDays}</p>
              </div>
            </div>

            <div className="rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-primary)] p-4 space-y-2">
              <label className="caption-text uppercase font-semibold text-[var(--text-muted)] text-[10px]">Set Daily Goal</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
                <div>
                  <label className="text-[11px] uppercase font-semibold text-[var(--text-muted)]">Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={hoursInput}
                    onChange={(e) => setHoursInput(e.target.value)}
                    className="saas-input w-full mt-1 min-h-[46px] px-3.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase font-semibold text-[var(--text-muted)]">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minutesInput}
                    onChange={(e) => setMinutesInput(e.target.value)}
                    className="saas-input w-full mt-1 min-h-[46px] px-3.5 text-sm"
                  />
                </div>
                <button
                  onClick={saveDailyGoal}
                  disabled={savingGoal}
                  className="saas-button-primary min-h-[46px] w-full font-bold shadow-sm cursor-pointer text-sm"
                >
                  {savingGoal ? 'Saving...' : 'Save Goal'}
                </button>
              </div>
            </div>
          </div>

          {/* Productivity Hub Tasks Widget */}
          <ProductivityHub />

          {/* LeetCode Single-Page 365-Day Contribution Heatmap Section */}
          <div className="rounded-[20px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-6 shadow-sm space-y-6">
            <div>
              <p className="caption-text uppercase tracking-widest font-semibold">Learning Consistency</p>
              <h3 className="section-title text-xl font-bold mt-1">365-Day Contribution Activity</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">
                Track your daily learning progress over the rolling year.
              </p>

              {/* Summary Stats Card with Fire Emojis */}
              <div className="rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-primary)] p-4 shadow-sm max-w-4xl">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                  <div className="p-2 border-b sm:border-b-0 sm:border-r border-[var(--border-main)]/50">
                    <p className="text-[var(--text-muted)] font-medium text-[11px]">Total Active Days</p>
                    <p className="text-base font-bold text-[var(--text-primary)] mt-0.5">{heatmapData.activeDaysCount}</p>
                  </div>

                  {/* Current Streak with Conditional Fire Emoji */}
                  <div className="p-2 border-b sm:border-b-0 sm:border-r border-[var(--border-main)]/50">
                    <p className="text-[var(--text-muted)] font-medium text-[11px]">Current Streak</p>
                    <p className="text-base font-bold text-[var(--text-primary)] mt-0.5 flex items-center gap-1">
                      <span>{currentStreak} days</span>
                      {currentStreak > 0 ? (
                        <span className="inline-block text-sm animate-pulse" title="Active Streak!">🔥</span>
                      ) : (
                        <span className="inline-block text-sm grayscale opacity-35" title="Streak inactive">🔥</span>
                      )}
                    </p>
                  </div>

                  {/* Best Streak with Always-Active Fire Emoji */}
                  <div className="p-2 border-b sm:border-b-0 md:border-r border-[var(--border-main)]/50">
                    <p className="text-[var(--text-muted)] font-medium text-[11px]">Best Streak</p>
                    <p className="text-base font-bold text-[var(--text-primary)] mt-0.5 flex items-center gap-1">
                      <span>{longestStreak} days</span>
                      <span className="inline-block text-sm" title="Best Streak Record">🔥</span>
                    </p>
                  </div>

                  <div className="p-2 border-b sm:border-b-0 sm:border-r border-[var(--border-main)]/50">
                    <p className="text-[var(--text-muted)] font-medium text-[11px]">Study Goals</p>
                    <p className="text-base font-bold text-[var(--text-primary)] mt-0.5">{heatmapData.studyGoalsCompletedCount}</p>
                  </div>
                  <div className="p-2 border-r border-[var(--border-main)]/50">
                    <p className="text-[var(--text-muted)] font-medium text-[11px]">Assessments</p>
                    <p className="text-base font-bold text-[var(--text-primary)] mt-0.5">{heatmapData.assessmentsCompletedCount}</p>
                  </div>
                  <div className="p-2">
                    <p className="text-[var(--text-muted)] font-medium text-[11px]">Practice Sessions</p>
                    <p className="text-base font-bold text-[var(--text-primary)] mt-0.5">{heatmapData.practiceSessionsCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {loadingHeatmap ? (
              <div className="flex items-center justify-center py-12 text-sm text-[var(--text-muted)] animate-pulse">
                Loading 365-day contribution history...
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {/* Single-Page Responsive Heatmap Grid Container (Fits 12 months without scrollbar on desktop/laptop) */}
                <div className="relative overflow-x-auto md:overflow-x-visible custom-scrollbar pb-3 pt-1">
                  <div className="w-full min-w-max md:min-w-0">
                    
                    {/* LeetCode Month Clusters with Month Labels at BOTTOM */}
                    <div className="flex justify-between items-end w-full gap-1.5 sm:gap-2 md:gap-3">
                      {heatmapData.monthBlocks.map((mb) => (
                        <div key={mb.key} className="flex flex-col items-center">
                          {/* Week Columns for this Month */}
                          <div className="flex gap-[2px] sm:gap-[3px]">
                            {mb.weeks.map((week, wIdx) => (
                              <div key={`w-${wIdx}`} className="flex flex-col gap-[2px] sm:gap-[3px]">
                                {week.map((dayObj, dIdx) => {
                                  if (!dayObj) {
                                    return (
                                      <div
                                        key={`empty-${wIdx}-${dIdx}`}
                                        className="w-[10px] h-[10px] sm:w-[11px] sm:h-[11px] md:w-[12px] md:h-[12px] rounded-[2px] bg-transparent"
                                      />
                                    )
                                  }

                                  const isToday = dayObj.dateKey === todayKey
                                  const cellStyle = getLevelColor(dayObj.level, isDark)

                                  return (
                                    <div
                                      key={dayObj.dateKey}
                                      onMouseEnter={() => setActiveTooltip(dayObj)}
                                      onMouseLeave={() => setActiveTooltip(null)}
                                      onClick={() => setActiveTooltip(dayObj)}
                                      className={`w-[10px] h-[10px] sm:w-[11px] sm:h-[11px] md:w-[12px] md:h-[12px] rounded-[2px] border transition-all duration-150 cursor-pointer ${cellStyle} ${
                                        isToday ? 'ring-2 ring-[var(--accent-color)] ring-offset-1 ring-offset-[var(--bg-secondary)]' : ''
                                      } hover:scale-125 hover:z-10`}
                                    />
                                  )
                                })}
                              </div>
                            ))}
                          </div>

                          {/* Month Header - Rendered at BOTTOM (LeetCode Exact Format) */}
                          <div className="text-[11px] font-semibold text-[var(--text-muted)] mt-2 text-center select-none">
                            {mb.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tooltip & Legend Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--border-main)]/60 text-xs">
                  {/* Tooltip Info */}
                  <div className="flex items-center gap-2 min-h-[24px]">
                    {activeTooltip ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--text-primary)] animate-in fade-in duration-150">
                        <span className="font-bold">
                          {activeTooltip.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span>—</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTooltip.studyGoalDone ? 'bg-[var(--success-bg)] text-[var(--success-color)]' : 'bg-[var(--bg-primary)] text-[var(--text-muted)]'}`}>
                          Study Goal {activeTooltip.studyGoalDone ? '✔' : '✘'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTooltip.assessmentDone ? 'bg-[var(--success-bg)] text-[var(--success-color)]' : 'bg-[var(--bg-primary)] text-[var(--text-muted)]'}`}>
                          Assessment {activeTooltip.assessmentDone ? '✔' : '✘'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTooltip.practiceDone ? 'bg-[var(--success-bg)] text-[var(--success-color)]' : 'bg-[var(--bg-primary)] text-[var(--text-muted)]'}`}>
                          Practice {activeTooltip.practiceDone ? '✔' : '✘'}
                        </span>
                        <span className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">
                          (Level {activeTooltip.level})
                        </span>
                      </div>
                    ) : (
                      <span className="text-[var(--text-muted)] italic">Hover or tap any square to view daily activities</span>
                    )}
                  </div>

                  {/* Level Color Legend */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] shrink-0">
                    <span>Less</span>
                    <div className="flex items-center gap-1">
                      <div className={`h-3.5 w-3.5 rounded-[2px] ${getLevelColor(0, isDark)}`} title="Level 0 - No Activity" />
                      <div className={`h-3.5 w-3.5 rounded-[2px] ${getLevelColor(1, isDark)}`} title="Level 1 - Only Study Goal" />
                      <div className={`h-3.5 w-3.5 rounded-[2px] ${getLevelColor(2, isDark)}`} title="Level 2 - Any TWO completed" />
                      <div className={`h-3.5 w-3.5 rounded-[2px] ${getLevelColor(3, isDark)}`} title="Level 3 - All THREE completed" />
                    </div>
                    <span>More</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="body-text text-[var(--text-muted)]">Loading profile...</p>
      )}
    </main>
  )
}
