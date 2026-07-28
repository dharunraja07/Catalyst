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
    if (!user) return
    fetchTasks()
  }, [user, api])

  useEffect(() => {
    if (!user) return
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
  }, [user, tasks])

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

  const scrollToFeatures = (e) => {
    e.preventDefault()
    const elem = document.getElementById('core-features')
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-16">
      {/* Optional Logged In User Productivity Hub */}
      {user && (
        <section className="saas-card shadow-glow">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--divider-main)] pb-6">
            <div>
              <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold mb-1">Welcome back</p>
              <h1 className="page-title">{user.name}</h1>
            </div>
            <span className="inline-flex items-center min-h-[44px] rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)]">Productivity Hub</span>
          </div>

          {notice && (
            <div className="mt-6 rounded-[14px] border border-[var(--accent-color)]/30 bg-[var(--accent-light)] px-4 py-3 text-sm text-[var(--text-primary)]">
              {notice}
            </div>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="saas-elevated-card">
              <h2 className="section-title mb-4">Pending Tasks</h2>
              <form onSubmit={addTask} className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={newTask}
                  onChange={(event) => setNewTask(event.target.value)}
                  placeholder="Add a task"
                  className="saas-input flex-1"
                />
                <input
                  type="number"
                  min="0"
                  value={reminderMinutes}
                  onChange={(event) => setReminderMinutes(event.target.value)}
                  placeholder="Remind (min)"
                  className="saas-input sm:w-36"
                />
                <button type="submit" className="saas-button-primary">Add Task</button>
              </form>
              <div className="mt-6 space-y-3">
                {pendingTasks.length ? pendingTasks.map((task) => (
                  <div key={task._id} className="flex items-center justify-between rounded-[14px] bg-[var(--bg-secondary)] p-4 border border-[var(--border-main)]">
                    <div>
                      <p className="card-title text-base">{task.title}</p>
                      {task.reminderTime && (
                        <p className="caption-text mt-1">Reminder: {new Date(task.reminderTime).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleTask(task._id, 'completed')} className="saas-button-primary min-h-[40px] px-4 text-xs">Done</button>
                      <button onClick={() => deleteTask(task._id)} className="saas-button-secondary min-h-[40px] px-4 text-xs hover:border-[var(--error-color)] hover:text-[var(--error-color)]">Delete</button>
                    </div>
                  </div>
                )) : <p className="rounded-[14px] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-muted)]">No pending tasks</p>}
              </div>
            </div>

            <div className="saas-elevated-card">
              <h2 className="section-title mb-4">Completed Tasks</h2>
              <div className="space-y-3">
                {completedTasks.length ? completedTasks.map((task) => (
                  <div key={task._id} className="flex items-center justify-between rounded-[14px] bg-[var(--bg-secondary)] p-4 border border-[var(--border-main)]">
                    <p className="body-text text-sm text-[var(--text-muted)] line-through">{task.title}</p>
                    <button onClick={() => deleteTask(task._id)} className="saas-button-secondary min-h-[40px] px-4 text-xs hover:border-[var(--error-color)] hover:text-[var(--error-color)]">Delete</button>
                  </div>
                )) : <p className="rounded-[14px] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-muted)]">No completed tasks</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 1. Hero Section */}
      <section className="saas-card shadow-glow sm:p-14 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <span className="inline-flex items-center rounded-[14px] bg-[var(--accent-light)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-color)] border border-[var(--accent-color)]/20">
            AI-Powered Personalized Learning
          </span>
          <h1 className="page-title text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]">
            Learn smarter with an AI mentor that adapts to your pace.
          </h1>
          <p className="body-text text-lg sm:text-xl max-w-2xl mx-auto">
            Learn smarter with an AI mentor that adapts to your pace, tracks your progress, and helps you achieve your career goals.
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Link to={user ? "/dashboard" : "/register"} className="saas-button-primary inline-flex items-center justify-center min-h-[48px] px-8 text-base font-semibold">
              Get Started
            </Link>
            <a href="#core-features" onClick={scrollToFeatures} className="saas-button-secondary inline-flex items-center justify-center min-h-[48px] px-8 text-base font-semibold">
              Explore Features
            </a>
          </div>
        </div>
      </section>

      {/* 2. Statistics Section */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="saas-card-hover text-center py-8">
          <p className="page-title text-4xl font-extrabold text-[var(--accent-color)]">10,000+</p>
          <p className="card-title text-base mt-2 font-medium">Students</p>
        </div>
        <div className="saas-card-hover text-center py-8">
          <p className="page-title text-4xl font-extrabold text-[var(--accent-color)]">150+</p>
          <p className="card-title text-base mt-2 font-medium">Courses</p>
        </div>
        <div className="saas-card-hover text-center py-8">
          <p className="page-title text-4xl font-extrabold text-[var(--accent-color)]">95%</p>
          <p className="card-title text-base mt-2 font-medium">Completion Rate</p>
        </div>
        <div className="saas-card-hover text-center py-8">
          <p className="page-title text-4xl font-extrabold text-[var(--accent-color)]">24/7</p>
          <p className="card-title text-base mt-2 font-medium">AI Mentor</p>
        </div>
      </section>

      {/* 3. Why Catalyst */}
      <section className="saas-card shadow-glow space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">Why Catalyst</p>
          <h2 className="section-title text-3xl font-bold">Built for personalized, high-efficiency learning.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="saas-card-hover">
            <div className="h-10 w-10 rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] mb-4 font-bold">01</div>
            <h3 className="card-title text-xl font-semibold mb-2">AI Personalized Learning</h3>
            <p className="body-text text-sm">Adaptive learning based on student strengths and weaknesses.</p>
          </div>

          <div className="saas-card-hover">
            <div className="h-10 w-10 rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] mb-4 font-bold">02</div>
            <h3 className="card-title text-xl font-semibold mb-2">Progress Analytics</h3>
            <p className="body-text text-sm">Visualize learning performance using intelligent insights.</p>
          </div>

          <div className="saas-card-hover">
            <div className="h-10 w-10 rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] mb-4 font-bold">03</div>
            <h3 className="card-title text-xl font-semibold mb-2">Smart Practice</h3>
            <p className="body-text text-sm">Practice questions generated according to learning progress.</p>
          </div>

          <div className="saas-card-hover">
            <div className="h-10 w-10 rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] mb-4 font-bold">04</div>
            <h3 className="card-title text-xl font-semibold mb-2">Career Guidance</h3>
            <p className="body-text text-sm">Personalized career paths based on skills.</p>
          </div>
        </div>
      </section>

      {/* 4. How Catalyst Works */}
      <section className="saas-card shadow-glow space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">How Catalyst Works</p>
          <h2 className="section-title text-3xl font-bold">Four simple steps to master any subject.</h2>
        </div>

        {/* Desktop Horizontal Timeline */}
        <div className="hidden md:grid md:grid-cols-4 gap-4 items-center">
          <div className="saas-elevated-card text-center relative">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold text-sm mb-3">1</span>
            <h4 className="card-title font-semibold">Create Account</h4>
          </div>
          <div className="saas-elevated-card text-center relative">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold text-sm mb-3">2</span>
            <h4 className="card-title font-semibold">Take Assessment</h4>
          </div>
          <div className="saas-elevated-card text-center relative">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold text-sm mb-3">3</span>
            <h4 className="card-title font-semibold">AI Builds Roadmap</h4>
          </div>
          <div className="saas-elevated-card text-center relative">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold text-sm mb-3">4</span>
            <h4 className="card-title font-semibold">Learn & Improve</h4>
          </div>
        </div>

        {/* Mobile Vertical Timeline */}
        <div className="flex md:hidden flex-col gap-4">
          <div className="saas-elevated-card flex items-center gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold text-sm">1</span>
            <h4 className="card-title font-semibold">Create Account</h4>
          </div>
          <div className="saas-elevated-card flex items-center gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold text-sm">2</span>
            <h4 className="card-title font-semibold">Take Assessment</h4>
          </div>
          <div className="saas-elevated-card flex items-center gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold text-sm">3</span>
            <h4 className="card-title font-semibold">AI Builds Roadmap</h4>
          </div>
          <div className="saas-elevated-card flex items-center gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold text-sm">4</span>
            <h4 className="card-title font-semibold">Learn & Improve</h4>
          </div>
        </div>
      </section>



      {/* 6. Core Features Section */}
      <section id="core-features" className="saas-card shadow-glow space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">Core Features</p>
          <h2 className="section-title text-3xl font-bold">Everything you need to excel in your studies.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to={user ? "/dashboard" : "/login"} className="saas-card-hover block">
            <div className="h-10 w-10 rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </div>
            <h3 className="card-title text-lg font-semibold mb-2">Dashboard</h3>
            <p className="body-text text-sm">Comprehensive overview of your study goals, focus sessions, and active progress.</p>
          </Link>

          <Link to={user ? "/assessment" : "/login"} className="saas-card-hover block">
            <div className="h-10 w-10 rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="card-title text-lg font-semibold mb-2">Assessment</h3>
            <p className="body-text text-sm">Diagnostic tests to pinpoint knowledge gaps and evaluate current skill level.</p>
          </Link>

          <Link to={user ? "/roadmap" : "/login"} className="saas-card-hover block">
            <div className="h-10 w-10 rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            </div>
            <h3 className="card-title text-lg font-semibold mb-2">Roadmap</h3>
            <p className="body-text text-sm">Step-by-step personalized learning paths tailored to your goals.</p>
          </Link>

          <Link to={user ? "/questions" : "/login"} className="saas-card-hover block">
            <div className="h-10 w-10 rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="card-title text-lg font-semibold mb-2">Practice</h3>
            <p className="body-text text-sm">Adaptive 2-mark and long-answer practice questions generated on demand.</p>
          </Link>

          <Link to={user ? "/progress" : "/login"} className="saas-card-hover block">
            <div className="h-10 w-10 rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <h3 className="card-title text-lg font-semibold mb-2">Progress</h3>
            <p className="body-text text-sm">Detailed topic completion records and score history tracking.</p>
          </Link>

          <Link to={user ? "/career" : "/login"} className="saas-card-hover block">
            <div className="h-10 w-10 rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="card-title text-lg font-semibold mb-2">Career</h3>
            <p className="body-text text-sm">Personalized career path recommendations matched with your skill profile.</p>
          </Link>

          <Link to={user ? "/study-group" : "/login"} className="saas-card-hover block md:col-span-2 lg:col-span-3">
            <div className="h-10 w-10 rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <h3 className="card-title text-lg font-semibold mb-2">Study Group</h3>
            <p className="body-text text-sm">Collaborate with peers, share notes, and query the group AI companion.</p>
          </Link>
        </div>
      </section>

      {/* 7. Learning Journey Vertical Roadmap */}
      <section className="saas-card shadow-glow space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">Learning Journey</p>
          <h2 className="section-title text-3xl font-bold">Your step-by-step path to career readiness.</h2>
        </div>

        <div className="max-w-2xl mx-auto relative pl-6 sm:pl-8 space-y-6 border-l-2 border-[var(--accent-color)]/40">
          <div className="saas-elevated-card relative">
            <span className="absolute -left-[37px] sm:-left-[45px] top-6 h-6 w-6 rounded-full bg-[var(--accent-color)] border-4 border-[var(--bg-surface)]" />
            <h4 className="card-title font-semibold">1. Join Catalyst</h4>
            <p className="body-text text-sm mt-1">Create your profile and set your learning preferences.</p>
          </div>

          <div className="saas-elevated-card relative">
            <span className="absolute -left-[37px] sm:-left-[45px] top-6 h-6 w-6 rounded-full bg-[var(--accent-color)] border-4 border-[var(--bg-surface)]" />
            <h4 className="card-title font-semibold">2. Take Assessment</h4>
            <p className="body-text text-sm mt-1">Diagnostic evaluation to identify your strengths and gaps.</p>
          </div>

          <div className="saas-elevated-card relative">
            <span className="absolute -left-[37px] sm:-left-[45px] top-6 h-6 w-6 rounded-full bg-[var(--accent-color)] border-4 border-[var(--bg-surface)]" />
            <h4 className="card-title font-semibold">3. Get Personalized Roadmap</h4>
            <p className="body-text text-sm mt-1">AI generates a step-by-step study schedule built just for you.</p>
          </div>

          <div className="saas-elevated-card relative">
            <span className="absolute -left-[37px] sm:-left-[45px] top-6 h-6 w-6 rounded-full bg-[var(--accent-color)] border-4 border-[var(--bg-surface)]" />
            <h4 className="card-title font-semibold">4. Daily Learning</h4>
            <p className="body-text text-sm mt-1">Practice adaptive questions and focus with Pomodoro timers.</p>
          </div>

          <div className="saas-elevated-card relative">
            <span className="absolute -left-[37px] sm:-left-[45px] top-6 h-6 w-6 rounded-full bg-[var(--accent-color)] border-4 border-[var(--bg-surface)]" />
            <h4 className="card-title font-semibold">5. Track Progress</h4>
            <p className="body-text text-sm mt-1">Monitor real-time score improvements and completion metrics.</p>
          </div>

          <div className="saas-elevated-card relative">
            <span className="absolute -left-[37px] sm:-left-[45px] top-6 h-6 w-6 rounded-full bg-[var(--accent-color)] border-4 border-[var(--bg-surface)]" />
            <h4 className="card-title font-semibold">6. Become Career Ready</h4>
            <p className="body-text text-sm mt-1">Achieve subject mastery and align with target career pathways.</p>
          </div>
        </div>
      </section>

      {/* 8. Why Choose Catalyst Comparison Table */}
      <section className="saas-card shadow-glow space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">Why Choose Catalyst</p>
          <h2 className="section-title text-3xl font-bold">Designed specifically for student success.</h2>
        </div>

        <div className="max-w-2xl mx-auto overflow-hidden rounded-[20px] border border-[var(--border-main)] bg-[var(--bg-elevated)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--divider-main)] bg-[var(--bg-secondary)]">
                <th className="p-4 sm:p-5 card-title font-semibold text-[var(--text-primary)]">Feature</th>
                <th className="p-4 sm:p-5 card-title font-semibold text-center text-[var(--accent-color)]">Catalyst</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--divider-main)]">
              <tr>
                <td className="p-4 sm:p-5 body-text font-medium text-[var(--text-primary)]">AI Personalization</td>
                <td className="p-4 sm:p-5 text-center">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success-color)] font-bold">✓</span>
                </td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 body-text font-medium text-[var(--text-primary)]">Adaptive Learning</td>
                <td className="p-4 sm:p-5 text-center">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success-color)] font-bold">✓</span>
                </td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 body-text font-medium text-[var(--text-primary)]">Progress Analytics</td>
                <td className="p-4 sm:p-5 text-center">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success-color)] font-bold">✓</span>
                </td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 body-text font-medium text-[var(--text-primary)]">Career Roadmaps</td>
                <td className="p-4 sm:p-5 text-center">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success-color)] font-bold">✓</span>
                </td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 body-text font-medium text-[var(--text-primary)]">Study Groups</td>
                <td className="p-4 sm:p-5 text-center">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success-color)] font-bold">✓</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 9. Final Call To Action */}
      <section className="saas-elevated-card shadow-glow text-center p-8 sm:p-12 space-y-6 border border-[var(--accent-color)]/30 bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-secondary)]">
        <h2 className="page-title text-3xl sm:text-4xl font-extrabold">Ready to Learn Smarter?</h2>
        <p className="body-text text-lg max-w-xl mx-auto">
          Join thousands of students learning with Catalyst.
        </p>
        <div>
          <Link to={user ? "/dashboard" : "/register"} className="saas-button-primary inline-flex items-center justify-center min-h-[48px] px-10 text-base font-semibold">
            Get Started
          </Link>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="saas-card p-8 space-y-8 border-t border-[var(--border-main)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left Footer Branding */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--accent-color)] text-base font-bold text-[var(--accent-contrast-text)]">AI</span>
              <span className="card-title font-bold text-xl">Catalyst</span>
            </div>
            <p className="small-text text-[var(--text-secondary)]">AI Powered Personalized Learning</p>
          </div>

          {/* Right Footer Links */}
          <div className="flex flex-wrap gap-6 text-sm font-medium text-[var(--text-secondary)]">
            <a href="#core-features" onClick={scrollToFeatures} className="hover:text-[var(--accent-color)] transition">Features</a>
            <Link to="/about" className="hover:text-[var(--accent-color)] transition">About</Link>
            <Link to="/privacy" className="hover:text-[var(--accent-color)] transition">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[var(--accent-color)] transition">Terms</Link>
            <Link to="/contact" className="hover:text-[var(--accent-color)] transition">Contact</Link>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="border-t border-[var(--divider-main)] pt-6 text-center text-xs text-[var(--text-muted)]">
          © 2026 Catalyst. All Rights Reserved.
        </div>
      </footer>
    </div>
  )
}
