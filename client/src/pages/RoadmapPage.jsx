import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Static score-bracket roadmap definitions (No AI)
const SCORE_ROADMAPS = {
  tier0: {
    rangeLabel: '0 - 34%',
    tierName: 'Foundational Remediation Track',
    badgeText: 'Foundational Tier',
    description: 'Calibrated for scores from 0% to 34%. Focuses on establishing basic terms, core definitions, and fundamental concepts.',
    steps: [
      {
        step: 1,
        title: 'Core Terminology & Basic Definitions Review',
        description: 'Review essential subject terminology, elementary definitions, and foundational concepts to establish a baseline.',
        estTime: '20 mins',
        difficulty: 'Easy'
      },
      {
        step: 2,
        title: 'Guided Practice Drills',
        description: 'Solve 10 guided introductory questions to practice applying core definitions with immediate step-by-step feedback.',
        estTime: '25 mins',
        difficulty: 'Easy'
      },
      {
        step: 3,
        title: 'Syllabus Overview & Concept Mapping',
        description: 'Study core subject outlines and create visual concept maps to organize key topics and dependencies.',
        estTime: '30 mins',
        difficulty: 'Easy'
      },
      {
        step: 4,
        title: 'Targeted Focus on Missed Topics',
        description: 'Re-examine specific questions missed in your previous assessment and review explanations to clear doubts.',
        estTime: '20 mins',
        difficulty: 'Medium'
      },
      {
        step: 5,
        title: 'Foundational Progress Check',
        description: 'Complete a short review test to verify your foundational understanding before advancing to higher score tiers.',
        estTime: '15 mins',
        difficulty: 'Easy'
      }
    ]
  },
  tier35: {
    rangeLabel: '35 - 49%',
    tierName: 'Beginner Reinforcement Track',
    badgeText: 'Beginner Tier',
    description: 'Calibrated for scores from 35% to 49%. Bridges knowledge gaps and introduces structured problem-solving skills.',
    steps: [
      {
        step: 1,
        title: 'Concept Reinforcement & Topic Deep Dive',
        description: 'Study core topic modules to reinforce key principles and eliminate common beginner misconceptions.',
        estTime: '25 mins',
        difficulty: 'Easy'
      },
      {
        step: 2,
        title: 'Intermediate Practice Exercises',
        description: 'Solve 15 mixed practice questions covering core concepts to build problem-solving accuracy.',
        estTime: '30 mins',
        difficulty: 'Medium'
      },
      {
        step: 3,
        title: 'Targeted Weakness Workout',
        description: 'Focus specifically on weak topics identified in your assessment to strengthen low-scoring subtopics.',
        estTime: '25 mins',
        difficulty: 'Medium'
      },
      {
        step: 4,
        title: 'Formula & Rules Application',
        description: 'Practice applying subject rules, key formulas, and logic steps to standard problem scenarios.',
        estTime: '20 mins',
        difficulty: 'Medium'
      },
      {
        step: 5,
        title: 'Milestone Evaluation Test',
        description: 'Take a targeted practice evaluation test to assess your readiness to transition into the 50%+ tier.',
        estTime: '15 mins',
        difficulty: 'Medium'
      }
    ]
  },
  tier50: {
    rangeLabel: '50 - 74%',
    tierName: 'Intermediate Competency Track',
    badgeText: 'Competent Tier',
    description: 'Calibrated for scores from 50% to 74%. Designed for learners with a solid foundation striving for high accuracy.',
    steps: [
      {
        step: 1,
        title: 'Comprehensive Topic Masterclass',
        description: 'Explore intermediate-level concepts, detailed applications, and multi-step reasoning methods.',
        estTime: '30 mins',
        difficulty: 'Medium'
      },
      {
        step: 2,
        title: 'Multi-Topic Practice Drills',
        description: 'Work through 20 mixed medium-to-hard practice questions to test problem-solving consistency.',
        estTime: '35 mins',
        difficulty: 'Medium'
      },
      {
        step: 3,
        title: 'Speed & Accuracy Optimization',
        description: 'Complete timed practice sets to improve your question-solving speed without sacrificing accuracy.',
        estTime: '25 mins',
        difficulty: 'Medium'
      },
      {
        step: 4,
        title: 'Weak Spot Target Review',
        description: 'Analyze remaining weak spots from past assessments and refine execution on tricky question types.',
        estTime: '20 mins',
        difficulty: 'Hard'
      },
      {
        step: 5,
        title: 'Proficiency Assessment Challenge',
        description: 'Complete a benchmark test to demonstrate 75%+ proficiency and qualify for advanced topics.',
        estTime: '20 mins',
        difficulty: 'Hard'
      }
    ]
  },
  tier75: {
    rangeLabel: '75 - 89%',
    tierName: 'Proficient Mastery Track',
    badgeText: 'Proficient Tier',
    description: 'Calibrated for scores from 75% to 89%. Focuses on high-level scenario analysis and precision error reduction.',
    steps: [
      {
        step: 1,
        title: 'Advanced Scenario Analysis',
        description: 'Analyze complex scenarios, subtle problem nuances, and high-difficulty theoretical concepts.',
        estTime: '30 mins',
        difficulty: 'Hard'
      },
      {
        step: 2,
        title: 'Hard Question Sprint',
        description: 'Solve 20 high-difficulty practice problems designed to challenge top-tier reasoning skills.',
        estTime: '35 mins',
        difficulty: 'Hard'
      },
      {
        step: 3,
        title: 'Precision Error Analysis',
        description: 'Review edge cases and minor errors from previous diagnostic attempts to eliminate small mistakes.',
        estTime: '20 mins',
        difficulty: 'Hard'
      },
      {
        step: 4,
        title: 'Time-Constrained Drills',
        description: 'Execute high-speed challenge sets under strict exam conditions to maximize performance under pressure.',
        estTime: '25 mins',
        difficulty: 'Hard'
      },
      {
        step: 5,
        title: 'Excellence Milestone Test',
        description: 'Take an advanced diagnostic test aimed at breaking past the 90% score threshold.',
        estTime: '20 mins',
        difficulty: 'Hard'
      }
    ]
  },
  tier90: {
    rangeLabel: '90 - 99%',
    tierName: 'Excellence Refinement Track',
    badgeText: 'Excellence Tier',
    description: 'Calibrated for top performers scoring between 90% and 99%. Tailored for total mastery and 100% perfection.',
    steps: [
      {
        step: 1,
        title: 'Mastery Edge-Case Deep Dive',
        description: 'Study rare edge cases, tricky exceptions, and complex concept variations to achieve total domain mastery.',
        estTime: '25 mins',
        difficulty: 'Hard'
      },
      {
        step: 2,
        title: 'Elite Challenge Problem Set',
        description: 'Solve 25 elite-level challenge questions covering multi-concept synthesis and advanced logic.',
        estTime: '40 mins',
        difficulty: 'Hard'
      },
      {
        step: 3,
        title: 'Peer Teaching & Concept Synthesis',
        description: 'Formulate clear explanations and teach key principles to solidify master-level understanding.',
        estTime: '30 mins',
        difficulty: 'Medium'
      },
      {
        step: 4,
        title: 'Perfection Calibration Quiz',
        description: 'Identify and resolve any remaining 1-2% knowledge gaps with a targeted precision quiz.',
        estTime: '15 mins',
        difficulty: 'Hard'
      },
      {
        step: 5,
        title: 'Final Mastery Challenge',
        description: 'Take the final mastery evaluation test to target a flawless 100% diagnostic score.',
        estTime: '20 mins',
        difficulty: 'Hard'
      }
    ]
  },
  tier100: {
    rangeLabel: '100%',
    tierName: 'Grandmaster Mastery Track',
    badgeText: 'Perfect Tier',
    description: 'Calibrated for a perfect 100% diagnostic score. Focused on expert leadership, real-world application, and skill maintenance.',
    steps: [
      {
        step: 1,
        title: 'Expert Mastery Maintenance',
        description: 'Maintain 100% perfection through periodic refresher drills and top-level concept reviews.',
        estTime: '20 mins',
        difficulty: 'Medium'
      },
      {
        step: 2,
        title: 'Real-World Project & Application',
        description: 'Apply your complete domain mastery to solve practical real-world problems and capstone scenarios.',
        estTime: '45 mins',
        difficulty: 'Hard'
      },
      {
        step: 3,
        title: 'Mentorship & Study Group Leadership',
        description: 'Guide fellow students in peer study groups and share problem-solving strategies.',
        estTime: '30 mins',
        difficulty: 'Easy'
      },
      {
        step: 4,
        title: 'Career & Professional Alignment',
        description: 'Explore career pathways, industry certifications, and professional skill opportunities aligned with your score.',
        estTime: '30 mins',
        difficulty: 'Easy'
      },
      {
        step: 5,
        title: 'Grandmaster Mastery Maintenance Test',
        description: 'Complete a periodic refresher assessment to keep your 100% perfect score active.',
        estTime: '15 mins',
        difficulty: 'Hard'
      }
    ]
  }
}

// Function to select roadmap based on exact score percentage
function getScoreRoadmap(score) {
  const p = Math.max(0, Math.min(100, Math.round(score || 0)))
  if (p < 35) return SCORE_ROADMAPS.tier0
  if (p < 50) return SCORE_ROADMAPS.tier35
  if (p < 75) return SCORE_ROADMAPS.tier50
  if (p < 90) return SCORE_ROADMAPS.tier75
  if (p < 100) return SCORE_ROADMAPS.tier90
  return SCORE_ROADMAPS.tier100
}

export default function RoadmapPage() {
  const { api } = useAuth()
  const navigate = useNavigate()
  const [roadmapData, setRoadmapData] = useState(null)
  const [completedSteps, setCompletedSteps] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRoadmapData() {
      setLoading(true)
      try {
        const response = await api.get('/roadmap')
        setRoadmapData(response.data)
      } catch (err) {
        setError('Unable to load assessment roadmap data')
      } finally {
        setLoading(false)
      }
    }
    loadRoadmapData()
  }, [api])

  const toggleStepCompleted = (stepNumber) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber]
    }))
  }

  const score = Number(roadmapData?.score || 0)
  const activeRoadmap = getScoreRoadmap(score)
  const weaknesses = Array.isArray(roadmapData?.weaknesses) ? roadmapData.weaknesses : []
  const strengths = Array.isArray(roadmapData?.strengths) ? roadmapData.strengths : []

  const completedCount = Object.keys(completedSteps).filter((k) => completedSteps[k]).length
  const totalSteps = activeRoadmap.steps.length
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0

  return (
    <main className="mx-auto max-w-7xl max-w-full overflow-x-hidden px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 text-[var(--text-primary)]">
      {/* 🚀 Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-main)] pb-5 sm:pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
              Assessment Score Roadmap
            </span>
            <span className="text-xs font-semibold text-[var(--text-muted)]">• Score Range: {activeRoadmap.rangeLabel}</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)] break-words">
            Personalized Learning Path
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
            Unique static learning roadmap determined by your latest assessment score ({score}%).
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          <Link
            to="/assessment"
            className="saas-button-primary min-h-[46px] px-6 text-xs sm:text-sm font-bold shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            <span>Retake Assessment</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-[16px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 p-4 text-xs sm:text-sm text-[var(--error-color)] flex items-center gap-3 break-words">
          <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <span className="break-words">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center space-y-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[var(--border-main)] border-t-[var(--text-primary)]" />
          <p className="text-sm font-semibold text-[var(--text-muted)] animate-pulse">
            Loading your score-tailored roadmap...
          </p>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* 📊 Score & Roadmap Banner */}
          <div className="rounded-2xl sm:rounded-[24px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4 sm:p-6 shadow-sm space-y-5 sm:space-y-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border-2 border-[var(--border-main)] bg-[var(--bg-primary)] text-xl sm:text-2xl font-black text-[var(--text-primary)] shadow-sm shrink-0 mt-0.5 sm:mt-0">
                  {score}%
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base sm:text-xl font-extrabold text-[var(--text-primary)] break-words">
                      {activeRoadmap.tierName}
                    </h2>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border border-[var(--border-main)] bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                      {activeRoadmap.badgeText} ({activeRoadmap.rangeLabel})
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-xl leading-relaxed">
                    {activeRoadmap.description}
                  </p>
                </div>
              </div>

              {/* Progress Count */}
              <div className="bg-[var(--bg-primary)] p-3 sm:px-4 sm:py-3 rounded-[16px] sm:rounded-[18px] border border-[var(--border-main)] shrink-0 flex items-center justify-around sm:justify-start gap-3 sm:gap-4 w-full sm:w-auto">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] block">
                    Completed Steps
                  </span>
                  <span className="text-sm sm:text-base font-black text-[var(--text-primary)]">
                    {completedCount} / {totalSteps}
                  </span>
                </div>
                <div className="h-7 sm:h-8 w-px bg-[var(--border-main)]" />
                <div className="text-center sm:text-left">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] block">
                    Roadmap Completion
                  </span>
                  <span className="text-sm sm:text-base font-black text-[var(--text-primary)]">
                    {progressPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Score Tier Progress Bar */}
            <div className="space-y-2 pt-2 border-t border-[var(--border-main)]/60">
              <div className="flex justify-between items-center text-xs font-bold text-[var(--text-muted)]">
                <span>Assessment Mastery Score</span>
                <span>{score}% Calibrated</span>
              </div>
              <div className="h-3 w-full rounded-full bg-[var(--bg-primary)] overflow-hidden border border-[var(--border-main)] p-0.5">
                <div
                  className="h-full rounded-full bg-[var(--text-primary)] transition-all duration-500"
                  style={{ width: `${Math.max(4, score)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 🛣️ Vertical Step Roadmap */}
          <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-main)] pb-3 sm:pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-[var(--text-primary)]">
                  Score-Tailored Milestones
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Sequential steps designed for your {activeRoadmap.rangeLabel} score bracket
                </p>
              </div>

              <span className="text-xs font-extrabold text-[var(--text-secondary)] px-3 py-1 rounded-full border border-[var(--border-main)] bg-[var(--bg-secondary)] self-start sm:self-auto">
                {activeRoadmap.steps.length} Steps Total
              </span>
            </div>

            {/* Steps Container */}
            <div className="space-y-3.5 sm:space-y-4">
              {activeRoadmap.steps.map((item) => {
                const isCompleted = Boolean(completedSteps[item.step])

                return (
                  <div
                    key={item.step}
                    className={`rounded-2xl sm:rounded-[22px] border p-4 sm:p-5 transition-all duration-200 ${
                      isCompleted
                        ? 'border-[var(--border-main)] bg-[var(--bg-primary)] opacity-75'
                        : 'border-[var(--border-main)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Step Number Checkbox & Content */}
                      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleStepCompleted(item.step)}
                          className={`mt-0.5 flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-full border text-xs sm:text-sm font-black shrink-0 transition min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] cursor-pointer ${
                            isCompleted
                              ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-xs'
                              : 'border-[var(--border-main)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:border-[var(--text-primary)]'
                          }`}
                          title={isCompleted ? 'Mark step incomplete' : 'Mark step completed'}
                        >
                          {isCompleted ? '✓' : item.step}
                        </button>

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-[6px] bg-[var(--bg-primary)] border border-[var(--border-main)] text-[var(--text-secondary)]">
                              Step {item.step}
                            </span>
                            <h3 className={`text-sm sm:text-base font-extrabold break-words ${isCompleted ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                              {item.title}
                            </h3>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-3xl pt-0.5 break-words">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Right Meta & Practice Button */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-[var(--border-main)]/50 sm:border-transparent w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-[var(--text-muted)] px-2.5 py-1 rounded-[10px] bg-[var(--bg-primary)] border border-[var(--border-main)]">
                            {item.estTime}
                          </span>
                          <span className="text-[11px] font-bold text-[var(--text-primary)] px-2.5 py-1 rounded-[10px] bg-[var(--bg-primary)] border border-[var(--border-main)]">
                            {item.difficulty}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate('/questions')}
                          className="px-4 py-2 rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-primary)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition min-h-[44px] w-full sm:w-auto flex items-center justify-center cursor-pointer"
                        >
                          Practice Step
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
