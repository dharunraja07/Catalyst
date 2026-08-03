import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Bot,
  Zap,
  BookOpen,
  TrendingUp,
  Target
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  }

  const fadeUpVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
    }
  }

  const slideRightVariant = {
    hidden: { opacity: 0, x: 30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    }
  }

  // Floating card loop animation (Max translateY: 6px, no scaling/rotation/translateX)
  const floatAnim = (dY = -6, duration = 4, delay = 0) => ({
    y: [0, dY, 0],
    transition: {
      duration,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut',
      delay
    }
  })

  return (
    <section className="relative w-full max-w-full mx-auto overflow-hidden rounded-[24px] sm:rounded-[28px] border border-slate-800/80 bg-slate-950/70 p-6 sm:p-10 lg:p-12 shadow-2xl backdrop-blur-xl text-slate-100">
      {/* Background Ambient Glow & Subtle Grid Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(230,179,37,0.12),transparent_75%)] z-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_60%,rgba(59,130,246,0.07),transparent_60%)] z-0" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] z-0"
        style={{
          backgroundImage: `radial-gradient(rgba(248, 250, 252, 0.4) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Floating Low-Opacity Glowing Ambient Particles */}
      <motion.div
        animate={{ y: [-8, 8, -8], opacity: [0.04, 0.08, 0.04] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute top-12 left-1/4 h-64 w-64 rounded-full bg-[var(--accent-color)] blur-3xl z-0"
      />
      <motion.div
        animate={{ y: [8, -8, 8], opacity: [0.03, 0.07, 0.03] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="pointer-events-none absolute bottom-12 right-1/4 h-72 w-72 rounded-full bg-blue-500 blur-3xl z-0"
      />

      {/* Main Hero Grid: Left Column (44%) & Right Column (56%) */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-[44%_56%] lg:gap-12"
      >
        {/* LEFT COLUMN: Copy & CTAs */}
        <div className="flex flex-col items-start space-y-6 text-left">
          {/* Small Badge */}
          <motion.div variants={fadeUpVariant}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-color)]/30 bg-[var(--accent-light)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--accent-color)] backdrop-blur-md shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[var(--accent-color)] animate-pulse" />
              AI-Powered Personalized Learning
            </span>
          </motion.div>

          {/* Main Heading with Typing Cursor Animation */}
          <motion.h1
            variants={fadeUpVariant}
            className="text-3xl font-extrabold tracking-tight text-[#F8FAFC] sm:text-4xl lg:text-5xl lg:leading-[1.15] min-h-[2.8em] sm:min-h-[2.4em]"
          >
            Learn Smarter with{' '}
            <span className="text-[var(--accent-color)]">
              {displayedText}
            </span>
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-block w-[3.5px] h-[0.85em] bg-[var(--accent-color)] ml-1.5 align-baseline shadow-[0_0_10px_var(--accent-color)]"
            />
          </motion.h1>

          {/* Short Description */}
          <motion.p
            variants={fadeUpVariant}
            className="text-base font-medium text-slate-300 sm:text-lg leading-relaxed max-w-xl"
          >
            Personalized learning paths, interactive AI mentoring, smart progress tracking, and collaborative study groups designed for your success.
          </motion.p>

          {/* Primary & Secondary CTAs */}
          <motion.div
            variants={fadeUpVariant}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-2 z-30"
          >
            <Link
              to={user ? '/dashboard' : '/register'}
              className="saas-button-primary inline-flex items-center justify-center min-h-[48px] px-8 text-base font-bold shadow-[0_8px_25px_-5px_rgba(230,179,37,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_-5px_rgba(230,179,37,0.5)] active:translate-y-0"
            >
              Get Started
            </Link>
            <a
              href="#core-features"
              onClick={scrollToFeatures}
              className="saas-button-secondary inline-flex items-center justify-center min-h-[48px] px-8 text-base font-semibold border-slate-700 bg-slate-900/60 text-slate-200 backdrop-blur-md transition-all duration-300 hover:border-[var(--accent-color)] hover:bg-slate-800/80 hover:text-white"
            >
              Explore Features
            </a>
          </motion.div>
        </div>

        {/* RIGHT COLUMN: Layered Product Showcase within Safe Perimeter Box */}
        <motion.div
          variants={slideRightVariant}
          className="relative w-full max-w-[580px] mx-auto flex items-center justify-center py-10 px-2 sm:px-6"
        >
          {/* 1. Main Catalyst Dashboard Screenshot Window (Z-Index 10) */}
          <div className="relative w-full max-w-[440px] sm:max-w-[460px] lg:max-w-[470px] my-6 rounded-[20px] border border-slate-700/80 bg-slate-900/95 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl overflow-hidden transition-all duration-300 z-10">
            {/* Window Top Controls */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3 select-none">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-[11px] text-slate-400 font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                catalyst.ai/dashboard
              </div>
              <div className="h-3 w-3" />
            </div>

            {/* Dashboard Inner UI Mock */}
            <div className="p-4 sm:p-5 space-y-4 text-left">
              {/* Top Greeting Header */}
              <div className="flex items-center justify-between rounded-[14px] border border-slate-800 bg-slate-950/60 p-3.5">
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-bold text-[var(--accent-color)]">Welcome back</p>
                  <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">Hello, Alex 👋</h3>
                  <p className="text-xs text-slate-400">Your AI Learning Assistant is active.</p>
                </div>
                <div className="rounded-[12px] border border-[var(--accent-color)]/30 bg-[var(--accent-light)] px-3 py-1.5 text-xs font-bold text-[var(--accent-color)]">
                  Focus Goal 83%
                </div>
              </div>

              {/* Grid Widgets Preview */}
              <div className="grid grid-cols-2 gap-3">
                {/* Pomodoro Timer Preview */}
                <div className="rounded-[14px] border border-slate-800 bg-slate-950/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400">Pomodoro Timer</span>
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-extrabold font-mono text-white mt-1.5">24:59</p>
                  <p className="text-[10px] text-emerald-400 mt-1 font-semibold">Focus Active</p>
                </div>

                {/* Daily Progress Bar Preview */}
                <div className="rounded-[14px] border border-slate-800 bg-slate-950/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400">Today's Study</span>
                    <span className="text-xs font-bold text-[var(--accent-color)]">75 / 90 min</span>
                  </div>
                  <div className="mt-2.5 h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--accent-color)] w-[83%]" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 font-medium">15 min to goal</p>
                </div>
              </div>

              {/* Activity Module Strip */}
              <div className="rounded-[14px] border border-slate-800 bg-slate-950/40 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[var(--accent-color)]">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-[170px]">Full-Stack Web Dev</p>
                    <p className="text-[10px] text-slate-400">Module 4: React Hooks</p>
                  </div>
                </div>
                <span className="rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5">
                  85% Done
                </span>
              </div>
            </div>
          </div>

          {/* 2. Floating Card 1: AI Chat Window (Top Right Perimeter - Z-Index 20) */}
          <motion.div
            animate={floatAnim(-6, 4.2, 0)}
            className="absolute top-0 right-0 z-20 w-[190px] sm:w-[210px] rounded-[16px] border border-[var(--accent-color)]/40 bg-slate-900/95 p-2.5 shadow-[0_15px_35px_rgba(0,0,0,0.5)] backdrop-blur-md hidden sm:block text-left"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="h-5 w-5 rounded-lg bg-[var(--accent-color)] text-black flex items-center justify-center font-bold shrink-0">
                <Bot className="h-3 w-3" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-white leading-tight">Catalyst AI Mentor</p>
                <p className="text-[8px] text-slate-400">Real-time guidance</p>
              </div>
            </div>
            <div className="rounded-xl bg-slate-950/80 p-2 border border-slate-800 text-[9px] text-slate-200 leading-snug">
              "Great progress! Ready for the practice quiz on Async JS?"
            </div>
          </motion.div>

          {/* 3. Floating Card 2: Progress Analytics Card (Bottom Right Perimeter - Z-Index 20) */}
          <motion.div
            animate={floatAnim(-6, 4.8, 0.5)}
            className="absolute bottom-0 right-0 z-20 w-[180px] sm:w-[195px] rounded-[16px] border border-slate-700 bg-slate-900/95 p-2.5 shadow-[0_15px_35px_rgba(0,0,0,0.5)] backdrop-blur-md hidden sm:block text-left"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-3 w-3" />
                </div>
                <span className="text-[11px] font-bold text-white">Weekly Focus</span>
              </div>
              <span className="text-[8px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                +24%
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base font-extrabold text-white">18.5 hrs</span>
              {/* Mini Sparkline Bar Chart */}
              <div className="flex items-end gap-1 h-4">
                <span className="w-1 h-2 bg-amber-500/40 rounded-sm" />
                <span className="w-1 h-3 bg-amber-500/60 rounded-sm" />
                <span className="w-1 h-1.5 bg-amber-500/30 rounded-sm" />
                <span className="w-1 h-3.5 bg-amber-500/80 rounded-sm" />
                <span className="w-1 h-4 bg-[var(--accent-color)] rounded-sm" />
              </div>
            </div>
          </motion.div>

          {/* 4. Floating Card 3: Smart Practice Drill Card (Bottom Left Perimeter - Z-Index 20) */}
          <motion.div
            animate={floatAnim(-5, 4.5, 0.2)}
            className="absolute bottom-0 left-0 z-20 w-[180px] sm:w-[195px] rounded-[16px] border border-slate-700 bg-slate-900/95 p-2.5 shadow-[0_15px_35px_rgba(0,0,0,0.5)] backdrop-blur-md hidden sm:block text-left"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-5 w-5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <Target className="h-3 w-3" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-white leading-tight">Smart Practice</p>
                <p className="text-[8px] text-slate-400">Adaptive Drills</p>
              </div>
            </div>
            <div className="w-full bg-slate-950/80 rounded-lg p-1.5 border border-slate-800 text-[9px] text-emerald-400 font-semibold truncate flex items-center justify-between">
              <span>Diagnostic Accuracy</span>
              <span className="font-bold text-white">94%</span>
            </div>
          </motion.div>

          {/* 5. Floating Card 4: Small Notification Card (Top Left Perimeter - Z-Index 20) */}
          <motion.div
            animate={floatAnim(-6, 5, 0.7)}
            className="absolute top-0 left-0 z-20 rounded-[14px] border border-amber-500/40 bg-slate-900/95 px-2.5 py-1.5 shadow-[0_15px_35px_rgba(0,0,0,0.5)] backdrop-blur-md hidden sm:flex items-center gap-2 text-left"
          >
            <div className="h-4.5 w-4.5 rounded-full bg-amber-500/20 text-[var(--accent-color)] flex items-center justify-center shrink-0">
              <Zap className="h-2.5 w-2.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white leading-tight">🎯 Goal Reached!</p>
              <p className="text-[8px] text-amber-400 font-semibold">5-Day Streak Active 🔥</p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}
