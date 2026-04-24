'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveBirthChart } from './actions'

export default function AstroSetupPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const result = await saveBirthChart(formData)

    if (result?.success) {
      router.push('/astro')
    } else {
      alert(result?.error ?? 'Something went wrong')
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12 max-w-xl mx-auto">
      <h1 className="text-4xl font-serif mb-2">Your Birth Chart</h1>
      <p className="text-white/60 mb-8">
        Stored encrypted. Used only to give the chat symbolic context.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm mb-2">Date of birth</label>
          <input
            name="birth_date"
            type="date"
            required
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 outline-none focus:border-orange-400"
          />
        </div>

        <div>
          <label className="block text-sm mb-2">Time of birth</label>
          <input
            name="birth_time"
            type="time"
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 outline-none focus:border-orange-400"
          />
          <p className="text-xs text-white/40 mt-1">Leave blank if unknown.</p>
        </div>

        <div>
          <label className="block text-sm mb-2">Place of birth</label>
          <input
            name="place_name"
            type="text"
            placeholder="Kolkata, India"
            required
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 outline-none focus:border-orange-400"
          />
          <p className="text-xs text-white/40 mt-1">
            City, country. We use it to look up approximate coordinates.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 text-black hover:bg-orange-400 disabled:opacity-50 py-3 rounded-full font-medium"
        >
          {loading ? 'Preparing your chart...' : 'Continue'}
        </button>
      </form>

      <p className="text-xs text-white/40 mt-8 leading-relaxed">
        This is offered as reflection and symbolism, not prediction or guarantee.
        For health, financial, or legal concerns, consult qualified professionals.
      </p>
    </main>
  )
}
