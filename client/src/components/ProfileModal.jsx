import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const LEARNING_STYLE_OPTIONS = ['Visual', 'Reading', 'Practice', 'Mixed']

const PRESET_AVATARS = [
  { id: 'preset-aurora', label: 'Aurora', initials: 'AU', classes: 'from-fuchsia-500 to-violet-600' },
  { id: 'preset-sage', label: 'Sage', initials: 'SG', classes: 'from-emerald-500 to-teal-600' },
  { id: 'preset-sun', label: 'Sun', initials: 'SN', classes: 'from-amber-500 to-orange-600' },
  { id: 'preset-ocean', label: 'Ocean', initials: 'OC', classes: 'from-sky-500 to-cyan-700' }
]

function getInitials(name) {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function normalizeList(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function compressImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 256
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          }
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }

        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        context.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      img.onerror = () => reject(new Error('Unable to read image'))
      img.src = dataUrl
    }
    reader.onerror = () => reject(new Error('Unable to read image'))
    reader.readAsDataURL(file)
  })
}

export function AvatarVisual({ avatar, name, className = '' }) {
  const initials = getInitials(name)

  if (avatar?.startsWith('data:image')) {
    return (
      <img
        src={avatar}
        alt={name || 'User avatar'}
        className={`h-full w-full rounded-full object-cover ${className}`}
      />
    )
  }

  const presetId = avatar?.startsWith('preset:') ? avatar.replace('preset:', '') : ''
  const preset = PRESET_AVATARS.find((item) => item.id === presetId)

  return (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${preset?.classes || 'from-[var(--accent-color)] to-[var(--accent-sage)]'} text-sm font-bold text-white shadow-sm ${className}`}
    >
      {preset ? preset.initials : initials}
    </div>
  )
}

export default function ProfileModal({ isOpen, onClose }) {
  const { user, api, updateUser } = useAuth()
  const [formState, setFormState] = useState({
    role: '',
    learningStyle: 'Mixed',
    educationLevel: '',
    interestedSubjects: [],
    careerInterests: [],
    avatar: ''
  })
  const [subjectInput, setSubjectInput] = useState('')
  const [careerInput, setCareerInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !user) return

    setFormState({
      role: user.role || 'student',
      learningStyle: user.learningStyle || 'Mixed',
      educationLevel: user.educationLevel || '',
      interestedSubjects: normalizeList(user.interestedSubjects),
      careerInterests: normalizeList(user.careerInterests),
      avatar: user.avatar || ''
    })
    setSubjectInput('')
    setCareerInput('')
    setMessage({ type: '', text: '' })
  }, [isOpen, user])

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  const updateField = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const addTag = (field, value) => {
    const trimmed = value.trim()
    if (!trimmed) return
    setFormState((prev) => {
      const current = prev[field] || []
      if (current.includes(trimmed)) return prev
      return { ...prev, [field]: [...current, trimmed] }
    })
  }

  const removeTag = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((item) => item !== value)
    }))
  }

  const handlePickPreset = (presetId) => {
    updateField('avatar', `preset:${presetId}`)
  }

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const compressed = await compressImageToDataUrl(file)
      updateField('avatar', compressed)
      setMessage({ type: 'success', text: 'Avatar updated locally. Save changes to keep it.' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Unable to process selected image.' })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const payload = {
        educationLevel: typeof formState.educationLevel === 'string' ? formState.educationLevel.trim() : '',
        interestedSubjects: normalizeList(formState.interestedSubjects),
        careerInterests: normalizeList(formState.careerInterests),
        learningStyle: LEARNING_STYLE_OPTIONS.includes(formState.learningStyle) ? formState.learningStyle : 'Mixed',
        avatar: typeof formState.avatar === 'string' ? formState.avatar.trim() : ''
      }

      const response = await api.put('/auth/profile', payload)
      updateUser(response.data)
      setMessage({ type: 'success', text: 'Profile updated successfully.' })
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Unable to save profile changes.' })
    } finally {
      setSaving(false)
    }
  }

  const avatarPreview = useMemo(() => {
    if (formState.avatar?.startsWith('data:image')) return formState.avatar
    return formState.avatar || ''
  }, [formState.avatar])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 overflow-y-auto pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]" onClick={handleOverlayClick}>
      <div className="absolute inset-0 bg-[var(--bg-primary)]/70 backdrop-blur-xl" />
      <div className="relative z-10 w-full max-w-2xl max-h-[92vh] sm:max-h-[86vh] my-auto flex flex-col overflow-hidden rounded-[24px] sm:rounded-[28px] border border-[var(--border-main)] bg-[var(--bg-surface)] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--divider-main)] px-4 py-4 sm:px-6">
          <div>
            <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)]">Profile</p>
            <h2 className="section-title mt-1">Edit your profile</h2>
          </div>
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] p-2 text-[var(--text-secondary)] transition hover:border-[var(--accent-color)] hover:text-[var(--text-primary)] cursor-pointer">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative flex-shrink-0">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] shadow-sm sm:h-28 sm:w-28">
                <AvatarVisual avatar={avatarPreview} name={user?.name || 'User'} className="text-lg" />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full border border-[var(--border-main)] bg-[var(--bg-surface)] p-2 text-[var(--accent-color)] shadow-sm cursor-pointer"
                aria-label="Edit avatar"
              >
                ✎
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            <div className="w-full text-center sm:text-left">
              <h3 className="section-title">{user?.name || 'Your profile'}</h3>
              <p className="body-text mt-1">Upload a photo or choose one of the preset avatars below.</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePickPreset(preset.id)}
                    className={`flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-gradient-to-br ${preset.classes} text-sm font-bold text-white shadow-sm transition hover:scale-105 cursor-pointer ${formState.avatar === `preset:${preset.id}` ? 'ring-2 ring-[var(--accent-color)] ring-offset-2 ring-offset-[var(--bg-surface)]' : ''}`}
                    aria-label={preset.label}
                  >
                    {preset.initials}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {message.text ? (
            <div className={`mt-5 rounded-[14px] border px-3 py-3 text-sm ${message.type === 'success' ? 'border-[var(--success-color)]/30 bg-[var(--success-bg)] text-[var(--success-color)]' : 'border-[var(--error-color)]/30 bg-[var(--error-bg)] text-[var(--error-color)]'}`}>
              {message.text}
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Role</span>
              <input value={formState.role} readOnly className="saas-input w-full min-h-[44px] bg-[var(--bg-secondary)]" />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Learning style</span>
              <select value={formState.learningStyle} onChange={(event) => updateField('learningStyle', event.target.value)} className="saas-input w-full min-h-[44px]">
                {LEARNING_STYLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Education level</span>
              <input value={formState.educationLevel} onChange={(event) => updateField('educationLevel', event.target.value)} className="saas-input w-full min-h-[44px]" placeholder="e.g. College" />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Preferred subjects</span>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input value={subjectInput} onChange={(event) => setSubjectInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTag('interestedSubjects', subjectInput); setSubjectInput('') } }} className="saas-input min-h-[44px] flex-1" placeholder="Add a subject" />
                <button type="button" onClick={() => { addTag('interestedSubjects', subjectInput); setSubjectInput('') }} className="saas-button-secondary min-h-[44px] whitespace-nowrap cursor-pointer">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {formState.interestedSubjects.length ? formState.interestedSubjects.map((subject) => (
                  <button key={subject} type="button" onClick={() => removeTag('interestedSubjects', subject)} className="rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] px-3 py-1.5 min-h-[36px] text-sm text-[var(--text-primary)] cursor-pointer">
                    {subject} ×
                  </button>
                )) : <p className="text-sm text-[var(--text-muted)]">No subjects selected yet.</p>}
              </div>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Career goals</span>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input value={careerInput} onChange={(event) => setCareerInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTag('careerInterests', careerInput); setCareerInput('') } }} className="saas-input min-h-[44px] flex-1" placeholder="Add a career goal" />
                <button type="button" onClick={() => { addTag('careerInterests', careerInput); setCareerInput('') }} className="saas-button-secondary min-h-[44px] whitespace-nowrap cursor-pointer">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {formState.careerInterests.length ? formState.careerInterests.map((interest) => (
                  <button key={interest} type="button" onClick={() => removeTag('careerInterests', interest)} className="rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] px-3 py-1.5 min-h-[36px] text-sm text-[var(--text-primary)] cursor-pointer">
                    {interest} ×
                  </button>
                )) : <p className="text-sm text-[var(--text-muted)]">No career goals selected yet.</p>}
              </div>
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--divider-main)] pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="saas-button-secondary min-h-[44px] cursor-pointer">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="saas-button-primary min-h-[44px] cursor-pointer">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
