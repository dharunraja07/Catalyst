import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'

import { UserCheck, BrainCircuit, Compass, BookOpenCheck, Users, Award } from 'lucide-react'

const STEPS = [
  {
    step: 1,
    title: 'Create Catalyst Account',
    description: 'Secure sign-up using Email or Google Authentication.',
    IconComponent: UserCheck,
    badge: 'ONBOARDING'
  },
  {
    step: 2,
    title: 'Complete Adaptive Assessment',
    description: 'AI evaluates strengths, weaknesses and learning level.',
    IconComponent: BrainCircuit,
    badge: 'AI ASSESSMENT'
  },
  {
    step: 3,
    title: 'Receive Personalized Roadmap',
    description: 'AI generates a customized study plan.',
    IconComponent: Compass,
    badge: 'PERSONALIZED'
  },
  {
    step: 4,
    title: 'Learn & Practice',
    description: 'Study with AI Mentor, adaptive practice questions and coding challenges.',
    IconComponent: BookOpenCheck,
    badge: 'ACTIVE LEARNING'
  },
  {
    step: 5,
    title: 'Collaborate & Track Progress',
    description: 'Join Study Groups, attend live meetings and monitor learning analytics.',
    IconComponent: Users,
    badge: 'COLLABORATION'
  },
  {
    step: 6,
    title: 'Become Career Ready',
    description: 'Complete roadmap milestones and receive career recommendations.',
    IconComponent: Award,
    badge: 'CAREER READY'
  }
]

export default function LearningJourneySection() {
  const containerRef = useRef(null)
  const scrollParentRef = useRef(null)
  const [scrollParent, setScrollParent] = useState(undefined)

  // Dynamically detect if running inside logged-in AppLayout (overflow-y-auto div) or logged-out (window)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let parent = el.parentElement
    while (parent && parent !== document.body && parent !== document.documentElement) {
      const overflowY = window.getComputedStyle(parent).overflowY
      if (overflowY === 'auto' || overflowY === 'scroll') {
        scrollParentRef.current = parent
        setScrollParent(parent)
        break
      }
      parent = parent.parentElement
    }
  }, [])

  // Fluid 1:1 Scroll Progress tracking with dynamic scroll container target
  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: scrollParent ? scrollParentRef : undefined,
    offset: ['start 65%', 'end 80%']
  })

  // Ultra-smooth spring physics (60 FPS GPU-accelerated interpolation)
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 24,
    mass: 0.2,
    restDelta: 0.0001
  })

  return (
    <section
      ref={containerRef}
      className="saas-card shadow-glow relative space-y-10 sm:space-y-14 overflow-hidden rounded-3xl border border-[var(--border-main)] bg-[var(--bg-secondary)] p-6 sm:p-10 lg:p-14 transition-colors duration-300"
    >
      {/* Background Enhancements: Soft Radial Lighting & Subtle Low-Opacity Particle Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--accent-color)]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--accent-color)]/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 relative z-10">
        <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">
          Learning Journey
        </p>
        <h2 className="section-title text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
          Your step-by-step path to career readiness.
        </h2>
      </div>

      {/* Timeline Container */}
      <div className="max-w-3xl mx-auto relative pl-10 sm:pl-16 pr-2 space-y-10 sm:space-y-14">
        {/* Layer 1: Background Thin Gray Line */}
        <div className="absolute left-[8.5px] sm:left-[18.5px] top-7 bottom-7 w-[3px] bg-[var(--border-main)]/60 rounded-full pointer-events-none" />

        {/* Layer 2: Foreground Catalyst Gold Continuous Progress Line */}
        <motion.div
          style={{ scaleY: smoothProgress }}
          className="absolute left-[8.5px] sm:left-[18.5px] top-7 bottom-7 w-[3px] bg-gradient-to-b from-[var(--accent-color)] via-amber-400 to-[var(--accent-color)] origin-top rounded-full shadow-[0_0_16px_var(--accent-color)] z-10 pointer-events-none"
        />

        {/* 6 Interactive Milestone Step Cards */}
        {STEPS.map((item, idx) => (
          <TimelineStepCard
            key={item.step}
            item={item}
            index={idx}
            totalSteps={STEPS.length}
            smoothProgress={smoothProgress}
          />
        ))}
      </div>
    </section>
  )
}

function TimelineStepCard({ item, index, totalSteps, smoothProgress }) {
  const stepStart = index / totalSteps
  const stepPeak = (index + 0.5) / totalSteps

  // Dynamic transforms calculated along scroll progress curve
  const opacity = useTransform(smoothProgress, [Math.max(0, stepStart - 0.1), stepStart], [0, 1])
  const y = useTransform(smoothProgress, [Math.max(0, stepStart - 0.1), stepStart], [40, 0])
  const scale = useTransform(smoothProgress, [Math.max(0, stepStart - 0.1), stepStart], [0.95, 1])
  const filter = useTransform(
    smoothProgress,
    [Math.max(0, stepStart - 0.1), stepStart],
    ['blur(8px)', 'blur(0px)']
  )

  // Node active indicator animations
  const dotScale = useTransform(
    smoothProgress,
    [Math.max(0, stepStart - 0.05), stepStart, stepPeak],
    [1, 1.35, 1]
  )

  const IconComp = item.IconComponent

  return (
    <div className="relative z-20">
      {/* Interactive Vector Icon Squircle Node (Matching uploaded sidebar design) */}
      <motion.div
        style={{ scale: dotScale }}
        className="absolute -left-[52px] sm:-left-[68px] top-4 sm:top-5 h-11 w-11 sm:h-12 sm:w-12 rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] flex items-center justify-center z-20 shadow-md transition-colors duration-300 group-hover:border-[var(--accent-color)]"
      >
        <motion.div
          style={{ opacity }}
          className="absolute inset-0 rounded-[16px] bg-[var(--accent-color)] shadow-[0_0_20px_rgba(230,179,37,0.4)] pointer-events-none"
        />

        {/* Pulse Ripple Ring on Active Node */}
        <span className="absolute inset-0 rounded-[16px] bg-[var(--accent-color)]/30 animate-ping opacity-60 pointer-events-none" />

        {/* Vector Line Icon inside Node */}
        <IconComp className="h-5 w-5 sm:h-6 sm:w-6 z-10 transition-transform duration-300 text-[var(--text-secondary)] group-hover:text-black group-hover:scale-110" />
      </motion.div>

      {/* Milestone Step Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95, filter: 'blur(8px)' }}
        whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        viewport={{ once: false, amount: 0.15 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.02, y: -4 }}
        className="saas-elevated-card group relative rounded-2xl sm:rounded-3xl border border-[var(--border-main)] bg-[var(--bg-elevated)] p-5 sm:p-7 shadow-lg transition-colors duration-300 hover:border-[var(--accent-color)] hover:shadow-[0_15px_40px_rgba(230,179,37,0.2)] cursor-pointer"
      >
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)]">
              <IconComp className="h-5 w-5" />
            </div>
            <h4 className="card-title font-extrabold text-base sm:text-lg text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors duration-200">
              {item.title}
            </h4>
          </div>
          <span className="self-start sm:self-auto px-2.5 py-0.5 rounded-md bg-[var(--accent-light)] border border-[var(--accent-color)]/30 text-[10px] sm:text-[11px] font-semibold text-[var(--accent-color)] uppercase tracking-wider">
            {item.badge}
          </span>
        </div>

        {/* Description */}
        <p className="body-text text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed pl-0 sm:pl-12">
          {item.description}
        </p>

        {/* Hover Gold Accent Border */}
        <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent-color)]/0 to-transparent group-hover:via-[var(--accent-color)]/70 transition-all duration-500" />
      </motion.div>
    </div>
  )
}
