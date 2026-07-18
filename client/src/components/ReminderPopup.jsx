export default function ReminderPopup({ reminder, onDismiss, onSnooze }) {
  if (!reminder) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-[2rem] border border-brand-500/30 bg-white/95 p-6 shadow-2xl shadow-brand-500/20">
        <p className="text-[10px] uppercase tracking-[0.3em] text-brand-600/80">Reminder</p>
        <h3 className="mt-2 text-xl font-semibold text-ink-900">{reminder.title}</h3>
        <p className="mt-3 text-sm text-ink-500">It is time to focus on this task.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => onSnooze(reminder)}
            className="flex-1 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white"
          >
            Snooze 5 min
          </button>
          <button
            type="button"
            onClick={() => onDismiss(reminder)}
            className="flex-1 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-800"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
