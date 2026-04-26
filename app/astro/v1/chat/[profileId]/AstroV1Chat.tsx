'use client'

import { useState, useRef, useEffect } from 'react'
import type { AstroGuidanceAnswer } from '@/lib/astro/conversation/types'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  mode?: 'clarifying_question' | 'final_answer' | 'error'
  structured_answer?: AstroGuidanceAnswer['final_answer']
}

export function AstroV1Chat({ profileId, isReal }: { profileId: string; isReal: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function sendMessage() {
    const question = input.trim()
    if (!question || streaming) return

    setInput('')
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setStreaming(true)

    // Optimistic assistant placeholder (for legacy token streaming)
    let assistantAdded = false
    let assistantContent = ''

    try {
      const res = await fetch('/api/astro/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          question,
          ...(sessionId ? { session_id: sessionId } : {}),
        }),
      })

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message ?? errData.error ?? 'Request failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break
          try {
            const json = JSON.parse(payload)

            if (json.type === 'meta') {
              if (json.session_id) setSessionId(json.session_id)
            }

            if (json.type === 'clarifying_question' && json.question) {
              setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: json.question as string, mode: 'clarifying_question' },
              ])
              assistantAdded = true
            }

            if (json.type === 'final_answer') {
              const rendered = (json.rendered as string) ?? ''
              const answer = json.answer as AstroGuidanceAnswer | undefined
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: rendered,
                  mode: 'final_answer',
                  structured_answer: answer?.final_answer,
                },
              ])
              assistantAdded = true
            }

            // Legacy token streaming (fallback path)
            if (json.type === 'token' && json.t) {
              assistantContent += json.t as string
              if (!assistantAdded) {
                setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }])
                assistantAdded = true
              } else {
                setMessages((prev) => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                  return updated
                })
              }
            }

            if (json.type === 'error') {
              throw new Error((json.message as string) ?? 'Stream error')
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== 'Stream error') continue
            throw parseErr
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      // Remove the optimistic assistant bubble if nothing was added from stream
      if (!assistantAdded) {
        setMessages((prev) => prev.filter((_, i) => i < prev.length - 0))
      }
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto py-6 space-y-5">
        {messages.length === 0 && (
          <p className="text-center text-white/30 text-sm mt-12">
            Ask a question about your birth chart.
            {!isReal && (
              <>
                <br />
                <span className="text-yellow-400/60">
                  Recalculate your profile to activate real ephemeris data.
                </span>
              </>
            )}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-orange-800/60 text-white'
                  : m.mode === 'clarifying_question'
                  ? 'bg-amber-900/30 border border-amber-700/30 text-white/90'
                  : 'bg-white/8 border border-white/10 text-white/90'
              }`}
            >
              {m.content || (
                <span className="inline-flex gap-1">
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>
          </div>
        ))}
        {streaming && !messages[messages.length - 1]?.content && (
          <div className="flex justify-start">
            <div className="bg-white/8 border border-white/10 rounded-2xl px-4 py-3">
              <span className="inline-flex gap-1">
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        {error && <div className="text-center text-red-400 text-sm">{error}</div>}
        <div ref={bottomRef} />
      </div>

      <div className="py-4 border-t border-white/10">
        <div className="flex gap-3 items-end">
          <textarea
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-orange-500/60 min-h-[48px] max-h-[120px]"
            placeholder="Ask the Guru…"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
          />
          <button
            onClick={sendMessage}
            disabled={streaming || !input.trim()}
            className="px-5 py-3 bg-orange-700 rounded-xl hover:bg-orange-600 transition text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-white/20 mt-2 text-center">
          Birth data is never sent to the AI. The Guru only explains what the backend has calculated.
        </p>
      </div>
    </>
  )
}
