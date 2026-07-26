import { useEffect, useRef, useState } from 'react'
import AIChatMessage from './AIChatMessage.jsx'
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

            <div className="max-h-[28rem] space-y-2 overflow-y-auto rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[#111827]/80 p-3 sm:p-4 custom-scrollbar">
                {messages.map((message, index) => (
                    <AIChatMessage key={`${message.role}-${index}`} message={message} />
                ))}
                {isTyping && (
                    <div className="flex justify-start my-2">
                        <div className="rounded-2xl rounded-tl-none border border-[rgba(255,255,255,0.08)] bg-[#1B2432] px-4 py-3">
                            <span className="inline-flex gap-1.5 items-center">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" style={{ animationDelay: '0.15s' }} />
                                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" style={{ animationDelay: '0.3s' }} />
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