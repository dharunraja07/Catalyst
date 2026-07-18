import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const MAX_AVATAR_BYTES = 1 * 1024 * 1024 // 1MB, matches the server-side limit
const TARGET_AVATAR_SIZE = 320 // px — resized client-side so uploads stay small and fast

function resizeImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, TARGET_AVATAR_SIZE / Math.max(img.width, img.height))
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function SettingsPage() {
  const { user, api, updateUser } = useAuth()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    name: '',
    bio: '',
    educationLevel: '',
    interestedSubjects: '',
    careerInterests: '',
    learningStyle: 'Mixed',
    dailyGoalMinutes: 60
  })
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    setForm({
      name: user.name || '',
      bio: user.bio || '',
      educationLevel: user.educationLevel || '',
      interestedSubjects: (user.interestedSubjects || []).join(', '),
      careerInterests: (user.careerInterests || []).join(', '),
      learningStyle: user.learningStyle || 'Mixed',
      dailyGoalMinutes: user.dailyGoalMinutes || 60
    })
    setAvatarPreview(user.avatarUrl || '')
  }, [user])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file for your profile picture.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES * 4) {
      setError('That image is too large. Please choose a smaller photo.')
      return
    }

    setAvatarUploading(true)
    setError('')
    try {
      const dataUrl = await resizeImageToDataUrl(file)
      setAvatarPreview(dataUrl)
    } catch (err) {
      setError('Unable to process that image.')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setStatus('')
    setError('')
    try {
      const payload = {
        name: form.name,
        bio: form.bio,
        educationLevel: form.educationLevel,
        interestedSubjects: form.interestedSubjects.split(',').map((s) => s.trim()).filter(Boolean),
        careerInterests: form.careerInterests.split(',').map((s) => s.trim()).filter(Boolean),
        learningStyle: form.learningStyle,
        dailyGoalMinutes: Number(form.dailyGoalMinutes) || 60
      }
      if (avatarPreview && avatarPreview !== user?.avatarUrl) {
        payload.avatarUrl = avatarPreview
      }

      const response = await api.put('/auth/profile', payload)
      updateUser(response.data)
      setStatus('Your settings have been saved.')
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to save your settings')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.24em] text-brand-600/80">Settings</p>
        <h1 className="text-3xl font-semibold text-ink-900">Your profile</h1>
        <p className="mt-2 text-ink-500">Update your details and profile picture. Changes save to your account only.</p>
      </div>

      {status && <p className="mb-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</p>}
      {error && <p className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile picture */}
        <section className="rounded-[1.75rem] border border-ink-200 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-ink-900">Profile picture</h2>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile" className="h-20 w-20 rounded-full object-cover shadow-soft" />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-semibold text-white shadow-soft">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
              {avatarUploading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Upload new photo
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={() => setAvatarPreview('')}
                  className="text-left text-xs font-medium text-ink-500 hover:text-red-600"
                >
                  Remove photo
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>
        </section>

        {/* Basic details */}
        <section className="rounded-[1.75rem] border border-ink-200 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-ink-900">Basic details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-600">Full name</span>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-600">Email</span>
              <input
                value={user.email}
                disabled
                className="w-full rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 text-ink-400"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-ink-600">Short bio</span>
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                rows="2"
                maxLength={280}
                placeholder="A line about yourself..."
                className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none"
              />
            </label>
          </div>
        </section>

        {/* Learning preferences */}
        <section className="rounded-[1.75rem] border border-ink-200 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-ink-900">Learning preferences</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-600">Education level</span>
              <input
                name="educationLevel"
                value={form.educationLevel}
                onChange={handleChange}
                placeholder="High School, College..."
                className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-600">Learning style</span>
              <select
                name="learningStyle"
                value={form.learningStyle}
                onChange={handleChange}
                className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none"
              >
                <option>Visual</option>
                <option>Reading</option>
                <option>Practice</option>
                <option>Mixed</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-ink-600">Preferred subjects</span>
              <input
                name="interestedSubjects"
                value={form.interestedSubjects}
                onChange={handleChange}
                placeholder="Mathematics, Programming"
                className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-ink-600">Career interests</span>
              <input
                name="careerInterests"
                value={form.careerInterests}
                onChange={handleChange}
                placeholder="Technology, Analytics"
                className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-600">Daily goal (minutes)</span>
              <input
                type="number"
                name="dailyGoalMinutes"
                min="10"
                max="600"
                value={form.dailyGoalMinutes}
                onChange={handleChange}
                className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-ink-800 focus:border-brand-400 focus:outline-none"
              />
            </label>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </main>
  )
}
