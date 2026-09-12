import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext.jsx'

export default function HeroSection() {
  const { user } = useAuth()

  // Typewriter effect state
  const phrases = [
    'an AI Mentor That Adapts to Your Pace.',
    'Personalized Learning Paths & Analytics.',
    'Smart Roadmaps Built for Your Career.',
    'Real-Time Mentorship & Skill Insights.'
  ]
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex]
    const speed = isDeleting ? 25 : 45

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setDisplayedText(currentPhrase.slice(0, displayedText.length + 1))
        if (displayedText.length + 1 === currentPhrase.length) {
          setTimeout(() => setIsDeleting(true), 2500)
        }
      } else {
        setDisplayedText(currentPhrase.slice(0, displayedText.length - 1))
        if (displayedText.length - 1 === 0) {
          setIsDeleting(false)
          setPhraseIndex((prev) => (prev + 1) % phrases.length)
        }
      }
    }, speed)

    return () => clearTimeout(timeout)
  }, [displayedText, isDeleting, phraseIndex])

  const scrollToFeatures = (e) => {
    e.preventDefault()
    const elem = document.getElementById('core-features')
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Subtle single-trigger reveal animation
  const containerVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
    }
  }

  return (
    <section className="relative w-full py-12 sm:py-20 lg:py-24 text-[var(--text-primary)]">
      {/* Subtle Ambient Background Lighting - No Card Containers */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_20%,rgba(79,111,239,0.08),transparent_70%)] z-0" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center space-y-6 sm:space-y-8 px-4"
      >
        {/* Minimal Pill Badge */}
        <motion.div variants={itemVariants}>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-metadata)] shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent-color)]" />
            <span>AI-Powered Learning Platform</span>
          </span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          variants={itemVariants}
          className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.15] max-w-3xl"
        >
          Learn Smarter with{' '}
          <span className="text-[var(--accent-color)]">
            {displayedText}
          </span>
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-block w-[3px] h-[0.85em] bg-[var(--accent-color)] ml-1.5 align-baseline"
          />
        </motion.h1>

        {/* Short Description */}
        <motion.p
          variants={itemVariants}
          className="text-base sm:text-lg lg:text-xl font-normal text-[var(--text-secondary)] leading-relaxed max-w-2xl"
        >
          Personalized learning paths, interactive AI mentoring, smart progress tracking, and collaborative study groups designed for academic and career growth.
        </motion.p>

        {/* Action CTAs */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto pt-2"
        >
          <Link
            to={user ? '/dashboard' : '/register'}
            className="saas-button-primary inline-flex items-center justify-center gap-2 min-h-[48px] px-8 text-base font-semibold rounded-xl text-white bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] transition-all duration-200 cursor-pointer w-full sm:w-auto shadow-sm"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#core-features"
            onClick={scrollToFeatures}
            className="saas-button-secondary inline-flex items-center justify-center min-h-[48px] px-8 text-base font-medium rounded-xl border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--accent-color)] hover:bg-[var(--bg-surface)] transition-all duration-200 cursor-pointer w-full sm:w-auto"
          >
            Explore Features
          </a>
        </motion.div>
      </motion.div>
    </section>
  )
}
