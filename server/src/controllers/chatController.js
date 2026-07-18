import ChatConversation from '../models/ChatConversation.js'
import { chatCompletion, GeminiServiceError } from '../services/geminiService.js'

function generateTitle(messages = []) {
  const firstUserMessage = messages.find((message) => message?.role === 'user')
  const text = typeof firstUserMessage?.content === 'string' ? firstUserMessage.content.trim() : ''
  if (!text) return 'New chat'
  return text.length > 40 ? `${text.slice(0, 37)}...` : text
}

function sanitizeMessages(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => message && typeof message.content === 'string' && message.content.trim())
    .slice(-30)
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content.trim(),
      createdAt: message.createdAt || new Date()
    }))
}

export async function listConversations(req, res, next) {
  try {
    const conversations = await ChatConversation.find({ user: req.user._id })
      .select('id title updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean()

    res.json(conversations)
  } catch (error) {
    next(error)
  }
}

export async function getConversation(req, res, next) {
  try {
    const conversation = await ChatConversation.findOne({ _id: req.params.id, user: req.user._id }).lean()
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    res.json(conversation)
  } catch (error) {
    next(error)
  }
}

export async function createConversation(req, res, next) {
  try {
    const conversation = await ChatConversation.create({ user: req.user._id, title: 'New chat' })
    res.status(201).json(conversation)
  } catch (error) {
    next(error)
  }
}

export async function appendMessage(req, res, next) {
  try {
    const { message } = req.body
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const conversation = await ChatConversation.findOne({ _id: req.params.id, user: req.user._id })
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    const userMessage = {
      role: 'user',
      content: message.trim(),
      createdAt: new Date()
    }

    const nextMessages = sanitizeMessages([...conversation.messages, userMessage])
    const history = nextMessages.slice(-20)
    let replyText = ''

    try {
      replyText = await chatCompletion(history, userMessage.content)
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        return res.status(502).json({ error: 'Failed to reach Gemini API. Please try again in a moment.' })
      }
      throw error
    }

    const assistantMessage = {
      role: 'assistant',
      content: replyText.trim() || 'I could not generate a reply right now.',
      createdAt: new Date()
    }

    const updatedMessages = sanitizeMessages([...nextMessages, assistantMessage])
    conversation.messages = updatedMessages
    conversation.title = generateTitle(updatedMessages)
    await conversation.save()

    res.json({ messages: updatedMessages })
  } catch (error) {
    next(error)
  }
}

export async function deleteConversation(req, res, next) {
  try {
    const deleted = await ChatConversation.findOneAndDelete({ _id: req.params.id, user: req.user._id })
    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    res.json({ message: 'Conversation deleted' })
  } catch (error) {
    next(error)
  }
}
