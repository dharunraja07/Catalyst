import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { FEATURES } from '../data/featuresData.js'

export default function CoreFeaturesShowcase() {
  const targetRef = useRef(null)
  const navigate = useNavigate()
  const auth = useAuth()
  const user = auth?.user

  // Track vertical scroll progress inside the pinned section
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start start', 'end end']
  })

  const totalCards = FEATURES.length
  // Translate track width percentage: -(N-1)/N * 100% moves smoothly from Card 1 to Card N
  const endPercentage = -((totalCards - 1) / totalCards * 92)
  const rawX = useTransform(scrollYProgress, [0, 1], ['0%', `${endPercentage}%`])
  // Convert raw percentage to CSS translateX string
  const transform = useTransform(rawX, (v) => `translateX(${v})`)

  const handleCardClick = (route) => {
    navigate(user ? route : '/login')
  }

  return (
    <div ref={targetRef} className="relative h-[350vh] w-full">
      {/* Pinned Sticky Viewport Container */}
      <div className="sticky top-0 flex h-screen w-full flex-col justify-center overflow-hidden bg-[var(--bg-primary)] py-6 border-y border-[var(--border-main)] shadow-xl transition-colors duration-300">
        
        {/* Section Header */}
        <div className="z-10 text-center max-w-3xl mx-auto px-4 mb-4 sm:mb-8 space-y-2 shrink-0">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--accent-light)] border border-[var(--accent-color)]/30 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-color)]">
            <span className="h-2 w-2 rounded-full bg-[var(--accent-color)] animate-ping" />
            Core Platform Showcase
          </div>
          <h2 className="section-title text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Everything you need to excel in your studies.
          </h2>
          <p className="body-text text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl mx-auto hidden sm:block">
            Scroll vertically to explore Catalyst&apos;s AI-powered learning modules in action.
          </p>
        </div>

        {/* Horizontal Track Container */}
        <div className="relative w-full overflow-hidden flex items-center py-4">
          <motion.div style={{ transform }} className="flex gap-6 sm:gap-8 px-[8vw] items-center">
            {FEATURES.map((feature, index) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                index={index}
                totalCards={totalCards}
                onClick={() => handleCardClick(feature.route)}
              />
            ))}
          </motion.div>
        </div>

        {/* Dynamic Progress Bar & Scroll Indicator */}
        <div className="z-10 mt-4 flex items-center justify-center gap-3">
          <div className="h-1.5 w-48 sm:w-64 rounded-full bg-[var(--border-main)] overflow-hidden relative">
            <motion.div
              style={{ scaleX: scrollYProgress, transformOrigin: 'left' }}
              className="h-full bg-[var(--accent-color)] rounded-full"
            />
          </div>
          <span className="text-[11px] font-mono font-medium text-[var(--text-muted)] tracking-wider">
            SCROLL TO EXPLORE
          </span>
        </div>

      </div>
    </div>
  )
}

function FeatureCard({ feature, index, totalCards, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className="group cursor-pointer shrink-0 w-[85vw] sm:w-[480px] md:w-[540px] lg:w-[580px] h-[460px] sm:h-[510px] rounded-3xl border border-[var(--border-main)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-[var(--accent-color)] hover:shadow-[0_20px_50px_rgba(230,179,37,0.25)] relative"
    >
      {/* Ambient Glow Accent */}
      <div
        className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[var(--accent-light)] opacity-30 blur-3xl group-hover:opacity-60 transition-opacity duration-500 pointer-events-none"
      />

      {/* 75% TOP: Screenshot Showcase */}
      <div className="relative h-[74%] w-full overflow-hidden bg-[var(--bg-primary)] p-3 sm:p-4 flex items-center justify-center rounded-t-3xl border-b border-[var(--border-main)]">
        {/* Inner Overlay for natural blending in Dark & Light mode */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-elevated)]/80 via-transparent to-[var(--bg-primary)]/20 z-10 pointer-events-none" />
        
        {feature.image ? (
          <img
            src={feature.image}
            alt={`${feature.title} screenshot`}
            loading="lazy"
            className="w-full h-full object-contain rounded-xl shadow-lg transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          /* Reserved Placeholder state for features 6, 7, 8 */
          <div className="w-full h-full rounded-xl border border-dashed border-[var(--border-main)] bg-[var(--bg-secondary)] flex flex-col items-center justify-center p-6 text-center space-y-3 z-0">
            <div className="h-12 w-12 rounded-2xl bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] font-bold text-lg">
              {index + 1}
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{feature.placeholderText}</p>
            <p className="text-xs text-[var(--text-muted)] max-w-xs">
              This card will automatically display the uploaded screenshot when added to the data array.
            </p>
          </div>
        )}

        {/* Feature Index Badge */}
        <div className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full bg-[var(--bg-elevated)]/90 border border-[var(--border-main)] text-[11px] font-mono font-medium text-[var(--text-secondary)] shadow-sm backdrop-blur-md">
          0{index + 1} / 0{totalCards}
        </div>
      </div>

      {/* 25% BOTTOM: Feature Information & CTA */}
      <div className="h-[26%] p-4 sm:p-5 flex flex-col justify-between bg-[var(--bg-elevated)] relative z-20">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-md bg-[var(--accent-light)] border border-[var(--accent-color)]/30 text-[11px] font-semibold text-[var(--accent-color)] uppercase tracking-wider">
              {feature.badge}
            </span>
            <span className="text-xs font-mono text-[var(--text-muted)] group-hover:text-[var(--accent-color)] transition-colors">
              {feature.route}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors">
            {feature.title}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
            {feature.description}
          </p>
        </div>

        {/* Minimal CTA */}
        <div className="flex items-center justify-end text-xs font-semibold text-[var(--accent-color)] pt-1">
          <span className="flex items-center gap-1 group-hover:gap-2 transition-all">
            Explore {feature.title}
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
        </div>
      </div>
    </motion.div>
  )
}
