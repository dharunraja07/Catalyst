import { useEffect, useRef } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { FEATURES } from '../data/featuresData.js'

// Duplicate features list for mathematically continuous 100% infinite linear rotation
const DOUBLE_FEATURES = [...FEATURES, ...FEATURES]

export default function CoreFeaturesShowcase() {
  const containerRef = useRef(null)
  const controls = useAnimationControls()
  const navigate = useNavigate()
  const auth = useAuth()
  const user = auth?.user

  // Start continuous linear 60 FPS loop (1 revolution every 28 seconds)
  useEffect(() => {
    controls.start({
      x: ['0%', '-50%'],
      transition: {
        ease: 'linear',
        duration: 28,
        repeat: Infinity,
        repeatType: 'loop'
      }
    })
  }, [controls])

  // Viewport IntersectionObserver: Pause when offscreen, resume from exact previous angle when returning
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          controls.start({
            x: ['0%', '-50%'],
            transition: {
              ease: 'linear',
              duration: 28,
              repeat: Infinity,
              repeatType: 'loop'
            }
          })
        } else {
          controls.stop()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [controls])

  const handleCardClick = (route) => {
    navigate(user ? route : '/login')
  }

  return (
    <div
      ref={containerRef}
      className="w-full bg-[var(--bg-primary)] py-4 sm:py-6 border-y border-[var(--border-main)] shadow-xl transition-colors duration-300 overflow-hidden"
    >
      <div className="w-full flex flex-col justify-between space-y-4 sm:space-y-6">
        
        {/* Section Title Header */}
        <div className="z-10 text-center max-w-4xl mx-auto px-4 space-y-1.5 shrink-0">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">
            Core Features
          </p>
          <h2 className="section-title text-xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
            Everything you need to excel in your studies.
          </h2>
        </div>

        {/* Continuous Infinite 60 FPS Linear Motion Track */}
        <div className="relative w-full overflow-hidden py-2">
          <motion.div
            animate={controls}
            className="flex gap-6 sm:gap-8 w-max items-center"
          >
            {DOUBLE_FEATURES.map((feature, index) => (
              <FeatureCard
                key={`${feature.id}-${index}`}
                feature={feature}
                onClick={() => handleCardClick(feature.route)}
              />
            ))}
          </motion.div>
        </div>

      </div>
    </div>
  )
}

function FeatureCard({ feature, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer shrink-0 w-[85vw] sm:w-[460px] md:w-[500px] lg:w-[540px] h-[380px] sm:h-[420px] md:h-[450px] max-h-[58vh] rounded-2xl sm:rounded-3xl border border-[var(--border-main)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xl overflow-hidden flex flex-col justify-between transition-colors duration-300 hover:border-[var(--accent-color)] hover:shadow-[0_15px_40px_rgba(230,179,37,0.25)] relative"
    >
      {/* Ambient Glow Accent */}
      <div
        className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[var(--accent-light)] opacity-30 blur-3xl group-hover:opacity-60 transition-opacity duration-500 pointer-events-none"
      />

      {/* 72% TOP: Screenshot Showcase */}
      <div className="relative h-[72%] w-full overflow-hidden bg-[var(--bg-primary)] p-3 sm:p-4 flex items-center justify-center rounded-t-2xl sm:rounded-t-3xl border-b border-[var(--border-main)]">
        {/* Inner Overlay for natural blending in Dark & Light mode */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-elevated)]/80 via-transparent to-[var(--bg-primary)]/20 z-10 pointer-events-none" />
        
        {feature.image ? (
          <img
            src={feature.image}
            alt={`${feature.title} screenshot`}
            loading="lazy"
            className="w-full h-full object-contain rounded-lg sm:rounded-xl shadow-md pointer-events-none"
          />
        ) : (
          /* Fallback Placeholder state */
          <div className="w-full h-full rounded-lg sm:rounded-xl border border-dashed border-[var(--border-main)] bg-[var(--bg-secondary)] flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-2.5 z-0">
            <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">{feature.title}</p>
          </div>
        )}
      </div>

      {/* 28% BOTTOM: Feature Information & CTA */}
      <div className="h-[28%] p-3 sm:p-4.5 flex flex-col justify-between bg-[var(--bg-elevated)] relative z-20">
        <div className="space-y-0.5 sm:space-y-1">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md bg-[var(--accent-light)] border border-[var(--accent-color)]/30 text-[10px] sm:text-[11px] font-semibold text-[var(--accent-color)] uppercase tracking-wider">
              {feature.badge}
            </span>
          </div>

          <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors">
            {feature.title}
          </h3>
          <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
            {feature.description}
          </p>
        </div>

        {/* Minimal CTA */}
        <div className="flex items-center justify-end text-[11px] sm:text-xs font-semibold text-[var(--accent-color)] pt-0.5">
          <span className="flex items-center gap-1 group-hover:gap-2 transition-all">
            Explore {feature.title}
            <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  )
}
