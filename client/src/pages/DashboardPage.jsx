import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  // Single month in view at a time (better for mobile) with prev/next
  // navigation and swipe support, instead of rendering all 12 months at once.
  const now = new Date()
  const [viewedMonth, setViewedMonth] = useState({ year: now.getFullYear(), monthIndex: now.getMonth() })
  const touchStartXRef = useRef(null)

  const goToPrevMonth = useCallback(() => {
    setViewedMonth((prev) => {
      const monthIndex = prev.monthIndex === 0 ? 11 : prev.monthIndex - 1
      const year = prev.monthIndex === 0 ? prev.year - 1 : prev.year
      return { year, monthIndex }
    })
  }, [])

  const goToNextMonth = useCallback(() => {
    setViewedMonth((prev) => {
      const monthIndex = prev.monthIndex === 11 ? 0 : prev.monthIndex + 1
      const year = prev.monthIndex === 11 ? prev.year + 1 : prev.year
      return { year, monthIndex }
    })
  }, [])

  const handleCalendarTouchStart = (event) => {
    touchStartXRef.current = event.touches[0].clientX
  }

  const handleCalendarTouchEnd = (event) => {
    if (touchStartXRef.current === null) return
    const deltaX = event.changedTouches[0].clientX - touchStartXRef.current
    const SWIPE_THRESHOLD = 50
    if (deltaX > SWIPE_THRESHOLD) goToPrevMonth()
    else if (deltaX < -SWIPE_THRESHOLD) goToNextMonth()
    touchStartXRef.current = null
  }

  const viewedMonthData = useMemo(() => {
    const { year, monthIndex } = viewedMonth
    const firstDay = new Date(year, monthIndex, 1).getDay()
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    const dayCells = []

    for (let i = 0; i < firstDay; i += 1) dayCells.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) dayCells.push(day)

    return { year, monthIndex, name: monthNames[monthIndex], dayCells }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedMonth])

  const isCurrentMonth = viewedMonth.year === now.getFullYear() && viewedMonth.monthIndex === now.getMonth()

  const today = new Date()
  const todayLabel = today.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  return (
    <main className="mx-auto max-w-6xl px-4 pb-6 pt-6 sm:px-6 lg:pt-10">
      {/* Greeting header — mirrors the reference design's "Hi, Kathryn" header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-400">{todayLabel}</p>
          <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
            Hi, {profile ? profile.name?.split(' ')[0] : '...'}
          </h1>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-lg font-semibold text-white shadow-soft">
          {profile?.name?.[0]?.toUpperCase() || 'U'}
        </span>
      </div>

      {/* Search bar */}
      <label className="mb-5 flex items-center gap-3 rounded-2xl border border-ink-200 bg-white px-4 py-3.5 shadow-soft">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-ink-400" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Search topics, roadmaps, questions..."
          className="w-full bg-transparent text-sm text-ink-700 outline-none placeholder:text-ink-400"
        />
      </label>

      {/* Hero banner CTA */}
      <div className="mb-6 grid gap-4 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-brand-100 via-brand-50 to-white p-6 shadow-soft sm:grid-cols-[1.3fr_1fr] sm:items-center sm:p-8">
        <div>
          <h2 className="font-display text-xl font-semibold leading-snug text-brand-900 sm:text-2xl">
            What would you like to learn today?
          </h2>
          <a
            href="/assessment"
            className="mt-4 inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-soft transition hover:bg-brand-50"
          >
            Get started
          </a>
        </div>
        <div className="hidden justify-self-end sm:block">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/70 text-5xl">🎓</span>
        </div>
      </div>

      {error && <p className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {profile ? (
        <div className="space-y-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">For you</h2>
            <a href="/roadmap" className="text-sm font-medium text-brand-600">See all</a>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[1.5rem] bg-gradient-to-br from-leaf-500 to-leaf-600 p-6 text-white shadow-soft">
              <p className="text-xs uppercase tracking-[0.2em] text-leaf-50/90">Your profile</p>
              <h3 className="mt-2 text-xl font-semibold">{profile.role}</h3>
              <p className="mt-2 text-sm text-leaf-50/90">Learning style: {profile.learningStyle}</p>
              <p className="mt-4 text-xs text-leaf-50/80">{profile.educationLevel || 'Education level not specified'}</p>
            </div>

            <div className="rounded-[1.5rem] border border-ink-200 bg-white p-6 shadow-soft">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Preferred subjects</p>
              <p className="mt-3 text-base font-semibold text-ink-900">{profile.interestedSubjects?.join(', ') || 'None yet'}</p>
              <a href="/assessment" className="mt-4 inline-flex text-sm font-medium text-brand-600">Take an assessment →</a>
            </div>

            <div className="rounded-[1.5rem] border border-ink-200 bg-white p-6 shadow-soft">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Career interests</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.careerInterests?.length ? profile.careerInterests.map((interest) => (
                  <span key={interest} className="rounded-full bg-ink-50 px-3 py-1 text-xs font-medium text-ink-700">{interest}</span>
                )) : <span className="text-sm text-ink-500">None specified yet.</span>}
              </div>
            </div>
          </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.75rem] border border-ink-200 bg-white p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-ink-500">Pomodoro timer</p>
                    <h3 className="mt-2 text-2xl font-semibold text-ink-900">
                      {mode === 'focus' ? 'Focus' : 'Break'}
                    </h3>
                  </div>
                  <div className="rounded-full bg-ink-50 px-3 py-1 text-sm text-ink-600">
                    {mode === 'focus' ? '25 min' : '5 min'}
                  </div>
                </div>
                <div className="mt-6 rounded-3xl bg-ink-50 p-6 text-center">
                  <p className="text-6xl font-semibold text-ink-900">{String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}</p>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setIsRunning((prev) => !prev)}
                    className="rounded-2xl bg-brand-500 px-5 py-3 font-medium text-white transition hover:bg-brand-600"
                  >
                    {isRunning ? 'Pause' : 'Start'}
                  </button>
                  <button
                    onClick={() => {
                      setIsRunning(false)
                      setSecondsLeft(mode === 'focus' ? FOCUS_DURATION : BREAK_DURATION)
                    }}
                    className="rounded-2xl border border-ink-200 bg-ink-50 px-5 py-3 font-medium text-ink-700 transition hover:bg-white"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-ink-200 bg-white p-8">
                <p className="text-sm uppercase tracking-[0.2em] text-ink-500">Study statistics</p>
                <div className="mt-6 space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-ink-600">
                      <span>Today's Study</span>
                      <span>{todayMinutes} / {dailyGoal} min</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-ink-50">
                      <div className="h-2 rounded-full bg-brand-500" style={{ width: `${progressWidth}%` }} />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-3xl bg-ink-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Current streak</p>
                      <p className="mt-2 text-2xl font-semibold text-ink-900">{currentStreak}</p>
                    </div>
                    <div className="rounded-3xl bg-ink-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Longest streak</p>
                      <p className="mt-2 text-2xl font-semibold text-ink-900">{longestStreak}</p>
                    </div>
                    <div className="rounded-3xl bg-ink-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Study days</p>
                      <p className="mt-2 text-2xl font-semibold text-ink-900">{totalCompletedDays}</p>
                    </div>
                  </div>
                  <div className="rounded-3xl bg-ink-50 p-4">
                    <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Daily goal</label>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.2em] text-ink-400">Hours</label>
                        <input
                          type="number"
                          min="0"
                          value={hoursInput}
                          onChange={(e) => setHoursInput(e.target.value)}
                          className="mt-1 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.2em] text-ink-400">Minutes</label>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={minutesInput}
                          onChange={(e) => setMinutesInput(e.target.value)}
                          className="mt-1 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 outline-none"
                        />
                      </div>
                      <button
                        onClick={saveDailyGoal}
                        disabled={savingGoal}
                        className="mt-6 rounded-2xl bg-brand-500 px-4 py-3 font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
                      >
                        {savingGoal ? 'Saving' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-ink-200 bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-ink-500">Study calendar</p>
                  <h3 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-ink-900">
                    🔥 {currentStreak || 0}-day streak
                  </h3>
                </div>
                <span className="rounded-full bg-ink-50 px-3 py-1 text-sm text-ink-600">{totalCompletedDays} completed days total</span>
              </div>

              {/* Month navigation */}
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPrevMonth}
                  aria-label="Previous month"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-ink-600 transition hover:border-brand-400 hover:text-brand-600"
                >
                  ‹
                </button>
                <p className="text-base font-semibold text-ink-900">
                  {viewedMonthData.name} {viewedMonthData.year}
                  {isCurrentMonth && <span className="ml-2 rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-600">This month</span>}
                </p>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  aria-label="Next month"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-ink-600 transition hover:border-brand-400 hover:text-brand-600"
                >
                  ›
                </button>
              </div>

              {/* Swipeable single-month grid — swipe left/right on mobile, arrows on desktop */}
              <div
                className="mt-4 touch-pan-y select-none"
                onTouchStart={handleCalendarTouchStart}
                onTouchEnd={handleCalendarTouchEnd}
              >
                <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-ink-400">
                  {weekdayLabels.map((label, i) => <span key={`${label}-${i}`}>{label}</span>)}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-1.5">
                  {viewedMonthData.dayCells.map((day, index) => {
                    const cellDate = day
                      ? `${viewedMonthData.year}-${String(viewedMonthData.monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      : ''
                    const isCompleted = day && getMinutesForDate(normalizedSessions, cellDate) >= dailyGoal
                    const isToday = day && cellDate === todayKey

                    return (
                      <div
                        key={`day-${index}`}
                        className={`flex aspect-square items-center justify-center rounded-xl text-xs font-medium ${day
                          ? isCompleted
                            ? 'bg-brand-500 text-white'
                            : isToday
                              ? 'border-2 border-brand-400 text-ink-800'
                              : 'bg-ink-50 text-ink-500'
                          : 'bg-transparent'
                          }`}
                      >
                        {day || ''}
                      </div>
                    )
                  })}
                </div>
                <p className="mt-3 text-center text-xs text-ink-400 sm:hidden">Swipe left or right to change month</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-ink-500">Loading profile...</p>
        )}
    </main>
  )
}
