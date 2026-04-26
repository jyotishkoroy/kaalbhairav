'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type FormState = {
  display_name: string
  birth_date: string
  birth_time: string
  birth_time_known: boolean
  birth_time_precision: 'exact' | 'approximate' | 'unknown'
  birth_place_name: string
  latitude: string
  longitude: string
  timezone: string
  gender: string
  data_consent: boolean
}

const DATA_CONSENT_VERSION = '2026-04-25'

export default function NewProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    display_name: '',
    birth_date: '',
    birth_time: '',
    birth_time_known: true,
    birth_time_precision: 'exact',
    birth_place_name: '',
    latitude: '',
    longitude: '',
    timezone: 'Asia/Kolkata',
    gender: '',
    data_consent: false,
  })

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    setError(null)

    if (!form.display_name.trim()) return setError('Display name is required.')
    if (!form.birth_date) return setError('Birth date is required.')
    if (!form.birth_place_name.trim()) return setError('Birth place is required.')
    if (!form.latitude || !form.longitude) return setError('Latitude and longitude are required.')
    if (!form.timezone.trim()) return setError('Timezone is required.')
    if (!form.data_consent) return setError('You must agree to data processing to continue.')

    setLoading(true)

    try {
      const body: Record<string, unknown> = {
        display_name: form.display_name.trim(),
        birth_date: form.birth_date,
        birth_time_known: form.birth_time_known,
        birth_time_precision: form.birth_time_precision,
        birth_place_name: form.birth_place_name.trim(),
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        timezone: form.timezone.trim(),
        data_consent_version: DATA_CONSENT_VERSION,
      }

      if (form.birth_time_known && form.birth_time) {
        body.birth_time = form.birth_time
      }
      if (form.gender) {
        body.gender = form.gender
      }

      const profileRes = await fetch('/api/astro/v1/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const profileData = await profileRes.json()

      if (!profileRes.ok || !profileData.profile_id) {
        throw new Error(profileData.error ?? 'Failed to create profile.')
      }

      const profileId: string = profileData.profile_id

      const calcRes = await fetch('/api/astro/v1/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId }),
      })

      if (!calcRes.ok) {
        console.warn('Calculation failed, proceeding to profile page anyway')
      }

      router.push(`/astro/v1/profile/${profileId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-serif mb-2">New birth profile</h1>
      <p className="text-white/50 text-sm mb-8">
        Your birth data is encrypted before storage. It is never sent to the AI.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-900/40 border border-red-700/50 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-sm text-white/70 mb-1" htmlFor="display_name">
            Display name <span className="text-red-400">*</span>
          </label>
          <input
            id="display_name"
            type="text"
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-orange-500/60"
            placeholder="e.g. My chart"
            value={form.display_name}
            onChange={(e) => set('display_name', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1" htmlFor="birth_date">
            Birth date <span className="text-red-400">*</span>
          </label>
          <input
            id="birth_date"
            type="date"
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-orange-500/60"
            value={form.birth_date}
            onChange={(e) => set('birth_date', e.target.value)}
          />
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-orange-500"
              checked={form.birth_time_known}
              onChange={(e) => set('birth_time_known', e.target.checked)}
            />
            <span className="text-sm text-white/70">Birth time is known</span>
          </label>
        </div>

        {form.birth_time_known && (
          <div>
            <label className="block text-sm text-white/70 mb-1" htmlFor="birth_time">
              Birth time
            </label>
            <input
              id="birth_time"
              type="time"
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-orange-500/60"
              value={form.birth_time}
              onChange={(e) => set('birth_time', e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="block text-sm text-white/70 mb-1" htmlFor="birth_time_precision">
            Birth time precision
          </label>
          <select
            id="birth_time_precision"
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-orange-500/60"
            value={form.birth_time_precision}
            onChange={(e) =>
              set('birth_time_precision', e.target.value as FormState['birth_time_precision'])
            }
          >
            <option value="exact">Exact (from birth certificate)</option>
            <option value="approximate">Approximate (from memory)</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1" htmlFor="birth_place_name">
            Birth place name <span className="text-red-400">*</span>
          </label>
          <input
            id="birth_place_name"
            type="text"
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-orange-500/60"
            placeholder="e.g. Kolkata, West Bengal, India"
            value={form.birth_place_name}
            onChange={(e) => set('birth_place_name', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/70 mb-1" htmlFor="latitude">
              Latitude <span className="text-red-400">*</span>
            </label>
            <input
              id="latitude"
              type="number"
              step="0.0001"
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-orange-500/60"
              placeholder="e.g. 22.5667"
              value={form.latitude}
              onChange={(e) => set('latitude', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1" htmlFor="longitude">
              Longitude <span className="text-red-400">*</span>
            </label>
            <input
              id="longitude"
              type="number"
              step="0.0001"
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-orange-500/60"
              placeholder="e.g. 88.3667"
              value={form.longitude}
              onChange={(e) => set('longitude', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1" htmlFor="timezone">
            Timezone <span className="text-red-400">*</span>
          </label>
          <input
            id="timezone"
            type="text"
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-orange-500/60"
            placeholder="e.g. Asia/Kolkata"
            value={form.timezone}
            onChange={(e) => set('timezone', e.target.value)}
          />
          <p className="text-xs text-white/30 mt-1">IANA timezone format (e.g. Asia/Kolkata, America/New_York)</p>
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1" htmlFor="gender">
            Gender <span className="text-white/30">(optional)</span>
          </label>
          <select
            id="gender"
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-orange-500/60"
            value={form.gender}
            onChange={(e) => set('gender', e.target.value)}
          >
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="p-4 border border-white/10 rounded-lg bg-white/5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 mt-0.5 accent-orange-500"
              checked={form.data_consent}
              onChange={(e) => set('data_consent', e.target.checked)}
            />
            <span className="text-sm text-white/60 leading-relaxed">
              I consent to my birth data being stored in encrypted form on Kaalbhairav servers for
              the purpose of astrological calculation. This data is never shared with third parties
              and can be deleted at any time from Settings. (
              <a href="/privacy" className="underline text-orange-400">
                Privacy Policy
              </a>
              )
            </span>
          </label>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 bg-orange-700 rounded-lg hover:bg-orange-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating profile…' : 'Create profile and calculate'}
        </button>
      </div>
    </main>
  )
}
