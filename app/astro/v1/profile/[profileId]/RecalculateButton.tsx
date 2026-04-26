'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RecalculateButton({ profileId }: { profileId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRecalculate() {
    setLoading(true)
    try {
      const res = await fetch('/api/astro/v1/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId, force_recalc: true }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRecalculate}
      disabled={loading}
      className="px-5 py-3 border border-white/20 rounded-lg hover:border-white/40 transition text-sm disabled:opacity-40"
    >
      {loading ? 'Recalculating…' : 'Recalculate'}
    </button>
  )
}
