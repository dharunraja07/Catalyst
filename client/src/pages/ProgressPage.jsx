import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function buildStreakMetrics(entries = []) {
  const relevant = entries
    .filter((entry) => entry && Number(entry.minutes || 0) > 0)
    .map((entry) => ({ date: entry.date?.slice(0, 10), minutes: Number(entry.minutes || 0) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const dailyMap = new Map(relevant.map((entry) => [entry.date, entry.minutes]))
  const sortedDates = Array.from(dailyMap.keys()).sort()

  let longest = 0
  let current = 0
  let temp = 0
  let previous = null

  for (const date of sortedDates) {
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

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  let cursor = new Date(today)
  let cursorKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`

  while (dailyMap.has(cursorKey)) {
    current += 1
    cursor.setDate(cursor.getDate() - 1)
    cursorKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
  }

  return { currentStreak: current, longestStreak: longest, totalActiveDays: sortedDates.length }
}

export default function ProgressPage() {
  const { api } = useAuth()
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    async function loadProgress() {
      try {
        const response = await api.get('/progress')
        setProgress(response.data)
      } catch (err) {
        setError('Unable to load progress data')
      }
    }
    loadProgress()
  }, [api])

  const streakMetrics = useMemo(() => progress?.streak || { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 }, [progress])
  const recentHistory = useMemo(() => {
    const items = Array.isArray(progress?.scoreHistory) ? [...progress.scoreHistory] : []
    return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
  }, [progress])
  const olderHistory = useMemo(() => {
    const items = Array.isArray(progress?.scoreHistory) ? [...progress.scoreHistory] : []
    return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(5)
  }, [progress])

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-[2rem] border border-ink-200 bg-white p-8 shadow-glow">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-brand-600/80">Progress</p>
            <h1 className="text-3xl font-semibold text-ink-900">Track your growth</h1>
          </div>
          <p className="text-sm text-ink-500">See recent scores and completed topics in one place.</p>
        </div>

        {error && <p className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {progress ? (
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[1.75rem] border border-ink-200 bg-ink-50 p-6">
              <h2 className="text-xl font-semibold text-ink-900">Completed topics</h2>
              <div className="mt-4 space-y-3">
                {progress.completedTopics.length ? progress.completedTopics.map((topic) => (
                  <div key={topic} className="rounded-3xl bg-white px-4 py-3 text-ink-700">{topic}</div>
                )) : <div className="rounded-3xl bg-white px-4 py-3 text-ink-500">No topics completed yet.</div>}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-ink-200 bg-ink-50 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-ink-900">Score history</h2>
                <div className="rounded-full bg-white px-3 py-1 text-xs text-ink-500">
                  {streakMetrics.totalActiveDays} active days
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-white p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-ink-400">Current streak</p>
                  <p className="mt-2 text-2xl font-semibold text-ink-900">{streakMetrics.currentStreak}</p>
                </div>
                <div className="rounded-3xl bg-white p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-ink-400">Max streak</p>
                  <p className="mt-2 text-2xl font-semibold text-ink-900">{streakMetrics.longestStreak}</p>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {recentHistory.length ? recentHistory.map((item) => (
                  <div key={item.date} className="space-y-3 rounded-3xl bg-white p-4">
                    <div className="flex items-center justify-between text-sm text-ink-400">
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                      <span>{item.score}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full rounded-full bg-brand-400" style={{ width: `${item.score}%` }} />
                    </div>
                  </div>
                )) : <p className="text-ink-500">No score history yet.</p>}
                {olderHistory.length > 0 && (
                  <div>
                    <button type="button" onClick={() => setShowAll((value) => !value)} className="text-sm font-semibold text-brand-600">
                      {showAll ? 'Hide earlier results' : 'Show more'}
                    </button>
                    {showAll && (
                      <div className="mt-4 space-y-4">
                        {olderHistory.map((item) => (
                          <div key={item.date} className="space-y-3 rounded-3xl bg-white p-4">
                            <div className="flex items-center justify-between text-sm text-ink-400">
                              <span>{new Date(item.date).toLocaleDateString()}</span>
                              <span>{item.score}%</span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-ink-100">
                              <div className="h-full rounded-full bg-brand-400" style={{ width: `${item.score}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-ink-500">Loading progress...</p>
        )}
      </div>
    </main>
  )
}
