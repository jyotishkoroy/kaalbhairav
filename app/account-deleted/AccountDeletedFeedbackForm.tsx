/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

'use client'

import { useState } from 'react'

export function AccountDeletedFeedbackForm(props: { token?: string | null }) {
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!props.token) {
    return <p className="mt-6 text-sm text-white/60">Feedback link unavailable.</p>
  }

  async function onSubmit() {
    if (pending || submitted) return
    setPending(true)
    setError(null)
    try {
      const response = await fetch('/api/account/deletion-feedback', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ token: props.token, feedback }),
      })
      if (!response.ok) {
        setError('We could not save your feedback. You can close this page.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('We could not save your feedback. You can close this page.')
    } finally {
      setPending(false)
    }
  }

  if (submitted) {
    return <p className="mt-6 text-sm text-emerald-300">Thank you for your feedback.</p>
  }

  return (
    <div className="mt-8 space-y-4">
      <label className="block text-sm text-white/80" htmlFor="deletion-feedback">
        Tell us how we could have done better
      </label>
      <textarea
        id="deletion-feedback"
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
        className="min-h-32 w-full rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white outline-none"
        maxLength={2000}
        placeholder="Optional feedback"
      />
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <button
        type="button"
        disabled={pending}
        onClick={onSubmit}
        className="rounded bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
      >
        {pending ? 'Submitting...' : 'Submit feedback'}
      </button>
    </div>
  )
}
