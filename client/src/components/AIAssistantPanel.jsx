import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../context/AuthContext.jsx'

export default function AIAssistantPanel() {
    const { api } = useAuth()
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hi! I can help you review notes, summarize discussions, or suggest study ideas.'
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [error, setError] = useState('')
    const endRef = useRef(null)

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isTyping])

    const handleSend = async () => {
        const trimmed = input.trim()
        if (!trimmed || isTyping) return

        const userMessage = { role: 'user', content: trimmed }
        const nextMessages = [...messages, userMessage]
        setMessages(nextMessages)
        setInput('')
        setError('')
        setIsTyping(true)

        try {
            const response = await api.post('/ai/chat', {
                message: trimmed,
                history: nextMessages.slice(-20)
            })

            // Handle successful response
            if (response.status === 200 && response.data) {
                const reply = response.data.response || response.data.reply
                if (reply && typeof reply === 'string' && reply.trim().length > 0) {
                    setMessages([
                        ...nextMessages,
                        {
                            role: 'assistant',
                            content: reply.trim()
                        }
                    ])
                    return
                }
            }

            // Fallback for unexpected response format
            throw new Error('Invalid response format from AI service')
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message || 'Unable to contact the AI assistant right now.'
            setError(errorMsg)
            setMessages([
                ...nextMessages,
                {
                    role: 'assistant',
                    content: `Error: ${errorMsg}`
                }
            ])
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <section className="saas-card shadow-glow xl:sticky xl:top-6">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-[var(--divider-main)] pb-4">
                <div>
                    <p className="caption-text uppercase tracking-[0.24em] text-[var(--accent-color)] font-semibold mb-1">AI assistant</p>
                    <h2 className="section-title">Study companion</h2>
                </div>
            </div>

            {error && <p className="mb-4 rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 px-4 py-3 text-sm text-[var(--error-color)]">{error}</p>}

            <div className="max-h-[28rem] space-y-3 overflow-y-auto rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4">
                {messages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] rounded-[14px] px-4 py-3 ${message.role === 'user' ? 'bg-[var(--accent-color)] text-[var(--accent-contrast-text)] font-medium' : 'bg-[var(--bg-elevated)] border border-[var(--border-main)] text-[var(--text-primary)]'}`}>
                            <div className="prose prose-invert max-w-none text-sm leading-6">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="rounded-[14px] bg-[var(--bg-elevated)] border border-[var(--border-main)] px-4 py-3 text-[var(--text-primary)]">
                            <span className="inline-flex gap-1">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-color)]" />
                                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-color)]" style={{ animationDelay: '0.15s' }} />
                                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-color)]" style={{ animationDelay: '0.3s' }} />
                            </span>
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            <div className="mt-4 flex gap-3">
                <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault()
                            handleSend()
                        }
                    }}
                    rows="2"
                    placeholder="Ask for help with your studies..."
                    className="saas-input w-full min-h-[48px]"
                />
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={isTyping}
                    className="saas-button-primary self-end"
                >
                    Send
                </button>
            </div>
        </section>
    )
}