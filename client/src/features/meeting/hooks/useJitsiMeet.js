import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Dynamically loads Jitsi Meet External API script once if not already loaded.
 */
export function loadJitsiScript(domain) {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) {
      resolve(window.JitsiMeetExternalAPI)
      return
    }
    const scriptId = 'jitsi-external-api-script'
    let script = document.getElementById(scriptId)
    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = `https://${domain}/external_api.js`
      script.async = true
      script.onload = () => {
        if (window.JitsiMeetExternalAPI) {
          resolve(window.JitsiMeetExternalAPI)
        } else {
          reject(new Error('JitsiMeetExternalAPI is not available after script load.'))
        }
      }
      script.onerror = (err) => reject(err)
      document.body.appendChild(script)
    } else {
      script.addEventListener('load', () => resolve(window.JitsiMeetExternalAPI))
    }
  })
}

/**
 * Custom hook to initialize and manage Jitsi Meet External API instance.
 */
export function useJitsiMeet({ roomName, containerEl, displayName, onJoined, onLeave }) {
  const jitsiApiRef = useRef(null)
  const [isJoined, setIsJoined] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const envDomain = import.meta.env.VITE_JITSI_DOMAIN
  const domain = (envDomain && envDomain !== 'meet.jit.si') ? envDomain : 'meet.element.io'

  useEffect(() => {
    let isMounted = true

    if (!roomName || !containerEl) return

    setIsLoading(true)
    setError(null)

    loadJitsiScript(domain)
      .then((JitsiMeetExternalAPI) => {
        if (!isMounted || !containerEl) return

        // Clean up previous instance if any
        if (jitsiApiRef.current) {
          try {
            jitsiApiRef.current.dispose()
          } catch (_) {}
          jitsiApiRef.current = null
        }

        const options = {
          roomName: `Catalyst_${roomName.toUpperCase()}`,
          width: '100%',
          height: '100%',
          parentNode: containerEl,
          userInfo: {
            displayName: displayName || 'Participant'
          },
          configOverwrite: {
            prejoinConfig: { enabled: false },
            disableDeepLinking: true,
            toolbarButtons: [], // Hide Jitsi internal toolbar to rely on our custom control bar
            hideConferenceSubject: true,
            hideConferenceTimer: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_BUTTONS: [],
            MOBILE_APP_PROMO: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
          }
        }

        const api = new JitsiMeetExternalAPI(domain, options)
        jitsiApiRef.current = api

        // Dismiss loading spinner after iframe mounts or on conference joined
        const timer = setTimeout(() => {
          if (isMounted) setIsLoading(false)
        }, 1000)

        api.addEventListener('videoConferenceJoined', (data) => {
          if (!isMounted) return
          clearTimeout(timer)
          setIsJoined(true)
          setIsLoading(false)
          if (onJoined) onJoined(data)
        })

        api.addEventListener('readyToClose', () => {
          if (onLeave) onLeave()
        })
      })
      .catch((err) => {
        console.error('Failed to load Jitsi Meet External API:', err)
        if (isMounted) {
          setError('Failed to initialize video engine.')
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose()
        } catch (_) {}
        jitsiApiRef.current = null
      }
    }
  }, [roomName, domain, displayName, containerEl])

  const toggleAudio = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio')
    }
  }, [])

  const toggleVideo = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo')
    }
  }, [])

  const toggleShareScreen = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleShareScreen')
    }
  }, [])

  const hangup = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('hangup')
    }
  }, [])

  return {
    jitsiApiRef,
    isJoined,
    isLoading,
    error,
    toggleAudio,
    toggleVideo,
    toggleShareScreen,
    hangup
  }
}
