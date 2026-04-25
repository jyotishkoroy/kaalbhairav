'use client'

import { useEffect, useRef, useState } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function AstroChat({
  placeName,
  profileId,
}: {
  placeName: string | null
  profileId: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function ask() {
    if (!input.trim() || streaming) return

    const question = input.trim()
    setInput('')
    setMessages((current) => [
      ...current,
      { role: 'user', content: question },
      { role: 'assistant', content: '' },
    ])
    setStreaming(true)

    try {
      const response = await fetch('/api/astro/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          profile_id: profileId,
          question,
        }),
      })

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null)
        setMessages((current) => [
          ...current.slice(0, -1),
          {
            role: 'assistant',
            content:
              data?.message ||
              'The Guru is in deep meditation. Please try again shortly.',
          },
        ])
        setStreaming(false)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const event of events) {
          const lines = event.split('\n')
          const eventType = lines
            .find((line) => line.startsWith('event: '))
            ?.slice(7)
          const dataLine = lines
            .find((line) => line.startsWith('data: '))
            ?.slice(6)

          if (!dataLine) continue

          const data = JSON.parse(dataLine)

          if (eventType === 'meta') {
            setRemaining(data.remaining)
          }

          if (eventType === 'token') {
            setMessages((current) => {
              const copy = [...current]
              const last = copy[copy.length - 1]
              copy[copy.length - 1] = {
                role: 'assistant',
                content: last.content + data.t,
              }
              return copy
            })
          }

          if (eventType === 'error') {
            setMessages((current) => [
              ...current.slice(0, -1),
              { role: 'assistant', content: data.message },
            ])
          }
        }
      }
    } catch {
      setMessages((current) => [
        ...current.slice(0, -1),
        {
          role: 'assistant',
          content: 'The Guru is in deep meditation. Please try again shortly.',
        },
      ])
    }

    setStreaming(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 flex h-screen flex-col">
      <header className="mb-6 border-b border-white/10 pb-4">
        <h1 className="text-3xl font-serif">Your Guru</h1>
        <p className="text-sm text-white/50">
          {placeName ? `Born in ${placeName}` : 'Birth chart saved'}
          {remaining !== null ? ` · ${remaining} questions left today` : ''}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto space-y-6 pb-6">
        {messages.length === 0 && (
          <div className="text-center text-white/40 py-24">
            <p className="text-lg mb-2">Ask about this chart.</p>
            <p className="text-sm">
              Reflection and symbolism only. Medical, financial, and legal matters
              need qualified human practitioners.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={message.role === 'user' ? 'flex justify-end' : ''}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                message.role === 'user'
                  ? 'bg-orange-500 text-black'
                  : 'border border-white/10 bg-white/[0.04]'
              }`}
            >
              <p className="whitespace-pre-wrap">
                {message.content || (streaming ? <ThinkingDots /> : '')}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t border-white/10 pt-4 flex gap-3">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              ask()
            }
          }}
          placeholder="Ask your question..."
          disabled={streaming}
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 outline-none focus:border-orange-400"
        />
        <button
          type="button"
          onClick={ask}
          disabled={streaming || !input.trim()}
          className="rounded-full bg-orange-500 px-6 py-3 font-medium text-black hover:bg-orange-400 disabled:opacity-30"
        >
          Ask
        </button>
      </div>
    </div>
  )
}

function ThinkingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:300ms]" />
    </span>
  )
}
