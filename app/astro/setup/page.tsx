'use client'

import { type FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

import { BirthProfileForm } from '@/app/astro/components/BirthProfileForm'
import { saveBirthChart } from './actions'

export default function AstroSetupPage() {
  const astroV1Enabled = process.env.NEXT_PUBLIC_ASTRO_V1_UI_ENABLED === 'true'
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(event.currentTarget)
      const result = await saveBirthChart(formData)

      if (result?.success) {
        router.push('/astro')
        return
      }

      alert(result?.error ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (astroV1Enabled) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950">
        <div className="mx-auto max-w-xl space-y-6">
          <div>
            <p className="text-sm font-medium text-zinc-500">/astro V1 setup</p>
            <h1 className="mt-2 text-3xl font-semibold">Create birth profile</h1>
            <p className="mt-3 text-zinc-600">
              Your raw birth details are encrypted before storage. V1 creates a safe stub chart and prediction context only.
            </p>
          </div>

          <BirthProfileForm />

          <p className="text-xs leading-relaxed text-zinc-500">
            This is offered as reflection and symbolism, not prediction or guarantee. For health, financial, or legal concerns, consult qualified professionals.
          </p>
        </div>
      </main>
    )
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
        This is offered as reflection and symbolism, not prediction or guarantee. For health, financial, or legal concerns, consult qualified professionals.
      </p>
    </main>
  )
}
