import OpenAI from 'openai'
import { AIProviderError, parseJsonResponse, delay } from './geminiProvider.js'

class GroqProvider {
  constructor() {
    this.name = 'groq'
    this.displayName = 'Groq'
    this._client = null
  }

  _getClient() {
    const apiKey = (process.env.GROQ_API_KEY || '').trim()
    if (!apiKey) {
      throw new AIProviderError('GROQ_API_KEY is not configured.', this.name)
    }
    if (!this._client) {
      this._client = new OpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1'
      })
    }
    return this._client
  }

  _normalizeHistory(history = []) {
    if (!Array.isArray(history)) return []
    return history
      .slice(-20)
      .map((entry) => ({
        role: entry?.role === 'assistant' ? 'assistant' : 'user',
        content: typeof entry?.content === 'string' ? entry.content : ''
      }))
      .filter((entry) => entry.content.trim().length > 0)
  }

  async generateJSON(prompt, { retries = 2 } = {}) {
    const client = this._getClient()
    const attempts = retries + 1

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const completion = await client.chat.completions.create({
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a helpful assistant. Return valid JSON only when requested. Do not wrap JSON in markdown code fences.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 4096
        })
        const rawText = completion.choices?.[0]?.message?.content || ''
        return parseJsonResponse(rawText)
      } catch (error) {
        if (attempt === attempts) {
          throw this._formatError(error)
        }
        await delay(500 * attempt)
      }
    }
    throw new AIProviderError('Failed to generate valid JSON from Groq.', this.name)
  }

  async chatCompletion(history, userMessage) {
    const client = this._getClient()
    try {
      const messages = [
        { role: 'system', content: 'You are a helpful study assistant. Provide clear, well-structured responses.' },
        ...this._normalizeHistory(history),
        { role: 'user', content: userMessage }
      ]

      const completion = await client.chat.completions.create({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 4096
      })
      return completion.choices?.[0]?.message?.content || ''
    } catch (error) {
      throw this._formatError(error)
    }
  }

  isAvailable() {
    return !!(process.env.GROQ_API_KEY || '').trim()
  }

  _formatError(error) {
    const status = error?.status || error?.response?.status
    const errorStr = String(error?.message || '')

    if (status === 429 || errorStr.includes('rate_limit')) {
      return new AIProviderError('Groq API rate limit exceeded.', this.name, true, error)
    }
    if (status === 401 || status === 403 || errorStr.includes('invalid_api_key')) {
      return new AIProviderError('Invalid or unauthorized GROQ_API_KEY.', this.name, true, error)
    }
    if (errorStr.includes('ECONNREFUSED') || errorStr.includes('ETIMEDOUT') || errorStr.includes('ENOTFOUND') || errorStr.includes('fetch failed')) {
      return new AIProviderError('Groq API connection failed.', this.name, true, error)
    }
    return new AIProviderError(`Groq error: ${error?.message || 'Unknown'}`, this.name, false, error)
  }
}

export default GroqProvider
