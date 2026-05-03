'use client'

/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { useState } from 'react'

export function AstroOneShotClient() {
  const [question, setQuestion] = useState('')
  const [submittedQuestion, setSubmittedQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || isLoading) return

    setAnswer('')
    setError(null)
    setIsLoading(true)

    const requestId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`

    try {
      const resp = await fetch('/api/astro/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed, requestId }),
      })

      const data = await resp.json()

      if (!resp.ok) {
        setError(
          typeof data?.error === 'string'
            ? data.error
            : 'Something went wrong. Please try again.',
        )
        return
      }

      setSubmittedQuestion(trimmed)
      setAnswer(typeof data.answer === 'string' ? data.answer : '')
      setQuestion('')
    } catch {
      setError('Unable to connect. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: '#0a0806',
      color: '#f0e8d8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.25rem',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Ask Guru — input window */}
        <section aria-label="Ask Guru">
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(240,232,216,0.45)', marginBottom: '0.75rem' }}>
            Ask Guru
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask one question…"
              rows={4}
              maxLength={2000}
              disabled={isLoading}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '8px',
                padding: '0.875rem 1rem',
                color: '#f0e8d8',
                fontSize: '1rem',
                lineHeight: '1.6',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  const form = e.currentTarget.closest('form')
                  if (form) form.requestSubmit()
                }
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              style={{
                alignSelf: 'flex-end',
                background: isLoading || !question.trim() ? 'rgba(181,150,98,0.35)' : 'rgba(181,150,98,0.85)',
                color: isLoading || !question.trim() ? 'rgba(240,232,216,0.45)' : '#0a0806',
                border: 'none',
                borderRadius: '999px',
                padding: '0.6rem 1.75rem',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: isLoading || !question.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {isLoading ? 'Receiving…' : 'Ask'}
            </button>
          </form>
        </section>

        {/* aadesh — answer window */}
        <section aria-label="aadesh" style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '12px',
          padding: '1.5rem',
          minHeight: '160px',
        }}>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(240,232,216,0.45)', marginBottom: '0.75rem' }}>
            aadesh
          </p>
          {submittedQuestion && (
            <p style={{ fontSize: '0.8rem', color: 'rgba(240,232,216,0.45)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
              {submittedQuestion}
            </p>
          )}
          {isLoading && !answer ? (
            <p style={{ color: 'rgba(240,232,216,0.45)', fontSize: '0.95rem' }}>…</p>
          ) : error ? (
            <p style={{ color: '#e07070', fontSize: '0.95rem' }}>{error}</p>
          ) : answer ? (
            <p style={{ fontSize: '1rem', lineHeight: '1.7', color: '#f0e8d8', whiteSpace: 'pre-wrap' }}>{answer}</p>
          ) : (
            <p style={{ color: 'rgba(240,232,216,0.28)', fontSize: '0.95rem' }}>Your guidance will appear here.</p>
          )}
        </section>

      </div>
    </div>
  )
}
