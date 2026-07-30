import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProductivityHub() {
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
        (task) =>
          task.status === 'pending' &&
          task.reminderTime &&
          new Date(task.reminderTime).getTime() <= now &&
          !remindedIds.current.has(task._id)
      )

      if (dueTask) {
        remindedIds.current.add(dueTask._id)
        setNotice(`⏰ Reminder: ${dueTask.title}`)
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
        reminderTime:
          reminderMinutes && Number(reminderMinutes) > 0
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

  return (
    <div className="rounded-[20px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-6 shadow-sm space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--divider-main)] pb-5">
        <div>
          <p className="caption-text uppercase tracking-widest font-semibold text-[var(--accent-color)]">Task Management</p>
          <h2 className="section-title text-xl font-bold mt-1">Productivity Hub</h2>
        </div>
        <span className="inline-flex items-center rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] self-start sm:self-auto">
          {pendingTasks.length} Pending • {completedTasks.length} Done
        </span>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-[14px] border border-[var(--accent-color)]/40 bg-[var(--accent-light)] px-4 py-3 text-sm text-[var(--text-primary)]">
          <span>{notice}</span>
          <button
            onClick={() => setNotice('')}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Pending Tasks Section */}
        <div className="rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-primary)] p-5 space-y-4">
          <h3 className="section-title text-base font-bold">Pending Tasks</h3>
          
          <form onSubmit={addTask} className="flex flex-col gap-3 sm:flex-row">
            <input
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
              placeholder="Add a task..."
              className="saas-input flex-1 min-h-[44px]"
            />
            <input
              type="number"
              min="0"
              value={reminderMinutes}
              onChange={(event) => setReminderMinutes(event.target.value)}
              placeholder="Remind (min)"
              className="saas-input sm:w-36 min-h-[44px]"
            />
            <button type="submit" className="saas-button-primary min-h-[44px] font-bold">
              Add Task
            </button>
          </form>

          <div className="space-y-3 pt-1">
            {pendingTasks.length ? (
              pendingTasks.map((task) => (
                <div
                  key={task._id}
                  className="flex items-center justify-between rounded-[14px] bg-[var(--bg-secondary)] p-4 border border-[var(--border-main)] transition-all hover:border-[var(--border-hover)]"
                >
                  <div className="min-w-0 pr-3">
                    <p className="card-title text-sm font-semibold truncate text-[var(--text-primary)]">{task.title}</p>
                    {task.reminderTime && (
                      <p className="caption-text mt-1 text-[11px] text-[var(--accent-color)] font-medium">
                        ⏰ {new Date(task.reminderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleTask(task._id, 'completed')}
                      className="saas-button-primary min-h-[36px] px-3.5 text-xs font-semibold"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => deleteTask(task._id)}
                      className="saas-button-secondary min-h-[36px] px-3 text-xs text-[var(--text-muted)] hover:border-[var(--error-color)] hover:text-[var(--error-color)]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[14px] bg-[var(--bg-secondary)] p-6 text-center border border-[var(--border-main)]">
                <p className="text-sm text-[var(--text-muted)] font-medium">No pending tasks. Great job!</p>
              </div>
            )}
          </div>
        </div>

        {/* Completed Tasks Section */}
        <div className="rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-primary)] p-5 space-y-4">
          <h3 className="section-title text-base font-bold">Completed Tasks</h3>
          <div className="space-y-3">
            {completedTasks.length ? (
              completedTasks.map((task) => (
                <div
                  key={task._id}
                  className="flex items-center justify-between rounded-[14px] bg-[var(--bg-secondary)] p-4 border border-[var(--border-main)]"
                >
                  <p className="body-text text-sm text-[var(--text-muted)] line-through truncate pr-3">{task.title}</p>
                  <button
                    onClick={() => deleteTask(task._id)}
                    className="saas-button-secondary min-h-[36px] px-3 text-xs text-[var(--text-muted)] hover:border-[var(--error-color)] hover:text-[var(--error-color)] shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-[14px] bg-[var(--bg-secondary)] p-6 text-center border border-[var(--border-main)]">
                <p className="text-sm text-[var(--text-muted)] font-medium">No completed tasks yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
