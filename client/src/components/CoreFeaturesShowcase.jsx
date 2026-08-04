import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { FEATURES } from '../data/featuresData.js'

export default function CoreFeaturesShowcase() {
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const auth = useAuth()
  const user = auth?.user

  // Current feature index (can grow infinitely for continuous rotation)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [cardSpacing, setCardSpacing] = useState(540)
  const [isInView, setIsInView] = useState(true)

  const pauseTimeoutRef = useRef(null)
  const autoRotateIntervalRef = useRef(null)

  const totalFeatures = FEATURES.length

  // Calculate card spacing based on window width for perfect responsiveness
  useEffect(() => {
    const updateSpacing = () => {
      const w = window.innerWidth
      if (w < 640) {
        setCardSpacing(Math.min(w * 0.78, 280))
      } else if (w < 1024) {
        setCardSpacing(420)
      } else {
        setCardSpacing(540)
      }
    }
    updateSpacing()
    window.addEventListener('resize', updateSpacing)
    return () => window.removeEventListener('resize', updateSpacing)
  }, [])

  // Viewport IntersectionObserver to pause auto-rotate when offscreen
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
      },
      { threshold: 0.15 }
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // User Interaction Handler - pauses auto rotation for 6 seconds
  const triggerInteraction = useCallback(() => {
    setIsPaused(true)
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current)
    }
    // Resume auto-rotation after 6 seconds of inactivity
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false)
    }, 6000)
  }, [])

  // Navigation Actions
  const handleNext = useCallback(() => {
    triggerInteraction()
    setCurrentIndex((prev) => prev + 1)
  }, [triggerInteraction])

  const handlePrev = useCallback(() => {
    triggerInteraction()
    setCurrentIndex((prev) => prev - 1)
  }, [triggerInteraction])

  const handleSelectFeature = useCallback(
    (targetIndex) => {
      triggerInteraction()
      setCurrentIndex(targetIndex)
    },
    [triggerInteraction]
  )

  // Automatic Smooth Rotation Interval (faster speed: steps every 2.2s)
  useEffect(() => {
    if (isPaused || !isInView) return

    autoRotateIntervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => prev + 1)
    }, 2200)

    return () => {
      if (autoRotateIntervalRef.current) {
        clearInterval(autoRotateIntervalRef.current)
      }
    }
  }, [isPaused, isInView])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current)
      if (autoRotateIntervalRef.current) clearInterval(autoRotateIntervalRef.current)
    }
  }, [])

  // Keyboard Support (Left / Right arrow keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isInView) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrev, handleNext, isInView])

  // Touch Support (Swipe Left / Swipe Right)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 40 // px

    if (distance > minSwipeDistance) {
      handleNext()
    } else if (distance < -minSwipeDistance) {
      handlePrev()
    }

    touchStartX.current = 0
    touchEndX.current = 0
  }

  const handleCardClick = (featureRoute) => {
    navigate(user ? featureRoute : '/login')
  }

  // Calculate active feature index (0 to totalFeatures - 1)
  const activeFeatureIndex = ((currentIndex % totalFeatures) + totalFeatures) % totalFeatures

  // Render cards in range [-3, -2, -1, 0, 1, 2, 3] relative to currentIndex
  const visibleOffsets = [-3, -2, -1, 0, 1, 2, 3]

  return (
    <div
      ref={containerRef}
      className="w-full bg-[var(--bg-primary)] py-8 sm:py-12 border-y border-[var(--border-main)] shadow-xl transition-colors duration-300 overflow-hidden relative select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="max-w-7xl mx-auto flex flex-col justify-between space-y-6 sm:space-y-8 px-4 sm:px-6 relative">
        
        {/* Section Title Header */}
        <div className="z-10 text-center max-w-4xl mx-auto space-y-1.5 shrink-0">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">
            Core Features
          </p>
          <h2 className="section-title text-xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
            Everything you need to excel in your studies.
          </h2>
        </div>

        {/* 3D Rotating Showcase Container */}
        <div className="relative w-full h-[410px] sm:h-[460px] md:h-[490px] flex items-center justify-center perspective-1000 overflow-visible py-4">
          {/* Render 3D Cards Stack */}
          {visibleOffsets.map((offset) => {
            const cardIndex = currentIndex + offset
            const fIndex = ((cardIndex % totalFeatures) + totalFeatures) % totalFeatures
            const feature = FEATURES[fIndex]
            const isActive = offset === 0

            // 3D positioning calculations
            const xPos = offset * cardSpacing
            let scale = 1
            let opacity = 1
            let zIndex = 30
            let rotateY = 0

            if (offset === 0) {
              scale = 1
              opacity = 1
              zIndex = 30
              rotateY = 0
            } else if (Math.abs(offset) === 1) {
              scale = 0.88
              opacity = 0.65
              zIndex = 20
              rotateY = offset > 0 ? -12 : 12
            } else if (Math.abs(offset) === 2) {
              scale = 0.75
              opacity = 0.35
              zIndex = 10
              rotateY = offset > 0 ? -20 : 20
            } else {
              scale = 0.6
              opacity = 0
              zIndex = 0
              rotateY = offset > 0 ? -25 : 25
            }

            return (
              <motion.div
                key={cardIndex}
                initial={false}
                animate={{
                  x: xPos,
                  scale,
                  opacity,
                  rotateY,
                  zIndex
                }}
                transition={{
                  duration: 0.55,
                  ease: [0.65, 0, 0.35, 1] // exact easeInOutCubic
                }}
                style={{
                  position: 'absolute',
                  willChange: 'transform, opacity'
                }}
                onClick={() => {
                  if (offset !== 0) {
                    handleSelectFeature(cardIndex)
                  } else {
                    handleCardClick(feature.route)
                  }
                }}
                className={`cursor-pointer w-[88vw] sm:w-[460px] md:w-[500px] lg:w-[540px] h-[380px] sm:h-[420px] md:h-[450px] max-h-[58vh] rounded-2xl sm:rounded-3xl border transition-all duration-500 overflow-hidden flex flex-col justify-between ${
                  isActive
                    ? 'border-[var(--accent-color)] shadow-[0_0_45px_rgba(230,179,37,0.35)] bg-[var(--bg-elevated)] ring-1 ring-[var(--accent-color)]/50'
                    : 'border-[var(--border-main)] bg-[var(--bg-elevated)]/90 hover:border-[var(--accent-color)]/60 shadow-xl'
                }`}
              >
                <FeatureCardContent feature={feature} isActive={isActive} />
              </motion.div>
            )
          })}
        </div>

        {/* Navigation Controls Under Carousel */}
        <div className="flex items-center justify-center space-x-4 pt-1 z-40">
          {/* Left Button (←) */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Feature"
            className="w-[46px] h-[46px] sm:w-[48px] sm:h-[48px] min-h-[44px] min-w-[44px] rounded-full bg-[#0B1220]/80 dark:bg-[#0B1220]/90 backdrop-blur-xl border border-[var(--accent-color)] text-[var(--accent-color)] shadow-[0_6px_20px_rgba(0,0,0,0.4)] flex items-center justify-center transition-all duration-300 hover:scale-[1.08] hover:shadow-[0_0_25px_rgba(230,179,37,0.6)] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] cursor-pointer group"
          >
            <svg
              className="w-5 h-5 stroke-current transition-transform duration-300 group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.8"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          {/* Right Button (→) */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Feature"
            className="w-[46px] h-[46px] sm:w-[48px] sm:h-[48px] min-h-[44px] min-w-[44px] rounded-full bg-[#0B1220]/80 dark:bg-[#0B1220]/90 backdrop-blur-xl border border-[var(--accent-color)] text-[var(--accent-color)] shadow-[0_6px_20px_rgba(0,0,0,0.4)] flex items-center justify-center transition-all duration-300 hover:scale-[1.08] hover:shadow-[0_0_25px_rgba(230,179,37,0.6)] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] cursor-pointer group"
          >
            <svg
              className="w-5 h-5 stroke-current transition-transform duration-300 group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.8"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  )
}

function FeatureCardContent({ feature, isActive }) {
  return (
    <>
      {/* Ambient Glow Accent */}
      <div
        className={`absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[var(--accent-light)] blur-3xl pointer-events-none transition-opacity duration-500 ${
          isActive ? 'opacity-70' : 'opacity-20'
        }`}
      />

      {/* TOP: Screenshot Showcase */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-[var(--bg-primary)] flex items-center justify-center rounded-t-2xl sm:rounded-t-3xl border-b border-[var(--border-main)]">
        {/* Inner Overlay for natural blending */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-elevated)]/80 via-transparent to-[var(--bg-primary)]/10 z-10 pointer-events-none" />

        {feature.image ? (
          <img
            src={feature.image}
            alt={`${feature.title} screenshot`}
            loading="lazy"
            className="w-full h-full object-cover object-center rounded-t-2xl sm:rounded-t-3xl pointer-events-none"
          />
        ) : (
          /* Fallback Placeholder state */
          <div className="w-full h-full rounded-lg sm:rounded-xl border border-dashed border-[var(--border-main)] bg-[var(--bg-secondary)] flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-2.5 z-0">
            <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">{feature.title}</p>
          </div>
        )}
      </div>

      {/* BOTTOM: Feature Information & CTA */}
      <div className="p-3.5 sm:p-4.5 flex flex-col justify-between bg-[var(--bg-elevated)] relative z-20 shrink-0 space-y-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md bg-[var(--accent-light)] border border-[var(--accent-color)]/30 text-[10px] sm:text-[11px] font-semibold text-[var(--accent-color)] uppercase tracking-wider">
              {feature.badge}
            </span>
          </div>

          <h3 className={`text-sm sm:text-base font-bold transition-colors ${isActive ? 'text-[var(--accent-color)]' : 'text-[var(--text-primary)]'}`}>
            {feature.title}
          </h3>
          <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
            {feature.description}
          </p>
        </div>

        {/* Minimal CTA */}
        <div className="flex items-center justify-end text-[11px] sm:text-xs font-semibold text-[var(--accent-color)] pt-0.5 min-h-[32px]">
          <span className="flex items-center gap-1 group-hover:gap-2 transition-all">
            Explore {feature.title}
            <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
        </div>
      </div>
    </>
  )
}

