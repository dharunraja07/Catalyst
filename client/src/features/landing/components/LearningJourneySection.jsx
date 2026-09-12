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
  const [scrollParent, setScrollParent] = useState(undefined)

  // Dynamically detect scroll parent
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let parent = el.parentElement
    while (parent && parent !== document.body) {
      const style = window.getComputedStyle(parent)
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        setScrollParent(parent)
        return
      }
      parent = parent.parentElement
    }
    setScrollParent(window)
  }, [])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: scrollParent ? { current: scrollParent === window ? undefined : scrollParent } : undefined,
    offset: ['start 75%', 'end 35%']
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 24,
    mass: 0.2,
    restDelta: 0.0001
  })

  return (
    <section
      ref={containerRef}
      className="relative space-y-8 sm:space-y-12 py-6 text-[var(--text-primary)]"
    >
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-2.5 relative z-10">
        <p className="caption-text uppercase tracking-widest text-[var(--text-metadata)] font-semibold text-xs sm:text-sm">
          Learning Journey
        </p>
        <h2 className="section-title text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
          Your step-by-step path to career readiness.
        </h2>
      </div>

      {/* Timeline Container */}
      <div className="max-w-3xl mx-auto relative pl-11 sm:pl-16 pr-1 space-y-6 sm:space-y-10">
        {/* Layer 1: Background Thin Gray Line */}
        <div className="absolute left-[13.5px] sm:left-[18.5px] top-6 bottom-6 w-[2px] bg-[var(--border-main)] rounded-full pointer-events-none" />

        {/* Layer 2: Foreground Continuous Progress Line */}
        <motion.div
          style={{ scaleY: smoothProgress }}
          className="absolute left-[13.5px] sm:left-[18.5px] top-6 bottom-6 w-[2px] bg-[var(--accent-color)] origin-top rounded-full z-10 pointer-events-none"
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

  const dotScale = useTransform(
    smoothProgress,
    [Math.max(0, stepStart - 0.05), stepStart, stepPeak],
    [1, 1.2, 1]
  )

  const IconComp = item.IconComponent

  return (
    <div className="relative z-20">
      {/* Icon Node */}
      <motion.div
        style={{ scale: dotScale }}
        className="absolute -left-[45px] sm:-left-[68px] top-3 sm:top-4 h-9 w-9 sm:h-11 sm:w-11 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-secondary)] flex items-center justify-center z-20 shadow-sm transition-colors duration-200"
      >
        <IconComp className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--text-primary)]" />
      </motion.div>

      {/* Milestone Step Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="group relative rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-sm transition-all duration-200 hover:border-[var(--accent-color)] hover:-translate-y-0.5"
      >
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-2">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-main)] flex items-center justify-center text-[var(--accent-color)] shrink-0">
              <IconComp className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <h4 className="card-title font-bold text-base sm:text-lg text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors duration-200">
              {item.title}
            </h4>
          </div>
          <span className="self-start sm:self-auto px-2.5 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[10px] font-semibold text-[var(--text-metadata)] uppercase tracking-wider">
            {item.badge}
          </span>
        </div>

        {/* Description */}
        <p className="body-text text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed pl-0 sm:pl-12">
          {item.description}
        </p>
      </motion.div>
    </div>
  )
}
