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
            reply: response.trim() // Fallback for compatibility
        })
    } catch (error) {
        console.error('Chat Error:', error.message)
        return res.status(500).json({
            error: 'Internal server error processing your message.',
            message: error.message
        })
    }
}
