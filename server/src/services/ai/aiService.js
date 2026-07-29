import { getFailoverChain, getAvailableProviderNames } from './providerFactory.js'
import { AIProviderError } from './geminiProvider.js'

/**
 * High-level AI service with automatic failover.
 * Controllers call these methods — they never interact with providers directly.
 */

/**
 * Generate a JSON response from an AI provider with automatic failover.
 * @param {string} prompt - The prompt to send
 * @param {object} opts - Options
 * @param {string} opts.provider - Preferred provider name
 * @param {number} opts.retries - Retries per provider (default: 2)
 * @returns {object} Parsed JSON response
 */
export async function generateJSON(prompt, { provider, retries = 2 } = {}) {
  const chain = getFailoverChain(provider)

  if (chain.length === 0) {
    throw new AIProviderError(
      'No AI providers are configured. Set at least one of: GEMINI_API_KEY or GROQ_API_KEY in your .env file.',
      'none'
    )
  }

  const errors = []

  for (const p of chain) {
    try {
      const result = await p.generateJSON(prompt, { retries })
      return result
    } catch (error) {
      const isRetryable = error instanceof AIProviderError ? error.isRetryable : true
      errors.push({ provider: p.name, error: error.message })

      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[AI Failover] ${p.displayName} failed: ${error.message}`)
      }

      // If the error is not retryable (e.g. bad prompt format), don't try other providers
      if (!isRetryable) {
        throw error
      }
      // Otherwise, continue to next provider
    }
  }

  throw new AIProviderError(
    `All AI providers failed. Tried: ${errors.map((e) => `${e.provider} (${e.error})`).join(', ')}`,
    'all'
  )
}

/**
 * Chat completion with conversation history and automatic failover.
 * @param {Array} history - Message history [{role, content}]
 * @param {string} userMessage - The user's message
 * @param {object} opts - Options
 * @param {string} opts.provider - Preferred provider name
 * @returns {string} AI response text
 */
export async function chatCompletion(history, userMessage, { provider } = {}) {
  const chain = getFailoverChain(provider)

  if (chain.length === 0) {
    throw new AIProviderError(
      'No AI providers are configured. Set at least one of: GEMINI_API_KEY or GROQ_API_KEY in your .env file.',
      'none'
    )
  }

  const errors = []

  for (const p of chain) {
    try {
      const result = await p.chatCompletion(history, userMessage)
      return result
    } catch (error) {
      const isRetryable = error instanceof AIProviderError ? error.isRetryable : true
      errors.push({ provider: p.name, error: error.message })

      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[AI Failover] ${p.displayName} failed: ${error.message}`)
      }

      if (!isRetryable) {
        throw error
      }
    }
  }

  throw new AIProviderError(
    `All AI providers failed. Tried: ${errors.map((e) => `${e.provider} (${e.error})`).join(', ')}`,
    'all'
  )
}

/**
 * Get list of available provider names for the frontend dropdown.
 */
export { getAvailableProviderNames }

export { AIProviderError }
