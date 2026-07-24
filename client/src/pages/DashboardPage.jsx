import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const FOCUS_DURATION = 25 * 60
const BREAK_DURATION = 5 * 60

function formatDateKey(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().split('T')[0]
}

function normalizeStudySessions(sessions) {
  const map = new Map()

  sessions.forEach((entry) => {
    const date = entry?.date
    const minutes = Number(entry?.minutes || 0)

    if (!date || !Number.isFinite(minutes)) return

    const key = date.slice(0, 10)
    map.set(key, (map.get(key) || 0) + minutes)
  })

  return Array.from(map.entries())
    .filter(([, minutes]) => minutes > 0)
    .map(([date, minutes]) => ({ date, minutes }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function getMinutesForDate(sessions, date) {
  return sessions.find((entry) => entry.date === date)?.minutes || 0
}

function getGoalParts(totalMinutes) {
  const safeMinutes = Math.max(0, Number(totalMinutes) || 0)
  return {
    hours: Math.floor(safeMinutes / 60),
    minutes: safeMinutes % 60
  }
}

function computeStreakMetrics(sessions, goal) {
  const completed = new Set(
    sessions
      .filter((entry) => entry.minutes >= goal && entry.date)
      .map((entry) => entry.date)
  )

  const completedDates = [...completed].sort()

  let longest = 0
  let temp = 0
  let previous = null

  for (const date of completedDates) {
    if (!previous) {
      temp = 1
    } else {
      const prevDate = new Date(`${previous}T00:00:00`)
      const nextDate = new Date(`${date}T00:00:00`)
      const diff = Math.round((nextDate - prevDate) / (1000 * 60 * 60 * 24))
      temp = diff === 1 ? temp + 1 : 1
    }

    previous = date
    longest = Math.max(longest, temp)
  }

  let current = 0
  let cursor = new Date()
  while (completed.has(formatDateKey(cursor))) {
    current += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return {
    currentStreak: current,
    longestStreak: longest,
    totalCompletedDays: completedDates.length
  }
}

export default function DashboardPage() {
  const { api } = useAuth()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  const [hoursInput, setHoursInput] = useState('1')
  const [minutesInput, setMinutesInput] = useState('0')
  const [savingGoal, setSavingGoal] = useState(false)

  const [mode, setMode] = useState('focus')
  const [isRunning, setIsRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_DURATION)

  const addStudySession = useCallback(async (minutesToAdd) => {
    if (!profile || !minutesToAdd) return

    const nextSessions = normalizeStudySessions([
      ...(profile.studySessions || []),
      { date: formatDateKey(new Date()), minutes: minutesToAdd }
    ])

    try {
      const response = await api.put('/auth/profile', { studySessions: nextSessions })
      setProfile(response.data)
    } catch (err) {
      setError('Unable to save study session')
    }
  }, [api, profile])

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
    if (!isRunning) return undefined

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer)
          setIsRunning(false)

          if (mode === 'focus') {
            const completedMinutes = FOCUS_DURATION / 60
            setMode('break')
            setSecondsLeft(BREAK_DURATION)
            addStudySession(completedMinutes)
          } else {
            setMode('focus')
            setSecondsLeft(FOCUS_DURATION)
          }
          return 0
        }

        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isRunning, mode, addStudySession])

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
    } catch (err) {
      setError('Unable to update daily goal')
    } finally {
      setSavingGoal(false)
    }
  }

  const normalizedSessions = useMemo(
    () => normalizeStudySessions(profile?.studySessions || []),
    [profile]
  )

  const todayKey = formatDateKey(new Date())
  const dailyGoal = Math.max(1, Number(profile?.dailyGoalMinutes || 60))
  const todayMinutes = getMinutesForDate(normalizedSessions, todayKey)
  const progressWidth = Math.min(100, Math.round((todayMinutes / dailyGoal) * 100))

  const { currentStreak, longestStreak, totalCompletedDays } = useMemo(
    () => computeStreakMetrics(normalizedSessions, dailyGoal),
    [normalizedSessions, dailyGoal]
  )

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const thisYear = new Date().getFullYear()
  const yearMonthData = Array.from({ length: 12 }, (_, monthIndex) => {
    const firstDay = new Date(thisYear, monthIndex, 1).getDay()
    const daysInMonth = new Date(thisYear, monthIndex + 1, 0).getDate()
    const dayCells = []

    for (let i = 0; i < firstDay; i += 1) {
      dayCells.push(null)
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      dayCells.push(day)
    }

    return {
      monthIndex,
      name: monthNames[monthIndex],
      dayCells
    }
  })

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      <div className="saas-card shadow-glow">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--divider-main)] pb-6">
          <div>
            <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold mb-1">Dashboard</p>
            <h1 className="page-title">Student overview</h1>
          </div>
          <span className="inline-flex items-center min-h-[44px] rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)]">Welcome back</span>
        </div>

        {error && <p className="mb-6 rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{error}</p>}

        {profile ? (
          <div className="space-y-8">
            {/* Hero Welcome Banner */}
            <div className="saas-elevated-card">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h2 className="section-title">Hello, {profile.name} 👋</h2>
                  <p className="body-text mt-2 max-w-2xl">Track your learning progress, see your strengths, and stay ahead with personalized recommendations.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-3 min-w-[130px]">
                    <p className="caption-text uppercase tracking-[0.2em]">Role</p>
                    <p className="card-title mt-1 font-semibold">{profile.role}</p>
                  </div>
                  <div className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-3 min-w-[130px]">
                    <p className="caption-text uppercase tracking-[0.2em]">Learning style</p>
                    <p className="card-title mt-1 font-semibold">{profile.learningStyle}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 12-Column Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Pomodoro Timer (lg:col-span-5) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="saas-elevated-card flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="caption-text uppercase tracking-[0.2em]">Pomodoro timer</p>
                        <h3 className="section-title mt-1">
                          {mode === 'focus' ? 'Focus Session' : 'Rest Break'}
                        </h3>
                      </div>
                      <span className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                        {mode === 'focus' ? '25 min' : '5 min'}
                      </span>
                    </div>

                    <div className="my-6 rounded-[20px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-8 text-center">
                      <p className="text-6xl font-bold tracking-tight text-[var(--text-primary)] font-mono">{String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsRunning((prev) => !prev)}
                      className="flex-1 saas-button-primary"
                    >
                      {isRunning ? 'Pause' : 'Start Focus'}
                    </button>
                    <button
                      onClick={() => {
                        setIsRunning(false)
                        setSecondsLeft(mode === 'focus' ? FOCUS_DURATION : BREAK_DURATION)
                      }}
                      className="saas-button-secondary"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Profile Overview & Daily Goal (lg:col-span-7) */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="saas-elevated-card">
                    <h3 className="card-title">Education</h3>
                    <p className="body-text mt-2">{profile.educationLevel || 'Not specified'}</p>
                  </div>
                  <div className="saas-elevated-card">
                    <h3 className="card-title">Preferred subjects</h3>
                    <p className="body-text mt-2">{profile.interestedSubjects?.join(', ') || 'None'}</p>
                  </div>
                </div>

                <div className="saas-elevated-card">
                  <h3 className="card-title">Career goals</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.careerInterests?.length ? profile.careerInterests.map((interest) => (
                      <span key={interest} className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]">{interest}</span>
                    )) : <span className="text-sm text-[var(--text-muted)]">None specified yet.</span>}
                  </div>
                </div>

                <div className="saas-elevated-card space-y-4">
                  <p className="caption-text uppercase tracking-[0.2em]">Study statistics</p>

                  <div>
                    <div className="flex justify-between text-sm font-medium text-[var(--text-secondary)]">
                      <span>Today's Progress</span>
                      <span>{todayMinutes} / {dailyGoal} min</span>
                    </div>
                    <div className="mt-2 h-3 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--border-main)]">
                      <div className="h-full rounded-full bg-[var(--accent-color)] transition-all duration-300" style={{ width: `${progressWidth}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-3 text-center">
                      <p className="caption-text uppercase">Current streak</p>
                      <p className="text-xl font-bold mt-1 text-[var(--text-primary)]">{currentStreak}</p>
                    </div>
                    <div className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-3 text-center">
                      <p className="caption-text uppercase">Best streak</p>
                      <p className="text-xl font-bold mt-1 text-[var(--text-primary)]">{longestStreak}</p>
                    </div>
                    <div className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-3 text-center">
                      <p className="caption-text uppercase">Study days</p>
                      <p className="text-xl font-bold mt-1 text-[var(--text-primary)]">{totalCompletedDays}</p>
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4">
                    <label className="caption-text uppercase">Daily goal</label>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="text-[10px] uppercase text-[var(--text-muted)]">Hours</label>
                        <input
                          type="number"
                          min="0"
                          value={hoursInput}
                          onChange={(e) => setHoursInput(e.target.value)}
                          className="saas-input w-full mt-1 min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-[var(--text-muted)]">Minutes</label>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={minutesInput}
                          onChange={(e) => setMinutesInput(e.target.value)}
                          className="saas-input w-full mt-1 min-h-[44px]"
                        />
                      </div>
                      <button
                        onClick={saveDailyGoal}
                        disabled={savingGoal}
                        className="saas-button-primary min-h-[44px] w-full"
                      >
                        {savingGoal ? 'Saving' : 'Save Goal'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: 12-Month Calendar Grid */}
            <div className="saas-elevated-card">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                <div>
                  <p className="caption-text uppercase tracking-[0.2em]">Yearly streak</p>
                  <h3 className="section-title mt-1">{thisYear} study calendar</h3>
                </div>
                <span className="inline-flex items-center rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]">{totalCompletedDays} completed days</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {yearMonthData.map((month) => {
                  const completedDays = new Set(
                    normalizedSessions
                      .filter((entry) => entry.minutes >= dailyGoal)
                      .map((entry) => entry.date)
                  )

                  return (
                    <div key={month.name} className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-3">
                      <p className="mb-2 text-xs font-semibold text-[var(--text-primary)]">{month.name}</p>
                      <div className="grid grid-cols-7 gap-1">
                        {month.dayCells.map((day, index) => {
                          const cellDate = day
                            ? `${thisYear}-${String(month.monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                            : ''
                          const isCompleted = day && completedDays.has(cellDate)
                          const isToday = day && cellDate === todayKey

                          return (
                            <div
                              key={`${month.name}-${index}`}
                              className={`flex aspect-square items-center justify-center rounded-[4px] text-[9px] ${day
                                ? isCompleted
                                  ? 'bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold'
                                  : isToday
                                    ? 'bg-[var(--bg-elevated)] border border-[var(--border-main)] text-[var(--text-primary)] font-semibold'
                                    : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                                : 'bg-transparent'
                                }`}
                            >
                              {day || ''}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <p className="body-text">Loading profile...</p>
        )}
      </div>
    </main>
  )
}
