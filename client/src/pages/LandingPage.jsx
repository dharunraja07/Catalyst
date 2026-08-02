import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
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
    <div className={`mx-auto w-full max-w-[1600px] px-2 sm:px-4 lg:px-6 ${user ? 'space-y-6 pt-0' : 'space-y-12'}`}>

      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Statistics Section */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
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
            className="gold-orbit-card text-center py-8 px-4 flex flex-col items-center justify-center cursor-pointer select-none"
          >
            <p className="page-title text-4xl sm:text-5xl font-extrabold text-[var(--accent-color)] tracking-tight">
              {item.value}
            </p>
            <p className="card-title text-sm sm:text-base mt-2.5 font-semibold text-[var(--text-secondary)]">
              {item.label}
            </p>
          </motion.div>
        ))}
      </section>

      {/* 3. Why Catalyst */}
      <section className="saas-card shadow-glow space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">Why Catalyst</p>
          <h2 className="section-title text-3xl font-bold">Built for personalized, high-efficiency learning.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="saas-card-hover">
            <div className="h-10 w-10 rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] mb-4 font-bold">01</div>
            <h3 className="card-title text-xl font-semibold mb-2">AI Personalized Learning</h3>
            <p className="body-text text-sm">Adaptive learning based on student strengths and weaknesses.</p>
          </div>

          <div className="saas-card-hover">
            <div className="h-10 w-10 rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] mb-4 font-bold">02</div>
            <h3 className="card-title text-xl font-semibold mb-2">Progress Analytics</h3>
            <p className="body-text text-sm">Visualize learning performance using intelligent insights.</p>
          </div>

          <div className="saas-card-hover">
            <div className="h-10 w-10 rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] mb-4 font-bold">03</div>
            <h3 className="card-title text-xl font-semibold mb-2">Smart Practice</h3>
            <p className="body-text text-sm">Practice questions generated according to learning progress.</p>
          </div>

          <div className="saas-card-hover">
            <div className="h-10 w-10 rounded-[14px] bg-[var(--accent-light)] border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] mb-4 font-bold">04</div>
            <h3 className="card-title text-xl font-semibold mb-2">Career Guidance</h3>
            <p className="body-text text-sm">Personalized career paths based on skills.</p>
          </div>
        </div>
      </section>

      {/* 4. How Catalyst Works */}
      <section className="saas-card shadow-glow space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">How Catalyst Works</p>
          <h2 className="section-title text-3xl font-bold">Four simple steps to master any subject.</h2>
        </div>

        {/* Desktop Horizontal Timeline */}
        <div className="hidden md:grid md:grid-cols-4 gap-4 items-center">
          <div className="saas-elevated-card text-center relative">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold text-sm mb-3">1</span>
            <h4 className="card-title font-semibold">Create Account</h4>
          </div>
          <div className="saas-elevated-card text-center relative">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold text-sm mb-3">2</span>
            <h4 className="card-title font-semibold">Take Assessment</h4>
          </div>
          <div className="saas-elevated-card text-center relative">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold text-sm mb-3">3</span>
            <h4 className="card-title font-semibold">AI Builds Roadmap</h4>
          </div>
          <div className="saas-elevated-card text-center relative">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold text-sm mb-3">4</span>
            <h4 className="card-title font-semibold">Learn & Improve</h4>
          </div>
        </div>

        {/* Mobile Vertical Timeline */}
        <div className="flex md:hidden flex-col gap-4">
          <div className="saas-elevated-card flex items-center gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold text-sm">1</span>
            <h4 className="card-title font-semibold">Create Account</h4>
          </div>
          <div className="saas-elevated-card flex items-center gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold text-sm">2</span>
            <h4 className="card-title font-semibold">Take Assessment</h4>
          </div>
          <div className="saas-elevated-card flex items-center gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold text-sm">3</span>
            <h4 className="card-title font-semibold">AI Builds Roadmap</h4>
          </div>
          <div className="saas-elevated-card flex items-center gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-bold text-sm">4</span>
            <h4 className="card-title font-semibold">Learn & Improve</h4>
          </div>
        </div>
      </section>



      {/* 6. Core Features Section */}
      <section id="core-features" className="-mx-5 sm:-mx-10 lg:-mx-14 w-[calc(100%+2.5rem)] sm:w-[calc(100%+5rem)] lg:w-[calc(100%+7rem)] overflow-hidden">
        <CoreFeaturesShowcase />
      </section>

      {/* 7. Learning Journey Vertical Roadmap */}
      <LearningJourneySection />

      {/* 8. Why Choose Catalyst Comparison Table */}
      <section className="saas-card shadow-glow space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold">Why Choose Catalyst</p>
          <h2 className="section-title text-3xl font-bold">Designed specifically for student success.</h2>
        </div>

        <div className="max-w-2xl mx-auto overflow-hidden rounded-[20px] border border-[var(--border-main)] bg-[var(--bg-elevated)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--divider-main)] bg-[var(--bg-secondary)]">
                <th className="p-4 sm:p-5 card-title font-semibold text-[var(--text-primary)]">Feature</th>
                <th className="p-4 sm:p-5 card-title font-semibold text-center text-[var(--accent-color)]">Catalyst</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--divider-main)]">
              <tr>
                <td className="p-4 sm:p-5 body-text font-medium text-[var(--text-primary)]">AI Personalization</td>
                <td className="p-4 sm:p-5 text-center">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success-color)] font-bold">✓</span>
                </td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 body-text font-medium text-[var(--text-primary)]">Adaptive Learning</td>
                <td className="p-4 sm:p-5 text-center">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success-color)] font-bold">✓</span>
                </td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 body-text font-medium text-[var(--text-primary)]">Progress Analytics</td>
                <td className="p-4 sm:p-5 text-center">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success-color)] font-bold">✓</span>
                </td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 body-text font-medium text-[var(--text-primary)]">Career Roadmaps</td>
                <td className="p-4 sm:p-5 text-center">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success-color)] font-bold">✓</span>
                </td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 body-text font-medium text-[var(--text-primary)]">Study Groups</td>
                <td className="p-4 sm:p-5 text-center">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success-color)] font-bold">✓</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 9. Final Call To Action */}
      <section className="saas-elevated-card shadow-glow text-center p-8 sm:p-12 space-y-6 border border-[var(--accent-color)]/30 bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-secondary)]">
        <h2 className="page-title text-3xl sm:text-4xl font-extrabold">Ready to Learn Smarter?</h2>
        <p className="body-text text-lg max-w-xl mx-auto">
          Join thousands of students learning with Catalyst.
        </p>
        <div>
          <Link to={user ? "/dashboard" : "/register"} className="saas-button-primary inline-flex items-center justify-center min-h-[48px] px-10 text-base font-semibold">
            Get Started
          </Link>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="saas-card p-8 space-y-8 border-t border-[var(--border-main)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left Footer Branding */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--accent-color)] text-base font-bold text-[var(--accent-contrast-text)]">AI</span>
              <span className="card-title font-bold text-xl">Catalyst</span>
            </div>
            <p className="small-text text-[var(--text-secondary)]">AI Powered Personalized Learning</p>
          </div>

          {/* Right Footer Links */}
          <div className="flex flex-wrap gap-6 text-sm font-medium text-[var(--text-secondary)]">
            <a href="#core-features" onClick={scrollToFeatures} className="hover:text-[var(--accent-color)] transition">Features</a>
            <Link to="/about" className="hover:text-[var(--accent-color)] transition">About</Link>
            <Link to="/privacy" className="hover:text-[var(--accent-color)] transition">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[var(--accent-color)] transition">Terms</Link>
            <Link to="/contact" className="hover:text-[var(--accent-color)] transition">Contact</Link>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="border-t border-[var(--divider-main)] pt-6 text-center text-xs text-[var(--text-muted)]">
          © 2026 Catalyst. All Rights Reserved.
        </div>
      </footer>
    </div>
  )
}
