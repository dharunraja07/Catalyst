import { getFailoverChain, getAvailableProviderNames } from './providerFactory.js'
import { AIProviderError } from './geminiProvider.js'

/**
 * High-level AI service with automatic failover and offline study assistant fallback.
 * Controllers call these methods — they never interact with providers directly.
 */

function generateFallbackChatResponse(userMessage) {
  const msg = (userMessage || '').toLowerCase().trim()

  if (['hi', 'hello', 'hey', 'greetings', 'help'].includes(msg)) {
    return `Hello! 👋 I am your **Catalyst AI Study Assistant**. 

I can help you with:
- 📖 **Summarizing Study Notes & Chapters**
- 💡 **Explaining Complex Concepts & Formulas**
- 📅 **Creating Daily Study Schedules**
- 🎯 **Generating Practice Questions & Quizzes**

*How can I assist your learning today?*

---
*(System Note: To enable live Google Gemini or Groq cloud AI models, please add a valid \`GEMINI_API_KEY\` from [Google AI Studio](https://aistudio.google.com/) into your \`server/.env\` file).*`
  }

  if (msg.includes('schedule') || msg.includes('plan') || msg.includes('timetable')) {
    return `### 📅 Recommended 3-Step Study Plan

1. **Focus Session (25 mins)**: Review core concepts and write down 3 key takeaways.
2. **Short Break (5 mins)**: Stretch and hydrate.
3. **Practice & Self-Test (20 mins)**: Answer 5 practice questions to solidify memory retention.

---
*(Note: To connect to live cloud AI models, please set a valid \`GEMINI_API_KEY\` in your \`server/.env\` file).*`
  }

  return `### 📚 Study Assistant Guidance

Here is a structured breakdown regarding your question on **"${userMessage.slice(0, 50)}${userMessage.length > 50 ? '...' : ''}"**:

1. **Core Concept**: Break down the topic into main definitions and foundational principles.
2. **Key Application**: Identify real-world examples or mathematical/logical implementations.
3. **Exam Summary**: Focus on short definitions (2-marks) and step-by-step explanatory diagrams for long answers.

---
*(Note: To activate live cloud AI model responses, please update your \`GEMINI_API_KEY\` in \`server/.env\` with a key from [Google AI Studio](https://aistudio.google.com/)).*`
}

function generateFallbackJSON(prompt) {
  if (prompt.includes('twoMarkQuestions') || prompt.includes('longAnswerQuestions')) {
    return {
      twoMarkQuestions: Array.from({ length: 10 }, (_, i) => ({
        question: `Explain core principle #${i + 1} based on the syllabus topic.`,
        expectedAnswer: `Standard definition and foundational key points for principle #${i + 1}.`,
        marks: 2
      })),
      longAnswerQuestions: Array.from({ length: 5 }, (_, i) => ({
        question: `Provide a detailed analytical explanation of major module section #${i + 1} with diagrams/examples.`,
        expectedAnswer: `Comprehensive explanation covering architectural principles, step-by-step derivation, and practical applications for section #${i + 1}.`,
        marks: 14
      }))
    }
  }

  return {
    questions: Array.from({ length: 15 }, (_, i) => ({
      question: `Which statement accurately describes core topic concept #${i + 1}?`,
      options: [
        `Option A: Primary valid definition for concept #${i + 1}`,
        `Option B: Alternative incorrect statement`,
        `Option C: Secondary distractor option`,
        `Option D: Non-related principle`
      ],
      correctAnswer: `Option A: Primary valid definition for concept #${i + 1}`,
      explanation: `Option A correctly identifies the core definition of concept #${i + 1}.`,
      difficulty: 'Medium'
    }))
  }
}

/**
 * Generate a JSON response from an AI provider with automatic failover.
 */
export async function generateJSON(prompt, { provider, retries = 2 } = {}) {
  const chain = getFailoverChain(provider)

  if (chain.length > 0) {
    const errors = []
    for (const p of chain) {
      try {
        const result = await p.generateJSON(prompt, { retries })
        return result
      } catch (error) {
        errors.push({ provider: p.name, error: error.message })
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[AI Failover] ${p.displayName} failed: ${error.message}`)
        }
      }
    }
  }

  // Graceful fallback if cloud AI keys are invalid or unreachable
  return generateFallbackJSON(prompt)
}

/**
 * Chat completion with conversation history and automatic failover.
 */
export async function chatCompletion(history, userMessage, { provider } = {}) {
  const chain = getFailoverChain(provider)

  if (chain.length > 0) {
    const errors = []
    for (const p of chain) {
      try {
        const result = await p.chatCompletion(history, userMessage)
        return result
      } catch (error) {
        errors.push({ provider: p.name, error: error.message })
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[AI Failover] ${p.displayName} failed: ${error.message}`)
        }
      }
    }
  }

  // Graceful fallback if cloud AI keys are invalid or unreachable
  return generateFallbackChatResponse(userMessage)
}

export { getAvailableProviderNames, AIProviderError }
