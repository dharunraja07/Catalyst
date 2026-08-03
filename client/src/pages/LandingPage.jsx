import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bot,
  FileSpreadsheet,
  Compass,
  TrendingUp,
  Target,
  Users,
  Video,
  Briefcase,
  UserPlus,
  FileCheck,
  MapPin,
  Sparkles,
  BarChart3,
  Award
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import HeroSection from '../components/HeroSection.jsx'
import CoreFeaturesShowcase from '../components/CoreFeaturesShowcase.jsx'
import LearningJourneySection from '../components/LearningJourneySection.jsx'

export default function LandingPage() {
  const { user, api } = useAuth()
  const [stats, setStats] = useState({
    students: '0',
    assessmentsGenerated: '0',
    completionRate: '95%',
    aiMentor: '24/7'
  })

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await api.get('/stats')
        if (response.data) {
          setStats(response.data)
        }
      } catch {
        // keep defaults
      }
    }
    loadStats()
  }, [api])

  const scrollToFeatures = (e) => {
    e.preventDefault()
    const elem = document.getElementById('core-features')
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className={`mx-auto w-full max-w-[1600px] max-w-full overflow-x-hidden px-3 sm:px-6 lg:px-8 pb-16 ${user ? 'space-y-6 sm:space-y-8 pt-0' : 'space-y-8 sm:space-y-12'}`}>

      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Statistics Section */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {[
          { label: 'Students', value: stats.students },
          { label: 'Assessments Generated', value: stats.assessmentsGenerated },
          { label: 'Completion Rate', value: stats.completionRate },
          { label: 'AI Mentor', value: stats.aiMentor }
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.7, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="gold-orbit-card text-center py-5 sm:py-8 px-3 sm:px-4 flex flex-col items-center justify-center cursor-pointer select-none"
          >
            <p className="page-title text-3xl sm:text-5xl font-extrabold text-[var(--accent-color)] tracking-tight">
              {item.value}
            </p>
            <p className="card-title text-xs sm:text-base mt-2 font-semibold text-[var(--text-secondary)]">
              {item.label}
            </p>
          </motion.div>
        ))}
      </section>

      {/* 3. Why Catalyst - Bento Grid Section */}
      <section className="saas-card shadow-glow space-y-6 sm:space-y-8 p-4 sm:p-8 lg:p-10 rounded-2xl sm:rounded-[28px] border border-[var(--border-main)] bg-[var(--bg-secondary)]">
        <div className="text-center max-w-3xl mx-auto space-y-2 sm:space-y-3">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold text-xs sm:text-sm">
            Why Catalyst
          </p>
          <h2 className="section-title text-xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight leading-snug">
            Built for personalized, high-efficiency learning.
          </h2>
          <p className="body-text text-xs sm:text-base text-[var(--text-secondary)]">
            Explore the core ecosystem powers engineered to transform your academic journey.
          </p>
        </div>

        {/* 8-Card Responsive Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {[
            {
              title: 'AI Mentor',
              description: 'Get instant AI-powered guidance, explanations, doubt solving and personalized academic support.',
              icon: Bot,
              badge: '24/7 SUPPORT'
            },
            {
              title: 'Adaptive Assessments',
              description: "Generate intelligent quizzes and assessments based on each student's learning level.",
              icon: FileSpreadsheet,
              badge: 'DIAGNOSTIC'
            },
            {
              title: 'Personalized Roadmaps',
              description: 'AI creates customized learning plans according to student goals and progress.',
              icon: Compass,
              badge: 'SMART PATH'
            },
            {
              title: 'Progress Analytics',
              description: 'Monitor learning consistency, assessment performance, study hours and skill growth using real-time analytics.',
              icon: TrendingUp,
              badge: 'REAL-TIME'
            },
            {
              title: 'Smart Practice',
              description: 'Practice adaptive coding questions, 2-mark questions and long-answer questions generated dynamically.',
              icon: Target,
              badge: 'ADAPTIVE DRILLS'
            },
            {
              title: 'Study Groups',
              description: 'Collaborate with classmates, share knowledge, participate in discussions and learn together.',
              icon: Users,
              badge: 'COLLABORATIVE'
            },
            {
              title: 'Live Video Collaboration',
              description: 'Attend live meetings powered by Jitsi with screen sharing, whiteboard collaboration and group discussions.',
              icon: Video,
              badge: 'REAL-TIME MEET'
            },
            {
              title: 'Career Guidance',
              description: 'Receive AI-powered career recommendations, skill suggestions and roadmap planning.',
              icon: Briefcase,
              badge: 'CAREER READY'
            }
          ].map((item, idx) => {
            const IconComp = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 25, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.5, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6, scale: 1.015 }}
                className={`group relative overflow-hidden rounded-2xl sm:rounded-[22px] border border-[var(--border-main)] bg-[var(--bg-elevated)] p-4.5 sm:p-6 shadow-md transition-all duration-300 hover:border-[var(--accent-color)] hover:shadow-[0_15px_35px_rgba(230,179,37,0.18)] flex flex-col justify-between ${item.colSpan || ''}`}
              >
                {/* Ambient Glow Pill Accent */}
                <div className="absolute -top-16 -left-16 h-44 w-44 rounded-full bg-[var(--accent-light)] blur-3xl opacity-20 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none" />

                <div className="space-y-3 sm:space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] group-hover:scale-110 group-hover:bg-[var(--accent-color)] group-hover:text-black transition-all duration-300 shadow-sm shrink-0">
                      <IconComp className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                    </div>
                    <span className="px-2 sm:px-2.5 py-0.5 rounded-md bg-[var(--accent-light)] border border-[var(--accent-color)]/30 text-[10px] font-bold text-[var(--accent-color)] uppercase tracking-wider">
                      {item.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="card-title text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors duration-200">
                      {item.title}
                    </h3>
                    <p className="body-text text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 sm:mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Bottom Border Accent Line */}
                <div className="mt-4 sm:mt-5 h-[2px] w-0 bg-[var(--accent-color)] group-hover:w-full transition-all duration-500 rounded-full" />
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* 4. How Catalyst Works - 7-Step Connected Workflow Section */}
      <section className="saas-card shadow-glow space-y-6 sm:space-y-10 p-4 sm:p-8 lg:p-10 rounded-2xl sm:rounded-[28px] border border-[var(--border-main)] bg-[var(--bg-secondary)]">
        <div className="text-center max-w-3xl mx-auto space-y-2 sm:space-y-3">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold text-xs sm:text-sm">
            How Catalyst Works
          </p>
          <h2 className="section-title text-xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight leading-snug">
            Seven simple steps to master any subject.
          </h2>
          <p className="body-text text-xs sm:text-base text-[var(--text-secondary)]">
            From seamless onboarding to career readiness, experience an end-to-end intelligent workflow.
          </p>
        </div>

        {/* Connected Step Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 relative">
          {[
            {
              step: 1,
              title: 'Create Account',
              description: 'Register securely using Email or Continue with Google.',
              icon: UserPlus
            },
            {
              step: 2,
              title: 'Take AI Assessment',
              description: 'Evaluate current knowledge using adaptive assessments.',
              icon: FileCheck
            },
            {
              step: 3,
              title: 'Receive Personalized Roadmap',
              description: 'AI generates an intelligent roadmap based on assessment results and career goals.',
              icon: MapPin
            },
            {
              step: 4,
              title: 'Learn Smarter',
              description: 'Study with AI Mentor, Practice, Roadmaps and Live Study Groups.',
              icon: Sparkles
            },
            {
              step: 5,
              title: 'Collaborate Live',
              description: 'Join Study Groups and Live Video Collaboration sessions with classmates.',
              icon: Video
            },
            {
              step: 6,
              title: 'Track Progress',
              description: 'View detailed analytics, learning consistency, study hours and achievements.',
              icon: BarChart3
            },
            {
              step: 7,
              title: 'Become Career Ready',
              description: 'Complete roadmap milestones, improve skills and receive AI-powered career guidance.',
              icon: Award,
              colSpan: 'sm:col-span-2 lg:col-span-2'
            }
          ].map((stepItem, idx) => {
            const StepIcon = stepItem.icon
            return (
              <motion.div
                key={stepItem.step}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.5, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -5 }}
                className={`group relative rounded-2xl sm:rounded-[22px] border border-[var(--border-main)] bg-[var(--bg-elevated)] p-4.5 sm:p-6 shadow-md transition-all duration-300 hover:border-[var(--accent-color)] hover:shadow-[0_15px_35px_rgba(230,179,37,0.15)] flex flex-col justify-between ${stepItem.colSpan || ''}`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[var(--accent-color)] text-black font-extrabold text-xs sm:text-sm shadow-md group-hover:scale-110 transition-transform">
                      {stepItem.step}
                    </span>
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] shrink-0">
                      <StepIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                    </div>
                  </div>

                  <div>
                    <h4 className="card-title text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors">
                      {stepItem.title}
                    </h4>
                    <p className="body-text text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                      {stepItem.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* 6. Core Features Section */}
      <section id="core-features" className="w-full max-w-full overflow-hidden rounded-2xl sm:rounded-3xl">
        <CoreFeaturesShowcase />
      </section>

      {/* 7. Learning Journey Vertical Roadmap */}
      <LearningJourneySection />

      {/* 8. Why Choose Catalyst Comparison Table Section */}
      <section className="saas-card shadow-glow space-y-6 sm:space-y-8 p-4 sm:p-8 lg:p-10 rounded-2xl sm:rounded-[28px] border border-[var(--border-main)] bg-[var(--bg-secondary)]">
        <div className="text-center max-w-3xl mx-auto space-y-2 sm:space-y-3">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold text-xs sm:text-sm">
            Why Choose Catalyst
          </p>
          <h2 className="section-title text-xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight leading-snug">
            Designed specifically for student success.
          </h2>
          <p className="body-text text-xs sm:text-base text-[var(--text-secondary)]">
            Compare Catalyst’s comprehensive learning suite against standard static platforms.
          </p>
        </div>

        {/* 12-Feature Ecosystem Table */}
        <div className="max-w-4xl mx-auto overflow-hidden rounded-2xl sm:rounded-[22px] border border-[var(--border-main)] bg-[var(--bg-elevated)] shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[320px]">
              <thead>
                <tr className="border-b border-[var(--divider-main)] bg-[var(--bg-primary)]/80 text-xs sm:text-sm font-bold">
                  <th className="p-3 sm:p-5 text-[var(--text-primary)]">Feature</th>
                  <th className="p-3 sm:p-5 text-center text-[var(--accent-color)]">Catalyst</th>
                  <th className="p-3 sm:p-5 text-center text-[var(--text-secondary)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--divider-main)] text-xs sm:text-sm font-medium">
                {[
                  { name: 'AI Mentor', status: 'Included' },
                  { name: 'Adaptive Assessments', status: 'Included' },
                  { name: 'Personalized Roadmaps', status: 'Included' },
                  { name: 'Live Video Collaboration', status: 'Included' },
                  { name: 'Collaborative Study Groups', status: 'Included' },
                  { name: 'Progress Analytics', status: 'Included' },
                  { name: 'Smart Practice', status: 'Included' },
                  { name: 'Career Guidance', status: 'Included' },
                  { name: 'Pomodoro Productivity', status: 'Included' },
                  { name: 'Google Authentication', status: 'Included' },
                  { name: 'Real-time Dashboard', status: 'Included' },
                  { name: 'Personalized Learning', status: 'Included' }
                ].map((row) => (
                  <tr
                    key={row.name}
                    className="hover:bg-[var(--accent-light)]/20 transition-colors duration-200 group"
                  >
                    <td className="p-3 sm:p-5 font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors">
                      {row.name}
                    </td>
                    <td className="p-3 sm:p-5 text-center">
                      <span className="inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-[var(--accent-light)] border border-[var(--accent-color)]/40 text-[var(--accent-color)] font-extrabold text-xs sm:text-sm shadow-sm group-hover:scale-110 transition-transform">
                        ✓
                      </span>
                    </td>
                    <td className="p-3 sm:p-5 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] sm:text-[11px] font-bold text-emerald-400">
                        <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-400 animate-pulse" />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 9. Final Call To Action */}
      <section className="saas-elevated-card shadow-glow text-center p-6 sm:p-12 space-y-4 sm:space-y-6 border border-[var(--accent-color)]/30 bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-secondary)] rounded-2xl sm:rounded-3xl">
        <h2 className="page-title text-2xl sm:text-4xl font-extrabold">Ready to Learn Smarter?</h2>
        <p className="body-text text-sm sm:text-lg max-w-xl mx-auto">
          Join thousands of students learning with Catalyst.
        </p>
        <div className="pt-2">
          <Link to={user ? "/dashboard" : "/register"} className="saas-button-primary inline-flex items-center justify-center min-h-[48px] px-8 sm:px-10 text-sm sm:text-base font-semibold cursor-pointer w-full sm:w-auto">
            Get Started
          </Link>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="saas-card p-5 sm:p-8 space-y-6 sm:space-y-8 border-t border-[var(--border-main)] rounded-2xl sm:rounded-3xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left Footer Branding */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <img
                src="/favicon.png"
                alt="Catalyst Logo"
                className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-[12px] object-cover shadow-sm border border-[var(--accent-color)]/30"
              />
              <span className="card-title font-bold text-lg sm:text-xl">Catalyst</span>
            </div>
            <p className="small-text text-[var(--text-secondary)] text-xs sm:text-sm">AI Powered Personalized Learning</p>
          </div>

          {/* Right Footer Links */}
          <div className="flex flex-wrap gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
            <a href="#core-features" onClick={scrollToFeatures} className="hover:text-[var(--accent-color)] transition py-1">Features</a>
            <Link to="/about" className="hover:text-[var(--accent-color)] transition py-1">About</Link>
            <Link to="/privacy" className="hover:text-[var(--accent-color)] transition py-1">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[var(--accent-color)] transition py-1">Terms</Link>
            <Link to="/contact" className="hover:text-[var(--accent-color)] transition py-1">Contact</Link>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="border-t border-[var(--divider-main)] pt-5 text-center text-xs text-[var(--text-muted)]">
          © 2026 Catalyst. All Rights Reserved.
        </div>
      </footer>
    </div>
  )
}
