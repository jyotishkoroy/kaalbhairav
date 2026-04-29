'use client'

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { useState } from 'react'
import { saveEntry } from './actions'

type StillJournalProps = {
  prompt: string
  existingEntry: string | null
  streak: number
  total: number
}

export default function StillJournal({
  prompt,
  existingEntry,
  streak,
  total,
}: StillJournalProps) {
  const [entry, setEntry] = useState(existingEntry ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(Boolean(existingEntry))

  async function handleSave() {
    if (!entry.trim() || saving) return

    setSaving(true)
    const result = await saveEntry(entry, prompt)
    setSaving(false)

    if (result?.success) {
      setSaved(true)
    } else {
      alert(result?.error ?? 'Could not save.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <header className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-serif">Still</h1>
        <div className="text-sm text-white/50">
          {streak > 0 && (
            <span className="text-orange-400">
              {streak} day{streak !== 1 ? 's' : ''}
            </span>
          )}
          {total > 0 && <span className="ml-3">{total} entries</span>}
        </div>
      </header>

      <div className="mb-6 p-6 bg-white/[0.04] rounded-lg border border-white/10">
        <div className="text-xs uppercase tracking-widest text-orange-400 mb-3">
          Today&apos;s prompt
        </div>
        <p className="text-xl font-serif leading-relaxed">{prompt}</p>
      </div>

      <textarea
        value={entry}
        onChange={(event) => setEntry(event.target.value)}
        placeholder="Write what comes..."
        rows={12}
        disabled={saved}
        className="w-full bg-white/5 border border-white/10 rounded-lg p-5 text-lg leading-relaxed focus:outline-none focus:border-orange-400 disabled:opacity-70"
      />

      {saved ? (
        <p className="mt-4 text-green-400 text-sm">Saved. Return tomorrow.</p>
      ) : (
        <button
          type="button"
          onClick={handleSave}
          disabled={!entry.trim() || saving}
          className="mt-4 px-6 py-3 bg-orange-500 text-black font-medium rounded-full hover:bg-orange-400 disabled:opacity-30"
        >
          {saving ? 'Saving...' : 'Offer this thought'}
        </button>
      )}
    </div>
  )
}
