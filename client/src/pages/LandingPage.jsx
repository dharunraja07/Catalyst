import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function LandingPage() {
  const { user, api } = useAuth()
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [reminderMinutes, setReminderMinutes] = useState('')
  const [notice, setNotice] = useState('')
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
        setNotice(`You still have a pending task: ${dueTask.title}`)
      }
    }, 10000)

    return () => window.clearInterval(timer)
  }, [user, tasks, api])

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

  const pendingTasks = tasks.filter((task) => task.status === 'pending')
  const completedTasks = tasks.filter((task) => task.status === 'completed')

  if (user) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-8 shadow-glow">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--accent-color)]">Welcome back</p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{user.name}</h1>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">Today is your productivity hub</p>
          </div>

          {notice && (
            <div className="mt-6 rounded-2xl border border-[var(--accent-color)]/30 bg-[var(--accent-light)] px-4 py-3 text-sm text-[var(--text-primary)]">
              {notice}
            </div>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-[1.75rem] border border-[var(--border-main)] bg-[var(--bg-elevated)] p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Pending Tasks</h2>
              <form onSubmit={addTask} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={newTask}
                  onChange={(event) => setNewTask(event.target.value)}
                  placeholder="Add a task"
                  className="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
                />
                <input
                  type="number"
                  min="0"
                  value={reminderMinutes}
                  onChange={(event) => setReminderMinutes(event.target.value)}
                  placeholder="Remind in min"
                  className="w-40 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
                />
                <button type="submit" className="rounded-2xl bg-[var(--accent-color)] px-5 py-3 font-medium text-[var(--accent-contrast-text)] transition hover:bg-[var(--accent-hover)]">Add</button>
              </form>
              <div className="mt-4 space-y-3">
                {pendingTasks.length ? pendingTasks.map((task) => (
                  <div key={task._id} className="flex items-center justify-between rounded-2xl bg-[var(--bg-secondary)] px-4 py-3 border border-[var(--border-main)]">
                    <div>
                      <p className="text-[var(--text-primary)]">{task.title}</p>
                      {task.reminderTime && (
                        <p className="text-xs text-[var(--text-muted)]">Reminder: {new Date(task.reminderTime).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleTask(task._id, 'completed')} className="rounded-xl bg-[var(--accent-color)] px-3 py-2 text-sm text-[var(--accent-contrast-text)] transition hover:bg-[var(--accent-hover)]">Done</button>
                      <button onClick={() => deleteTask(task._id)} className="rounded-xl border border-[var(--border-main)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:border-[var(--error-color)] hover:text-[var(--error-color)]">Delete</button>
                    </div>
                  </div>
                )) : <p className="rounded-2xl bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-muted)]">No pending tasks</p>}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-[var(--border-main)] bg-[var(--bg-elevated)] p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Completed Tasks</h2>
              <div className="mt-4 space-y-3">
                {completedTasks.length ? completedTasks.map((task) => (
                  <div key={task._id} className="flex items-center justify-between rounded-2xl bg-[var(--bg-secondary)] px-4 py-3 border border-[var(--border-main)]">
                    <p className="text-[var(--text-muted)] line-through">{task.title}</p>
                    <button onClick={() => deleteTask(task._id)} className="rounded-xl border border-[var(--border-main)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:border-[var(--error-color)] hover:text-[var(--error-color)]">Delete</button>
                  </div>
                )) : <p className="rounded-2xl bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-muted)]">No completed tasks</p>}
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6">
      <section className="overflow-hidden rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] px-6 py-10 shadow-glow sm:px-12 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-[var(--accent-light)] px-4 py-2 text-sm font-semibold text-[var(--accent-color)]">AI-powered learning for every career path</p>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">Personalized learning, assessment, and career guidance in one platform.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">Diagnose strengths, uncover gaps, and follow a tailored roadmap that matches your goals. Built for students, teachers, and career builders.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/register" className="inline-flex items-center justify-center rounded-full bg-[var(--accent-color)] px-6 py-3 text-sm font-semibold text-[var(--accent-contrast-text)] transition hover:bg-[var(--accent-hover)]">Get started</Link>
              <Link to="/login" className="inline-flex items-center justify-center rounded-full border border-[var(--border-main)] bg-[var(--bg-elevated)] px-6 py-3 text-sm text-[var(--text-primary)] transition hover:border-[var(--accent-color)]">Sign in</Link>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-elevated)] p-6 shadow-glow">
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--accent-color)]">Start smarter</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Adaptive assessments</p>
              <p className="mt-3 text-[var(--text-secondary)]">Instant insights into your current level and the exact topics to strengthen first.</p>
            </div>
            <div className="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-elevated)] p-6 shadow-glow">
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--accent-color)]">Plan your path</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Roadmaps that evolve</p>
              <p className="mt-3 text-[var(--text-secondary)]">From study sessions to career moves, keep your progress aligned with your goals.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-8 shadow-glow">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Assess Knowledge</h2>
          <p className="mt-4 text-[var(--text-secondary)]">Take a diagnostic test to identify strengths, knowledge gaps, and personalized learning targets.</p>
        </div>
        <div className="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-8 shadow-glow">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Personalized Roadmap</h2>
          <p className="mt-4 text-[var(--text-secondary)]">Get a roadmap built from your assessment results, interests, and career plans.</p>
        </div>
        <div className="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-surface)] p-8 shadow-glow">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Track Progress</h2>
          <p className="mt-4 text-[var(--text-secondary)]">Monitor scores, completed topics, and exam readiness in one clean dashboard.</p>
        </div>
      </section>
    </main>
  )
}
