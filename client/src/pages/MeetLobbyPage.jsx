import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function MeetLobbyPage() {
  const { api, user } = useAuth()
  const navigate = useNavigate()

  const [createTitle, setCreateTitle] = useState('')
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [previewMeet, setPreviewMeet] = useState(null)
  const [recentMeets, setRecentMeets] = useState([])

  const [loading, setLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    fetchRecentMeets()
  }, [user])

  const fetchRecentMeets = async () => {
    setLoading(true)
    try {
      const res = await api.get('/meets/mine')
      setRecentMeets(res.data || [])
    } catch {
      // transient fetch error handling
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMeet = async (e) => {
    e.preventDefault()
    setIsCreating(true)
    setError('')
    try {
      const res = await api.post('/meets/create', { title: createTitle })
      const meet = res.data
      navigate(`/meet/room/${meet.roomCode}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create meet')
    } finally {
      setIsCreating(false)
    }
  }

  const handlePreviewJoin = async (e) => {
    e.preventDefault()
    const code = joinCodeInput.trim().toUpperCase()
    if (!code) return

    setIsPreviewing(true)
    setError('')
    setPreviewMeet(null)

    try {
      const res = await api.get(`/meets/${code}`)
      setPreviewMeet(res.data)
    } catch (err) {
      setError(err.response?.data?.error || "This meet doesn't exist or has ended")
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleConfirmJoin = async () => {
    if (!previewMeet?.roomCode) return
    setError('')
    try {
      await api.post(`/meets/${previewMeet.roomCode}/join`)
      navigate(`/meet/room/${previewMeet.roomCode}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to join meet')
    }
  }

  const handleShareLink = async (meet) => {
    const meetUrl = `${window.location.origin}/meet/room/${meet.roomCode}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${meet.title || 'Study Meet'} on Catalyst`,
          text: `Join my live study call on Catalyst Meet! Room Code: ${meet.roomCode}`,
          url: meetUrl
        })
        return
      } catch (err) {
        // User cancelled share dialog
      }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(meetUrl)
        alert(`Meeting link for ${meet.roomCode} copied to clipboard!`)
      } catch (e) {}
    }
  }

  return (
    <div className="space-y-8">
        {/* Header */}
        <div>
          <p className="page-label">Catalyst Meet</p>
          <h1 className="page-title mb-2">Live Video & Study Collaboration</h1>
          <p className="page-description">
            Start a instant study meet with audio, video, real-time shared whiteboard, and interactive reactions.
          </p>
        </div>

        <hr className="canvas-divider" />

        {error && (
          <p className="rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)] animate-fadeIn">
            {error}
          </p>
        )}

        {/* Meet Action Forms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create New Meet */}
          <div className="rounded-[20px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-6 shadow-sm flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--accent-color)] text-black font-extrabold text-lg">
                  📹
                </div>
                <div>
                  <h2 className="card-title font-bold text-lg">Start a New Meet</h2>
                  <p className="caption-text text-xs">Generate an instant meeting room code & shareable link</p>
                </div>
              </div>

              <form onSubmit={handleCreateMeet} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Meeting Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. Physics Group Discussion"
                    className="saas-input w-full min-h-[46px]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="saas-button-primary w-full font-bold min-h-[46px] shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? (
                    <span>Creating Room...</span>
                  ) : (
                    <>
                      <span>+ Create & Join Room</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Join Existing Meet */}
          <div className="rounded-[20px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-6 shadow-sm flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--bg-primary)] border border-[var(--border-main)] text-lg">
                  🔑
                </div>
                <div>
                  <h2 className="card-title font-bold text-lg">Join a Meet</h2>
                  <p className="caption-text text-xs">Enter a 8-character room code or paste meeting code</p>
                </div>
              </div>

              <form onSubmit={handlePreviewJoin} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Room Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      placeholder="e.g. X8K9L2P4"
                      className="saas-input w-full min-h-[46px] font-mono tracking-wider uppercase"
                    />
                    <button
                      type="submit"
                      disabled={isPreviewing || !joinCodeInput.trim()}
                      className="saas-button-primary shrink-0 min-h-[46px] px-5 font-bold disabled:opacity-50 cursor-pointer"
                    >
                      {isPreviewing ? 'Checking...' : 'Check Code'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Preview Card Modal / Container */}
              {previewMeet && (
                <div className="mt-4 rounded-[16px] border border-[var(--accent-color)]/40 bg-[var(--bg-primary)] p-4 space-y-3 animate-fadeIn">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent-color)]">Room Preview</p>
                      <h3 className="card-title font-bold text-base mt-0.5">{previewMeet.title}</h3>
                      <p className="caption-text text-xs mt-1">Host: <span className="text-[var(--text-primary)] font-semibold">{previewMeet.createdBy?.name || 'Study Peer'}</span></p>
                      <p className="caption-text text-xs">Participants so far: {previewMeet.participantCount}</p>
                    </div>
                    <span className="rounded-full bg-[var(--success-color)]/10 text-[var(--success-color)] border border-[var(--success-color)]/30 px-2.5 py-0.5 text-[11px] font-bold">
                      Active Now
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmJoin}
                    className="saas-button-primary w-full min-h-[40px] text-xs font-extrabold cursor-pointer"
                  >
                    Enter Live Room →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <hr className="canvas-divider" />

        {/* My Recent Meets List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">My Recent Meets ({recentMeets.length})</h2>
            <button
              type="button"
              onClick={fetchRecentMeets}
              className="text-xs font-bold text-[var(--accent-color)] hover:underline cursor-pointer"
            >
              Refresh List
            </button>
          </div>

          {loading ? (
            <p className="caption-text italic">Loading your study meets...</p>
          ) : recentMeets.length === 0 ? (
            <p className="body-text text-xs text-[var(--text-muted)] italic">
              No recent study meets found. Create a room above to start inviting peers!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentMeets.map((meet) => {
                const isHost = (meet.createdBy?._id || meet.createdBy) === (user?.id || user?._id)
                return (
                  <div
                    key={meet._id}
                    className="rounded-[18px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4 flex flex-col justify-between space-y-3 transition hover:border-[var(--accent-color)]/50 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-xs font-bold text-[var(--accent-color)] bg-[var(--bg-primary)] px-2 py-0.5 rounded-[8px] border border-[var(--border-main)]">
                          {meet.roomCode}
                        </span>
                        {meet.isActive ? (
                          <span className="rounded-full bg-[var(--success-color)]/10 text-[var(--success-color)] border border-[var(--success-color)]/30 px-2 py-0.5 text-[10px] font-bold">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-main)] px-2 py-0.5 text-[10px] font-bold">
                            Ended
                          </span>
                        )}
                      </div>
                      <h3 className="card-title font-bold text-base line-clamp-1">{meet.title}</h3>
                      <p className="caption-text text-xs mt-1">
                        Host: {isHost ? 'You' : meet.createdBy?.name || 'Peer'}
                      </p>
                      <p className="caption-text text-xs">
                        Created: {new Date(meet.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-main)] space-y-2">
                      <div className="flex gap-2">
                        {meet.isActive ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/meet/room/${meet.roomCode}`)}
                            className="saas-button-primary flex-1 min-h-[38px] text-xs font-bold cursor-pointer"
                          >
                            Rejoin Call →
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="saas-button-secondary flex-1 min-h-[38px] text-xs font-semibold opacity-50 cursor-not-allowed"
                          >
                            Meeting Ended
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleShareLink(meet)}
                          className="saas-button-secondary px-3 min-h-[38px] text-xs font-bold shrink-0 cursor-pointer"
                          title="Share meeting link"
                        >
                          🔗 Share
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
    </div>
  )
}
