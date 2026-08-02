import mongoose from 'mongoose'
import AiConversation from '../models/AiConversation.js'
import AiMessage from '../models/AiMessage.js'
import { generateJSON, chatCompletion, AIProviderError, getAvailableProviderNames } from '../services/ai/aiService.js'

function buildMappedQuestion(item, defaultDiff = 'Medium') {
    let topicName = item.topic
    if (!topicName || topicName === 'General') {
        const text = item.question || ''
        if (text.length > 5) {
            const words = text.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3)
            if (words.length >= 2) {
                topicName = `${words[0].charAt(0).toUpperCase() + words[0].slice(1)} ${words[1].charAt(0).toUpperCase() + words[1].slice(1)}`
            } else if (words.length === 1) {
                topicName = words[0].charAt(0).toUpperCase() + words[0].slice(1)
            }
        }
    }
    if (!topicName) topicName = 'Core Concept'

    return {
        _id: `ai-${Math.random().toString(36).slice(2, 10)}`,
        text: item.question || '',
        options: Array.isArray(item.options) ? item.options : [],
        answer: item.correctAnswer || '',
        explanation: item.explanation || '',
        subject: item.subject || 'Syllabus',
        topic: topicName,
        difficulty: defaultDiff || item.difficulty || 'Medium'
    }
}

function validateAssessmentPayload(payload) {
    if (!payload || !Array.isArray(payload.questions) || payload.questions.length === 0) {
        return false
    }

    return payload.questions.every((item) => {
        return (
            item &&
            typeof item.question === 'string' &&
            Array.isArray(item.options) &&
            item.options.length >= 2 &&
            typeof item.correctAnswer === 'string'
        )
    })
}

function validatePracticePayload(payload) {
    if (!payload || !Array.isArray(payload.twoMarkQuestions) || !Array.isArray(payload.longAnswerQuestions)) {
        return false
    }

    const hasQuestions = payload.twoMarkQuestions.length > 0 || payload.longAnswerQuestions.length > 0
    return hasQuestions
}

export async function generateAssessment(req, res, next) {
    try {
        const { syllabus, provider, difficulty = 'adaptive' } = req.body
        if (!syllabus || !syllabus.trim()) {
            return res.status(400).json({ error: 'Syllabus is required' })
        }

        if (syllabus.length > 10000) {
            return res.status(400).json({ error: 'Syllabus text is too long (max 10,000 characters)' })
        }

        let difficultyLabel = 'Medium'
        let difficultyInstruction = 'balanced mix of questions'

        if (difficulty === 'easy') {
            difficultyLabel = 'Easy'
            difficultyInstruction = '15 EASY introductory & foundational questions testing basic definitions and direct concepts'
        } else if (difficulty === 'medium') {
            difficultyLabel = 'Medium'
            difficultyInstruction = '15 MEDIUM difficulty standard application questions testing core understanding'
        } else if (difficulty === 'hard') {
            difficultyLabel = 'Hard'
            difficultyInstruction = '15 HARD advanced questions testing complex problem solving, analytical thinking, and edge cases'
        } else if (difficulty === 'adaptive') {
            difficultyLabel = 'Adaptive'
            difficultyInstruction = '15 ADAPTIVE targeted diagnostic questions focusing specifically on unlearned, weak, or unmastered topics from previous attempts'
        }

        const prompt = `Create 15 multiple-choice questions based on the following syllabus. Difficulty Directive: ${difficultyInstruction}. Return only valid JSON in this exact shape: {"questions":[{"question":"...","options":["...","...","...","..."],"correctAnswer":"...","explanation":"...","difficulty":"${difficultyLabel}"}]}. Every question must have exactly 4 options, and the correctAnswer must match one of the options. Syllabus: ${syllabus}`

        let payload
        try {
            payload = await generateJSON(prompt, { provider })
        } catch (error) {
            if (error instanceof AIProviderError) {
                return res.status(502).json({ error: 'Failed to generate a valid assessment. Please try again.' })
            }
            return next(error)
        }

        if (!validateAssessmentPayload(payload)) {
            return res.status(502).json({ error: 'Failed to generate a valid assessment. Please try again.' })
        }

        const questions = payload.questions.map((q) => buildMappedQuestion(q, difficultyLabel))
        res.json({ questions })
    } catch (error) {
        next(error)
    }
}

export async function generatePractice(req, res, next) {
    try {
        const { studentType = '', syllabus, provider } = req.body
        if (!syllabus || !syllabus.trim()) {
            return res.status(400).json({ error: 'Syllabus is required' })
        }

        if (syllabus.length > 10000) {
            return res.status(400).json({ error: 'Syllabus text is too long (max 10,000 characters)' })
        }

        const normalizedType = studentType === 'School Student' ? 'School Student' : 'College Student'
        const isSchool = normalizedType === 'School Student'
        const expectedCounts = {
            twoMarkQuestions: 10,
            longAnswerQuestions: isSchool ? 10 : 5,
            longAnswerMarks: isSchool ? 5 : 14
        }

        const prompt = `Create practice questions based on this syllabus for ${studentType || 'a general student'}. Return only valid JSON with exactly this shape: {"twoMarkQuestions":[{"question":"...","expectedAnswer":"...","marks":2}],"longAnswerQuestions":[{"question":"...","expectedAnswer":"...","marks":${expectedCounts.longAnswerMarks}}]}. Provide 10 short 2-mark questions and ${expectedCounts.longAnswerQuestions} long answer questions. Syllabus: ${syllabus}`

        let payload
        try {
            payload = await generateJSON(prompt, { provider, retries: 1 })
        } catch (error) {
            if (error instanceof AIProviderError) {
                return res.status(502).json({ error: 'Failed to generate practice questions from AI service.' })
            }
            return next(error)
        }

        if (!validatePracticePayload(payload)) {
            return res.status(502).json({ error: 'Failed to generate valid practice questions format. Please try again.' })
        }

        const normalizedTwoMark = (payload.twoMarkQuestions || []).map((q) => ({
            question: q.question || 'Practice Question',
            expectedAnswer: q.expectedAnswer || q.answer || 'Answer concept.',
            marks: 2
        }))

        const normalizedLong = (payload.longAnswerQuestions || []).map((q) => ({
            question: q.question || 'Long Answer Question',
            expectedAnswer: q.expectedAnswer || q.answer || 'Detailed answer explanation.',
            marks: expectedCounts.longAnswerMarks
        }))

        res.json({
            twoMarkQuestions: normalizedTwoMark,
            longAnswerQuestions: normalizedLong,
            studentType: studentType || 'Unspecified',
            counts: expectedCounts
        })
    } catch (error) {
        next(error)
    }
}

export async function chatWithAI(req, res, next) {
    try {
        const { message, history = [], provider } = req.body
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' })
        }

        if (message.length > 10000) {
            return res.status(400).json({ error: 'Message is too long (max 10,000 characters)' })
        }

        const trimmedHistory = Array.isArray(history) ? history.slice(-20) : []

        let response
        try {
            response = await chatCompletion(trimmedHistory, message.trim(), { provider })
        } catch (error) {
            if (error instanceof AIProviderError) {
                if (error.providerName === 'none') {
                    return res.status(503).json({
                        error: 'AI service is not configured. Please set an API key in server environment.'
                    })
                }
                return res.status(502).json({
                    error: 'Failed to reach AI service. Please try again in a moment.'
                })
            }
            throw error
        }

        if (!response || typeof response !== 'string' || response.trim().length === 0) {
            return res.status(502).json({
                error: 'Received empty response from AI service. Please try again.'
            })
        }

        return res.json({
            success: true,
            response: response.trim(),
            reply: response.trim()
        })
    } catch (error) {
        return res.status(500).json({
            error: 'Internal server error processing your message.'
        })
    }
}

export async function getUserConversations(req, res, next) {
    try {
        let conversations = await AiConversation.find({ user: req.user._id }).sort({ updatedAt: -1 })
        if (conversations.length === 0) {
            const initial = await AiConversation.create({ user: req.user._id, title: 'New Chat' })
            conversations = [initial]
        }
        res.json(conversations)
    } catch (error) {
        next(error)
    }
}

export async function createConversation(req, res, next) {
    try {
        const title = req.body.title?.trim() || 'New Chat'
        const conversation = await AiConversation.create({ user: req.user._id, title })
        res.status(201).json(conversation)
    } catch (error) {
        next(error)
    }
}

export async function renameConversation(req, res, next) {
    try {
        const { title } = req.body
        if (!title?.trim()) return res.status(400).json({ error: 'Title is required' })

        const conversation = await AiConversation.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { title: title.trim() },
            { new: true }
        )
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' })
        res.json(conversation)
    } catch (error) {
        next(error)
    }
}

export async function deleteConversation(req, res, next) {
    try {
        const conversation = await AiConversation.findOneAndDelete({ _id: req.params.id, user: req.user._id })
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' })

        await AiMessage.deleteMany({ conversationId: conversation._id })
        res.json({ message: 'Conversation deleted successfully', id: req.params.id })
    } catch (error) {
        next(error)
    }
}

export async function getConversationMessages(req, res, next) {
    try {
        const conversation = await AiConversation.findOne({ _id: req.params.id, user: req.user._id })
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' })

        const { limit, before } = req.query
        const limitNum = Math.min(parseInt(limit, 10) || 30, 100)
        const queryFilter = { conversationId: conversation._id, user: req.user._id }

        if (before) {
            if (mongoose.Types.ObjectId.isValid(before)) {
                const beforeMsg = await AiMessage.findById(before)
                if (beforeMsg) {
                    queryFilter.createdAt = { $lt: beforeMsg.createdAt }
                } else {
                    queryFilter._id = { $lt: before }
                }
            } else {
                const dateBefore = new Date(before)
                if (!isNaN(dateBefore.getTime())) {
                    queryFilter.createdAt = { $lt: dateBefore }
                }
            }
        }

        const messages = await AiMessage.find(queryFilter)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limitNum)

        // Return chronological order for frontend display
        res.json(messages.reverse())
    } catch (error) {
        next(error)
    }
}

export async function sendConversationMessage(req, res, next) {
    try {
        const { message, provider } = req.body
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' })
        }

        if (message.length > 10000) {
            return res.status(400).json({ error: 'Message is too long (max 10,000 characters)' })
        }

        const conversation = await AiConversation.findOne({ _id: req.params.id, user: req.user._id })
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' })

        // Save user message to MongoDB Atlas
        const userMsg = await AiMessage.create({
            conversationId: conversation._id,
            user: req.user._id,
            role: 'user',
            content: message.trim()
        })

        // Fetch last 20 messages for context
        const recentHistoryMsgs = await AiMessage.find({ conversationId: conversation._id, user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20)

        const historyContext = recentHistoryMsgs.reverse().map((m) => ({
            role: m.role,
            content: m.content
        }))

        // Generate AI response with failover
        let aiReplyText = ''
        try {
            aiReplyText = await chatCompletion(historyContext, message.trim(), { provider })
        } catch (error) {
            if (error instanceof AIProviderError && error.providerName === 'none') {
                aiReplyText = 'AI service is not configured. Please set an API key in server environment.'
            } else {
                aiReplyText = 'Failed to reach AI service. Please try again in a moment.'
            }
        }

        // Save AI assistant message to MongoDB Atlas
        const assistantMsg = await AiMessage.create({
            conversationId: conversation._id,
            user: req.user._id,
            role: 'assistant',
            content: aiReplyText.trim()
        })

        // Update conversation title if default "New Chat"
        if (conversation.title === 'New Chat') {
            const autoTitle = message.trim().slice(0, 30) + (message.trim().length > 30 ? '...' : '')
            conversation.title = autoTitle
        }
        conversation.updatedAt = new Date()
        await conversation.save()

        res.json({
            userMessage: userMsg,
            assistantMessage: assistantMsg,
            conversation
        })
    } catch (error) {
        next(error)
    }
}

export async function getAvailableProviders(req, res) {
    try {
        const providers = getAvailableProviderNames()
        const defaultProvider = process.env.AI_PROVIDER_DEFAULT || 'gemini'
        res.json({ providers, default: defaultProvider })
    } catch (error) {
        res.json({ providers: [], default: 'gemini' })
    }
}
