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
import HeroSection from '../features/landing/components/HeroSection.jsx'
import CoreFeaturesShowcase from '../features/landing/components/CoreFeaturesShowcase.jsx'
import LearningJourneySection from '../features/landing/components/LearningJourneySection.jsx'

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

  const sectionVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
    }
  }

  return (
    <div className={`mx-auto w-full max-w-[1600px] max-w-full overflow-x-hidden px-4 sm:px-6 lg:px-8 pb-16 ${user ? 'space-y-10 sm:space-y-14 pt-0' : 'space-y-12 sm:space-y-16'}`}>

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
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] text-center py-6 px-4 flex flex-col items-center justify-center transition-all duration-200 hover:border-[var(--accent-color)] hover:-translate-y-0.5 shadow-sm"
          >
            <p className="page-title text-3xl sm:text-4xl font-extrabold text-[var(--accent-color)] tracking-tight">
              {item.value}
            </p>
            <p className="card-title text-xs sm:text-sm mt-1.5 font-semibold text-[var(--text-secondary)]">
              {item.label}
            </p>
          </motion.div>
        ))}
      </section>

      {/* 3. Why Catalyst - Bento Grid Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={sectionVariants}
        className="space-y-8 py-4"
      >
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <p className="caption-text uppercase tracking-widest text-[var(--text-metadata)] font-semibold text-xs sm:text-sm">
            Why Catalyst
          </p>
          <h2 className="section-title text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight leading-snug">
            Built for personalized, high-efficiency learning.
          </h2>
          <p className="body-text text-sm sm:text-base text-[var(--text-secondary)]">
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
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="group rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-sm transition-all duration-200 hover:border-[var(--accent-color)] hover:-translate-y-1 flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-main)] flex items-center justify-center text-[var(--accent-color)] group-hover:border-[var(--accent-color)] transition-colors duration-200 shrink-0">
                      <IconComp className="h-5 w-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[10px] font-semibold text-[var(--text-metadata)] uppercase tracking-wider">
                      {item.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="card-title text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors duration-200">
                      {item.title}
                    </h3>
                    <p className="body-text text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.section>

      {/* 4. How Catalyst Works - 7-Step Connected Workflow Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={sectionVariants}
        className="space-y-8 py-4"
      >
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <p className="caption-text uppercase tracking-widest text-[var(--text-metadata)] font-semibold text-xs sm:text-sm">
            How Catalyst Works
          </p>
          <h2 className="section-title text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight leading-snug">
            Seven simple steps to master any subject.
          </h2>
          <p className="body-text text-sm sm:text-base text-[var(--text-secondary)]">
            From seamless onboarding to career readiness, experience an end-to-end intelligent workflow.
          </p>
        </div>

        {/* Connected Step Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
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
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className={`group rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-sm transition-all duration-200 hover:border-[var(--accent-color)] hover:-translate-y-1 flex flex-col justify-between ${stepItem.colSpan || ''}`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-color)] text-white font-extrabold text-xs shadow-sm">
                      {stepItem.step}
                    </span>
                    <div className="h-8 w-8 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-metadata)] shrink-0">
                      <StepIcon className="h-4 w-4" />
                    </div>
                  </div>

                  <div>
                    <h4 className="card-title text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors duration-200">
                      {stepItem.title}
                    </h4>
                    <p className="body-text text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                      {stepItem.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.section>

      {/* 5. Core Features Section */}
      <section id="core-features" className="w-full py-4">
        <CoreFeaturesShowcase />
      </section>

      {/* 6. Learning Journey Vertical Roadmap */}
      <section className="py-4">
        <LearningJourneySection />
      </section>

      {/* 7. Why Choose Catalyst Comparison Table Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={sectionVariants}
        className="space-y-8 py-4"
      >
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <p className="caption-text uppercase tracking-widest text-[var(--text-metadata)] font-semibold text-xs sm:text-sm">
            Why Choose Catalyst
          </p>
          <h2 className="section-title text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight leading-snug">
            Designed specifically for student success.
          </h2>
          <p className="body-text text-sm sm:text-base text-[var(--text-secondary)]">
            Compare Catalyst’s comprehensive learning suite against standard static platforms.
          </p>
        </div>

        {/* 12-Feature Ecosystem Table */}
        <div className="max-w-4xl mx-auto overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[320px]">
              <thead>
                <tr className="border-b border-[var(--divider-main)] bg-[var(--bg-secondary)] text-xs sm:text-sm font-bold">
                  <th className="p-4 text-[var(--text-primary)]">Feature</th>
                  <th className="p-4 text-center text-[var(--accent-color)]">Catalyst</th>
                  <th className="p-4 text-center text-[var(--text-secondary)]">Status</th>
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
                    className="hover:bg-[var(--bg-secondary)] transition-colors duration-150 group"
                  >
                    <td className="p-4 font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors">
                      {row.name}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-color)] text-white font-extrabold text-xs shadow-sm">
                        ✓
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.section>

      {/* 8. Final Call To Action */}
      <section className="text-center p-8 sm:p-14 space-y-5 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] shadow-sm">
        <h2 className="page-title text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)]">Ready to Learn Smarter?</h2>
        <p className="body-text text-sm sm:text-base text-[var(--text-secondary)] max-w-xl mx-auto">
          Join thousands of students learning with Catalyst.
        </p>
        <div className="pt-2">
          <Link to={user ? "/dashboard" : "/register"} className="saas-button-primary inline-flex items-center justify-center min-h-[48px] px-8 text-base font-semibold text-white bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] transition-all duration-200 cursor-pointer w-full sm:w-auto rounded-xl shadow-sm">
            Get Started
          </Link>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="pt-8 pb-4 border-t border-[var(--border-main)] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left Footer Branding */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <img
                src="/favicon.png"
                alt="Catalyst Logo"
                className="h-8 w-8 shrink-0 rounded-[12px] object-cover shadow-sm border border-[var(--border-main)]"
              />
              <span className="card-title font-bold text-lg text-[var(--text-primary)]">Catalyst</span>
            </div>
            <p className="small-text text-[var(--text-secondary)] text-xs">AI Powered Personalized Learning</p>
          </div>

          {/* Right Footer Links */}
          <div className="flex flex-wrap gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
            <a href="#core-features" onClick={scrollToFeatures} className="hover:text-[var(--text-primary)] transition py-1">Features</a>
            <Link to="/about" className="hover:text-[var(--text-primary)] transition py-1">About</Link>
            <Link to="/privacy" className="hover:text-[var(--text-primary)] transition py-1">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[var(--text-primary)] transition py-1">Terms</Link>
            <Link to="/contact" className="hover:text-[var(--text-primary)] transition py-1">Contact</Link>
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
