import { GoogleGenerativeAI } from '@google/generative-ai'

class GeminiProvider {
  constructor() {
    this.name = 'gemini'
    this.displayName = 'Gemini'
  }

  _getModel(modelName) {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim()
    if (!apiKey) {
      throw new AIProviderError('GEMINI_API_KEY is not configured.', this.name)
    }
    const chosenModel = modelName || process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    const genAI = new GoogleGenerativeAI(apiKey)
    return genAI.getGenerativeModel({
      model: chosenModel,
      systemInstruction: 'You are a helpful assistant. Return valid JSON only when requested and avoid markdown fences unless the user explicitly asks for them.'
    })
  }

  async _executeWithModelFallback(fn) {
    const candidateModels = Array.from(new Set([
      process.env.GEMINI_MODEL,
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ].filter(Boolean)))

    let lastError = null

    for (const modelName of candidateModels) {
      try {
        const model = this._getModel(modelName)
        return await fn(model)
      } catch (error) {
        lastError = error
        const errStr = String(error?.message || error || '')
        if (errStr.includes('404') || errStr.includes('not found') || errStr.includes('is not supported')) {
          console.warn(`[GeminiProvider] Model '${modelName}' unavailable (404). Trying next candidate...`)
          continue
        }
        throw error
      }
    }
    throw lastError
  }

  _normalizeHistory(history = []) {
    if (!Array.isArray(history)) return []
    const normalized = history
      .slice(-20)
      .map((entry) => {
        const role = entry?.role === 'assistant' ? 'model' : 'user'
        const text = typeof entry?.content === 'string' ? entry.content : ''
        return { role, parts: [{ text }] }
      })
      .filter((entry) => entry.parts[0]?.text?.trim().length > 0)

    while (normalized.length > 0 && normalized[0].role !== 'user') {
      normalized.shift()
    }
    return normalized
  }

  async generateJSON(prompt, { retries = 2 } = {}) {
    const attempts = retries + 1

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this._executeWithModelFallback(async (model) => {
          const result = await model.generateContent(prompt)
          const rawText = result?.response?.text?.() || ''
          return parseJsonResponse(rawText)
        })
      } catch (error) {
        if (attempt === attempts) {
          throw this._formatError(error)
        }
        await delay(500 * attempt)
      }
    }
    throw new AIProviderError('Failed to generate valid JSON from Gemini.', this.name)
  }

  async chatCompletion(history, userMessage) {
    try {
      return await this._executeWithModelFallback(async (model) => {
        const chat = model.startChat({
          history: this._normalizeHistory(history)
        })
        const result = await chat.sendMessage(userMessage)
        return result?.response?.text?.() || ''
      })
    } catch (error) {
      throw this._formatError(error)
    }
  }

  isAvailable() {
    return !!(process.env.GEMINI_API_KEY || '').trim()
  }

  _formatError(error) {
    const errorStr = String(error?.message || error || '')
    const status = error?.status || error?.cause?.status

    if (status === 429 || errorStr.includes('429') || errorStr.includes('Quota exceeded') || errorStr.includes('RATE_LIMIT_EXCEEDED')) {
      return new AIProviderError('Gemini API rate limit / quota exceeded.', this.name, true, error)
    }
    if (status === 400 || status === 401 || status === 403 || errorStr.includes('API_KEY_INVALID') || errorStr.includes('API key not valid')) {
      return new AIProviderError('Invalid or unauthorized GEMINI_API_KEY.', this.name, true, error)
    }
    if (errorStr.includes('ECONNREFUSED') || errorStr.includes('ETIMEDOUT') || errorStr.includes('ENOTFOUND') || errorStr.includes('fetch failed')) {
      return new AIProviderError('Gemini API connection failed.', this.name, true, error)
    }
    return new AIProviderError(`Gemini error: ${error?.message || 'Unknown'}`, this.name, false, error)
  }
}

// --- Shared Utilities ---

export class AIProviderError extends Error {
  constructor(message, providerName = 'unknown', isRetryable = false, cause = null) {
    super(message)
    this.name = 'AIProviderError'
    this.providerName = providerName
    this.isRetryable = isRetryable
    this.cause = cause
  }
}

export function stripCodeFences(text = '') {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

export function extractJsonBlock(text = '') {
  const match = text.match(/({\s*[\s\S]*\s*}|\[\s*[\s\S]*\s*\])/)
  return match ? match[1] : null
}

export function parseJsonResponse(rawText) {
  const cleaned = stripCodeFences(rawText)
  try {
    return JSON.parse(cleaned)
  } catch {
    const extracted = extractJsonBlock(cleaned)
    if (!extracted) {
      throw new Error('No valid JSON found in response')
    }
    return JSON.parse(extracted)
  }
}

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default GeminiProvider
