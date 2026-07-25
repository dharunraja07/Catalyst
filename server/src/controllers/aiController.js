import { generateJSON, chatCompletion, GeminiServiceError } from '../services/geminiService.js'

function buildMappedQuestion(item) {
    return {
        _id: `ai-${Math.random().toString(36).slice(2, 10)}`,
        text: item.question || '',
        options: Array.isArray(item.options) ? item.options : [],
        answer: item.correctAnswer || '',
        explanation: item.explanation || '',
        subject: 'Syllabus',
        topic: 'General',
        difficulty: 'Medium'
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
        const { syllabus } = req.body
        if (!syllabus || !syllabus.trim()) {
            return res.status(400).json({ error: 'Syllabus is required' })
        }

        const prompt = `Create 15 multiple-choice questions based on the following syllabus. Return only valid JSON in this exact shape: {"questions":[{"question":"...","options":["...","...","...","..."],"correctAnswer":"...","explanation":"..."}]}. Every question must have exactly 4 options, and the correctAnswer must match one of the options. Syllabus: ${syllabus}`

        let payload
        try {
            payload = await generateJSON(prompt)
        } catch (error) {
            if (error instanceof GeminiServiceError) {
                return res.status(502).json({ error: 'Failed to generate a valid assessment. Please try again.' })
            }
            return next(error)
        }

        if (!validateAssessmentPayload(payload)) {
            return res.status(502).json({ error: 'Failed to generate a valid assessment. Please try again.' })
        }

        const questions = payload.questions.map(buildMappedQuestion)
        res.json({ questions })
    } catch (error) {
        next(error)
    }
}

export async function generatePractice(req, res, next) {
    try {
        const { studentType = '', syllabus } = req.body
        if (!syllabus || !syllabus.trim()) {
            return res.status(400).json({ error: 'Syllabus is required' })
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
            payload = await generateJSON(prompt, { retries: 1 })
        } catch (error) {
            console.error('Gemini generatePractice error:', error)
            return res.status(502).json({ error: 'Failed to generate practice questions from AI service.' })
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

import mongoose from 'mongoose'
import AiConversation from '../models/AiConversation.js'
import AiMessage from '../models/AiMessage.js'

export async function chatWithAI(req, res, next) {
    try {
        const { message, history = [] } = req.body
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' })
        }

        const trimmedHistory = Array.isArray(history) ? history.slice(-20) : []

        let response
        try {
            response = await chatCompletion(trimmedHistory, message.trim())
        } catch (error) {
            if (error instanceof GeminiServiceError) {
                console.error('Gemini Service Error:', error.message, error.cause?.message)
                if (error.message.includes('GEMINI_API_KEY is not configured')) {
                    return res.status(503).json({
                        error: 'AI service is not configured. Please set GEMINI_API_KEY in server environment.'
                    })
                }
                return res.status(502).json({
                    error: 'Failed to reach Gemini API. Please try again in a moment.'
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
        console.error('Chat Error:', error.message)
        return res.status(500).json({
            error: 'Internal server error processing your message.',
            message: error.message
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
        const { message } = req.body
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' })
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

        // Generate AI response
        let aiReplyText = ''
        try {
            aiReplyText = await chatCompletion(historyContext, message.trim())
        } catch (error) {
            if (error instanceof GeminiServiceError && error.message.includes('GEMINI_API_KEY is not configured')) {
                aiReplyText = 'AI service is not configured. Please set GEMINI_API_KEY in server environment.'
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
