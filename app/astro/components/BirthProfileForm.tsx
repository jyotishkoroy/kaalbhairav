'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type FormState = 'idle' | 'submitting' | 'calculating' | 'error'

export function BirthProfileForm() {
  const router = useRouter()
  const [state, setState] = useState<FormState>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setState('submitting')

    const formData = new FormData(event.currentTarget)
    const birthTimeKnown = formData.get('birth_time_known') === 'on'

    const profilePayload = {
      display_name: String(formData.get('display_name') || ''),
      birth_date: String(formData.get('birth_date') || ''),
      birth_time: birthTimeKnown ? String(formData.get('birth_time') || '') : null,
      birth_time_known: birthTimeKnown,
      birth_time_precision: birthTimeKnown ? 'exact_to_minute' : 'unknown',
      birth_place_name: String(formData.get('birth_place_name') || ''),
      latitude: Number(formData.get('latitude')),
      longitude: Number(formData.get('longitude')),
      timezone: String(formData.get('timezone') || ''),
      gender: 'not_provided',
      calendar_system: 'gregorian',
      data_consent_version: 'astro-v1-2026-04-25',
    }

    const profileResponse = await fetch('/api/astro/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profilePayload),
    })

    const profileJson = await profileResponse.json()

    if (!profileResponse.ok) {
      setState('error')
      setError(profileJson?.error || 'Profile creation failed')
      return
    }

    setState('calculating')

    const calculateResponse = await fetch('/api/astro/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileJson.profile_id }),
    })

    const calculateJson = await calculateResponse.json()

    if (!calculateResponse.ok) {
      setState('error')
      setError(calculateJson?.error || 'Calculation failed')
      return
    }

    router.push(`/astro/chart/${profileJson.profile_id}`)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
      <div>
        <label className="block text-sm font-medium text-zinc-900" htmlFor="display_name">
          Profile name
        </label>
        <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" id="display_name" name="display_name" required />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-900" htmlFor="birth_date">
          Birth date
        </label>
        <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" id="birth_date" name="birth_date" type="date" required />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-900">
          <input name="birth_time_known" type="checkbox" defaultChecked />
          Birth time is known
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-900" htmlFor="birth_time">
          Birth time
        </label>
        <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" id="birth_time" name="birth_time" type="time" />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-900" htmlFor="birth_place_name">
          Birth place
        </label>
        <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" id="birth_place_name" name="birth_place_name" placeholder="Kolkata, India" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-900" htmlFor="latitude">
            Latitude
          </label>
          <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" id="latitude" name="latitude" type="number" step="any" placeholder="22.5667" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-900" htmlFor="longitude">
            Longitude
          </label>
          <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" id="longitude" name="longitude" type="number" step="any" placeholder="88.3667" required />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-900" htmlFor="timezone">
          Timezone
        </label>
        <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" id="timezone" name="timezone" placeholder="Asia/Kolkata" required />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        disabled={state === 'submitting' || state === 'calculating'}
        type="submit"
      >
        {state === 'submitting' ? 'Saving...' : state === 'calculating' ? 'Calculating...' : 'Create V1 chart'}
      </button>
    </form>
  )
}
