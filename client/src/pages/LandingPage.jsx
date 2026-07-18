import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import ReminderPopup from '../components/ReminderPopup.jsx'

export default function LandingPage() {
  const { user, api } = useAuth()
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [reminderMinutes, setReminderMinutes] = useState('')
  const [notice, setNotice] = useState('')
  const [activeReminder, setActiveReminder] = useState(null)
  const remindedIds = useRef(new Set())

  const fetchTasks = async () => {
    try {
      const response = await api.get('/todos')
      setTasks(response.data)
    } catch (err) {
      setTasks([])
    }
  }

  useEffect(() => {
    if (!user) return undefined
    fetchTasks()

    const timer = window.setInterval(() => {
      const now = Date.now()
      const dueTask = tasks.find(
        (task) => task.status === 'pending' && task.reminderTime && new Date(task.reminderTime).getTime() <= now && !remindedIds.current.has(task._id)
      )

      if (dueTask) {
        remindedIds.current.add(dueTask._id)
        setActiveReminder(dueTask)
        setNotice(`Reminder: ${dueTask.title}`)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Study reminder', { body: dueTask.title })
        }
      }
    }, 15000)

    return () => window.clearInterval(timer)
  }, [user, tasks, api])

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission === 'denied') return
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  const addTask = async (event) => {
    event.preventDefault()
    if (!newTask.trim()) return

    try {
      const payload = {
        title: newTask.trim(),
        reminderTime: reminderMinutes && Number(reminderMinutes) > 0
          ? new Date(Date.now() + Number(reminderMinutes) * 60000).toISOString()
          : null
      }
      await api.post('/todos', payload)
      setNewTask('')
      setReminderMinutes('')
      await fetchTasks()
    } catch (err) {
      setNotice('Unable to add task')
    }
  }

  const toggleTask = async (taskId, nextStatus) => {
    try {
      await api.patch(`/todos/${taskId}`, { status: nextStatus })
      await fetchTasks()
    } catch (err) {
      setNotice('Unable to update task')
    }
  }

  const deleteTask = async (taskId) => {
    try {
      await api.delete(`/todos/${taskId}`)
      await fetchTasks()
    } catch (err) {
      setNotice('Unable to delete task')
    }
  }

  const dismissReminder = async (task) => {
    remindedIds.current.add(task._id)
    setActiveReminder(null)
  }

  const snoozeReminder = async (task) => {
    const nextTime = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    try {
      await api.patch(`/todos/${task._id}`, { reminderTime: nextTime })
      remindedIds.current.add(task._id)
      setActiveReminder(null)
      await fetchTasks()
    } catch (err) {
      setNotice('Unable to snooze reminder')
    }
  }

  const pendingTasks = tasks.filter((task) => task.status === 'pending')
  const completedTasks = tasks.filter((task) => task.status === 'completed')

  if (user) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <section className="overflow-hidden rounded-[2rem] border border-ink-200 bg-white p-8 shadow-glow">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-brand-600/80">Welcome back</p>
              <h1 className="mt-2 text-3xl font-semibold text-ink-900">{user.name}</h1>
            </div>
            <p className="text-sm text-ink-500">Today is your productivity hub</p>
          </div>

          {notice && (
            <div className="mt-6 rounded-2xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-brand-700">
              {notice}
            </div>
          )}

          <ReminderPopup reminder={activeReminder} onDismiss={dismissReminder} onSnooze={snoozeReminder} />

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-[1.75rem] border border-ink-200 bg-ink-50 p-6">
              <h2 className="text-lg font-semibold text-ink-900">To Dos</h2>
              <form onSubmit={addTask} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={newTask}
                  onChange={(event) => setNewTask(event.target.value)}
                  placeholder="Add a task"
                  className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 outline-none"
                />
                <input
                  type="number"
                  min="0"
                  value={reminderMinutes}
                  onChange={(event) => setReminderMinutes(event.target.value)}
                  placeholder="Remind in min"
                  className="w-40 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 outline-none"
                />
                <button type="submit" className="rounded-2xl bg-brand-500 px-5 py-3 font-medium text-white">Add</button>
              </form>
              <div className="mt-4 space-y-3">
                {pendingTasks.length ? pendingTasks.map((task) => (
                  <div key={task._id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                    <div>
                      <p className="text-ink-800">{task.title}</p>
                      {task.reminderTime && (
                        <p className="text-xs text-ink-500">Reminder: {new Date(task.reminderTime).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleTask(task._id, 'completed')} className="rounded-xl bg-brand-500 px-3 py-2 text-sm text-white">Done</button>
                      <button onClick={() => deleteTask(task._id)} className="rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-700">Delete</button>
                    </div>
                  </div>
                )) : <p className="rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-500">No to dos</p>}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-ink-200 bg-ink-50 p-6">
              <h2 className="text-lg font-semibold text-ink-900">Completed Tasks</h2>
              <div className="mt-4 space-y-3">
                {completedTasks.length ? completedTasks.map((task) => (
                  <div key={task._id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                    <p className="text-ink-600 line-through">{task.title}</p>
                    <button onClick={() => deleteTask(task._id)} className="rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-700">Delete</button>
                  </div>
                )) : <p className="rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-500">No completed tasks</p>}
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6">
      <section className="overflow-hidden rounded-[2rem] border border-ink-200 bg-white px-6 py-10 shadow-glow sm:px-12 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-600">AI-powered learning for every career path</p>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink-900 sm:text-5xl lg:text-6xl">Personalized learning, assessment, and career guidance in one platform.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-600">Diagnose strengths, uncover gaps, and follow a tailored roadmap that matches your goals. Built for students, teachers, and career builders.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/register" className="inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600">Get started</Link>
              <Link to="/login" className="inline-flex items-center justify-center rounded-full border border-ink-300 bg-ink-50 px-6 py-3 text-sm text-ink-800 transition hover:border-ink-300">Sign in</Link>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-3xl border border-ink-200 bg-ink-50 p-6 shadow-xl shadow-brand-500/10">
              <p className="text-sm uppercase tracking-[0.24em] text-brand-600/80">Start smarter</p>
              <p className="mt-3 text-2xl font-semibold text-ink-900">Adaptive assessments</p>
              <p className="mt-3 text-ink-500">Instant insights into your current level and the exact topics to strengthen first.</p>
            </div>
            <div className="rounded-3xl border border-ink-200 bg-ink-50 p-6 shadow-xl shadow-brand-500/10">
              <p className="text-sm uppercase tracking-[0.24em] text-brand-600/80">Plan your path</p>
              <p className="mt-3 text-2xl font-semibold text-ink-900">Roadmaps that evolve</p>
              <p className="mt-3 text-ink-500">From study sessions to career moves, keep your progress aligned with your goals.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-ink-200 bg-white p-8 shadow-xl shadow-ink-900/10">
          <h2 className="text-xl font-semibold text-ink-900">Assess Knowledge</h2>
          <p className="mt-4 text-ink-500">Take a diagnostic test to identify strengths, knowledge gaps, and personalized learning targets.</p>
        </div>
        <div className="rounded-[2rem] border border-ink-200 bg-white p-8 shadow-xl shadow-ink-900/10">
          <h2 className="text-xl font-semibold text-ink-900">Personalized Roadmap</h2>
          <p className="mt-4 text-ink-500">Get a roadmap built from your assessment results, interests, and career plans.</p>
        </div>
        <div className="rounded-[2rem] border border-ink-200 bg-white p-8 shadow-xl shadow-ink-900/10">
          <h2 className="text-xl font-semibold text-ink-900">Track Progress</h2>
          <p className="mt-4 text-ink-500">Monitor scores, completed topics, and exam readiness in one clean dashboard.</p>
        </div>
      </section>
    </main>
  )
}
