import Assessment from '../models/Assessment.js'
import LearningProgress from '../models/LearningProgress.js'
import Roadmap from '../models/Roadmap.js'
import Career from '../models/Career.js'
import Question from '../models/Question.js'
import Resource from '../models/Resource.js'

const classificationThresholds = {
  beginner: 33,      // 0-32% → Beginner
  intermediate: 67   // 33-66% → Intermediate, 67-100% → Advanced
}

const roadmapTemplates = {
  beginner: [
    'Review basic concepts',
    'Study examples and definitions',
    'Practice guided exercises',
    'Take a follow-up test'
  ],
  intermediate: [
    'Strengthen core topics',
    'Solve mixed practice problems',
    'Study real examples',
    'Review weak topics weekly'
  ],
  advanced: [
    'Tackle advanced concepts',
    'Solve complex problems',
    'Build a mini project',
    'Prepare for career applications'
  ]
}

export function classify(score) {
  if (score < classificationThresholds.beginner) return 'Beginner'
  if (score < classificationThresholds.intermediate) return 'Intermediate'
  return 'Advanced'
}

export function analyzeTopics(answers) {
  const topicStats = {}
  answers.forEach((item) => {
    const topic = item.topic
    if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0, subject: item.subject }
    topicStats[topic].total += 1
    if (item.correct) topicStats[topic].correct += 1
  })
  const performance = {}
  Object.entries(topicStats).forEach(([topic, stats]) => {
    const percentage = Math.round((stats.correct / stats.total) * 100)
    performance[topic] = {
      subject: stats.subject,
      percentage,
      label: percentage >= 70 ? 'Strong' : 'Weak'
    }
  })
  return performance
}

export function getScoreTier(score) {
  const p = Math.max(0, Math.min(100, Math.round(score)))
  if (p <= 10) return { tier: 'Foundational', range: '0-10%', level: 1 }
  if (p <= 20) return { tier: 'Novice', range: '11-20%', level: 2 }
  if (p <= 30) return { tier: 'Beginner', range: '21-30%', level: 3 }
  if (p <= 40) return { tier: 'Developing', range: '31-40%', level: 4 }
  if (p <= 50) return { tier: 'Approaching Competency', range: '41-50%', level: 5 }
  if (p <= 60) return { tier: 'Competent', range: '51-60%', level: 6 }
  if (p <= 70) return { tier: 'Proficient', range: '61-70%', level: 7 }
  if (p <= 80) return { tier: 'Advanced', range: '71-80%', level: 8 }
  if (p <= 90) return { tier: 'Excellence', range: '81-90%', level: 9 }
  return { tier: 'Mastery', range: '91-100%', level: 10 }
}

export async function generateRoadmap(userId, classification, score = 0, topicPerformance = {}, answers = []) {
  const scoreInfo = getScoreTier(score)
  
  const wrongTopics = Array.isArray(answers)
    ? answers.filter((a) => !a.correct).map((a) => a.topic || a.subject).filter((t) => t && t !== 'General' && t !== 'Syllabus')
    : []
  const correctTopics = Array.isArray(answers)
    ? answers.filter((a) => a.correct).map((a) => a.topic || a.subject).filter((t) => t && t !== 'General' && t !== 'Syllabus')
    : []

  const uniqueWeaknesses = Array.from(new Set(wrongTopics))
  const rawStrengths = Array.from(new Set(correctTopics))
  const uniqueStrengths = rawStrengths.filter((t) => !uniqueWeaknesses.includes(t))

  const dynamicItems = []
  
  // Step 1: Re-study & Strengthen Weak Topics / Wrong Answers
  if (uniqueWeaknesses.length > 0) {
    dynamicItems.push({
      title: `Strengthen Weak Areas: ${uniqueWeaknesses.slice(0, 3).join(', ')}`,
      description: `Re-study missed concepts from topics: ${uniqueWeaknesses.join(', ')}. Review explanations for questions you answered incorrectly.`,
      estimatedTime: '20 mins',
      difficulty: 'Targeted Focus',
      completed: false,
      type: 'weakness'
    })
  } else {
    dynamicItems.push({
      title: `Review Core Fundamentals (${scoreInfo.tier} Tier)`,
      description: `Maintain a strong baseline by reviewing core formulas and fundamental definitions.`,
      estimatedTime: '15 mins',
      difficulty: 'Easy',
      completed: false,
      type: 'review'
    })
  }

  // Step 2: Tier-Specific Learning Goal
  dynamicItems.push({
    title: `${scoreInfo.tier} Milestone (${scoreInfo.range} Target)`,
    description: `Complete 15 targeted practice questions calibrated for ${scoreInfo.tier} level (${scoreInfo.range} mastery range).`,
    estimatedTime: '25 mins',
    difficulty: scoreInfo.level <= 3 ? 'Easy' : scoreInfo.level <= 7 ? 'Medium' : 'Hard',
    completed: false,
    type: 'tier_goal'
  })

  // Step 3: Practice & Problem Solving
  if (uniqueStrengths.length > 0) {
    dynamicItems.push({
      title: `Appreciate & Expand Mastered Topics: ${uniqueStrengths.slice(0, 2).join(', ')}`,
      description: `Great job mastering ${uniqueStrengths.slice(0, 2).join(', ')}! Take on advanced multi-topic problem sets to deepen your expertise.`,
      estimatedTime: '30 mins',
      difficulty: 'Medium',
      completed: false,
      type: 'strength'
    })
  } else {
    dynamicItems.push({
      title: 'Guided Practice Drills',
      description: 'Solve step-by-step practice questions to build initial topic mastery.',
      estimatedTime: '25 mins',
      difficulty: 'Easy',
      completed: false,
      type: 'practice'
    })
  }

  // Step 4: Diagnostic Re-Assessment
  dynamicItems.push({
    title: 'Diagnostic Re-Test & Progress Check',
    description: `Take a follow-up assessment to verify improvement and advance past the ${scoreInfo.range} score bracket.`,
    estimatedTime: '15 mins',
    difficulty: 'Adaptive',
    completed: false,
    type: 'retest'
  })

  const roadmapData = {
    items: dynamicItems,
    score: Math.round(score),
    scoreTier: scoreInfo.tier,
    strengths: uniqueStrengths,
    weaknesses: uniqueWeaknesses
  }

  const roadmap = await Roadmap.findOneAndUpdate(
    { user: userId },
    roadmapData,
    { new: true, upsert: true }
  )
  return roadmap
}

export async function recommendResources(topicPerformance) {
  const weakTopics = Object.entries(topicPerformance).filter(([, data]) => data.label === 'Weak').map(([topic]) => topic)
  const recommendations = await Resource.find({ topic: { $in: weakTopics } })
  return recommendations
}

function sampleArray(array, count) {
  const items = [...array]
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items.slice(0, count)
}

export async function buildAdaptiveQuestions(level) {
  const ratios = {
    Beginner: { Easy: 0.6, Medium: 0.3, Hard: 0.1 },
    Intermediate: { Easy: 0.3, Medium: 0.5, Hard: 0.2 },
    Advanced: { Easy: 0.2, Medium: 0.3, Hard: 0.5 }
  }
  const total = 10
  const levelRatios = ratios[level] || ratios.Beginner
  const counts = {}
  Object.entries(levelRatios).forEach(([difficulty, ratio]) => {
    counts[difficulty] = Math.max(1, Math.round(total * ratio))
  })

  const difficultyBuckets = {}
  for (const difficulty of ['Easy', 'Medium', 'Hard']) {
    difficultyBuckets[difficulty] = await Question.find({ difficulty }).lean()
  }

  const selected = []
  Object.entries(counts).forEach(([difficulty, count]) => {
    const bucket = difficultyBuckets[difficulty] || []
    if (bucket.length === 0) return
    if (bucket.length <= count) {
      selected.push(...bucket)
    } else {
      selected.push(...sampleArray(bucket, count))
    }
  })

  if (selected.length < total) {
    const extras = await Question.find({ difficulty: { $in: ['Easy', 'Medium', 'Hard'] } }).lean()
    const remaining = extras.filter((question) => !selected.some((selectedItem) => selectedItem._id.equals(question._id)))
    selected.push(...sampleArray(remaining, Math.min(total - selected.length, remaining.length)))
  }

  return sampleArray(selected, Math.min(total, selected.length)).slice(0, total)
}

export function suggestCareers(subjects, interests) {
  const allCareers = [
    { title: 'Software Developer', subjects: ['Programming'], interests: ['Technology'], improvement: ['Build projects', 'Practice coding daily'] },
    { title: 'Data Analyst', subjects: ['Mathematics', 'Programming'], interests: ['Analytics'], improvement: ['Learn data tools', 'Analyze datasets'] },
    { title: 'Physics Researcher', subjects: ['Physics'], interests: ['Research'], improvement: ['Study experiments', 'Read science articles'] }
  ]
  const suggestions = allCareers.filter((career) => {
    const subjectMatch = career.subjects.some((subject) => subjects.includes(subject))
    const interestMatch = career.interests.some((interest) => interests.includes(interest))
    return subjectMatch || interestMatch
  })
  return suggestions.length ? suggestions : allCareers
}

export async function updateProgress(userId, score, topicPerformance) {
  const progress = await LearningProgress.findOne({ user: userId })
  const completedTopics = Object.entries(topicPerformance).filter(([, data]) => data.label === 'Strong').map(([topic]) => topic)
  const today = new Date()
  const updated = await LearningProgress.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        completedTopics,
        lastReviewed: topicPerformance ? Object.fromEntries(Object.keys(topicPerformance).map((topic) => [topic, today])) : {}
      },
      $push: { scoreHistory: { score, date: today } }
    },
    { new: true, upsert: true }
  )
  return updated
}
