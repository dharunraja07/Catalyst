import GeminiProvider from './geminiProvider.js'
import GroqProvider from './groqProvider.js'

const providers = {
  gemini: null,
  groq: null
}

function getOrCreateProvider(name) {
  if (providers[name]) return providers[name]

  switch (name) {
    case 'gemini':
      providers.gemini = new GeminiProvider()
      return providers.gemini
    case 'groq':
      providers.groq = new GroqProvider()
      return providers.groq
    default:
      return null
  }
}

/**
 * Get a provider instance by name.
 * Falls back to AI_PROVIDER_DEFAULT env var, then 'gemini'.
 */
export function getProvider(name) {
  const providerName = (name || process.env.AI_PROVIDER_DEFAULT || 'gemini').toLowerCase().trim()
  const provider = getOrCreateProvider(providerName)
  if (!provider) {
    throw new Error(`Unknown AI provider: "${providerName}". Supported: gemini, groq`)
  }
  return provider
}

/**
 * Get an ordered list of available providers for failover.
 * Starts with the requested provider, then cycles through others.
 */
export function getFailoverChain(preferredName) {
  const preferred = (preferredName || process.env.AI_PROVIDER_DEFAULT || 'gemini').toLowerCase().trim()
  const allNames = ['gemini', 'groq']

  // Put preferred first, then the rest
  const ordered = [preferred, ...allNames.filter((n) => n !== preferred)]

  return ordered
    .map((name) => getOrCreateProvider(name))
    .filter((p) => p && p.isAvailable())
}

/**
 * Get a list of all provider names that have API keys configured.
 */
export function getAvailableProviderNames() {
  const allNames = ['gemini', 'groq']
  return allNames.filter((name) => {
    const provider = getOrCreateProvider(name)
    return provider && provider.isAvailable()
  })
}

export default getProvider
