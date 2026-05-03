'use client'

/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { PlaceAutocomplete } from './PlaceAutocomplete'
import { normalizeDateForApi, normalizeTimeForApi } from '@/lib/astro/profile-input-normalize'

type FormState = 'idle' | 'submitting' | 'calculating' | 'error'

type ResolvedPlace = {
  label: string
  latitude: number
  longitude: number
  timezone: string
  elevationMeters?: number | null
}

type Props = {
  googleName: string
  googleEmail: string
  hasProfile: boolean
}

const TERMS_VERSION = 'tarayai-astro-v1-2026-05-03'

function mapErrorCode(code: string): string {
  switch (code) {
    case 'unauthenticated': return 'Your session has expired. Please sign in again.'
    case 'profile_not_found': return 'Your saved birth profile could not be found. Please refresh and try again.'
    case 'profile_access_denied': return 'Your saved birth profile could not be accessed. Please sign in again.'
    case 'profile_birth_data_missing':
    case 'profile_birth_data_invalid': return 'Your birth details were saved but could not be read for chart calculation. Please review and update them.'
    case 'astrology_settings_missing': return 'Your astrology settings could not be prepared. Please try again.'
    case 'chart_engine_failed': return 'Chart calculation failed. Please check the birth date, time, and place.'
    case 'chart_version_save_failed': return 'Your chart was calculated but could not be saved. Please try again.'
    case 'prediction_summary_save_failed': return 'Your chart was saved but guidance preparation failed. Please try again.'
    case 'invalid_birth_date': return 'The birth date you entered is not valid. Please check the date format.'
    case 'invalid_birth_time': return 'The birth time you entered is not valid.'
    case 'place_resolution_failed': return 'Please select a valid place from the suggestions.'
    case 'profile_edit_locked': return 'Birth details are currently locked and cannot be changed yet.'
    case 'profile_save_failed':
    case 'profile_update_failed':
    case 'profile_create_failed': return 'We could not save your birth profile. Please check the details and try again.'
    case 'chart_calculation_failed': return 'Chart calculation failed. Please try again.'
    case 'invalid_input': return 'Some profile details are invalid. Please check the form and try again.'
    case 'rate_limited': return 'Too many requests. Please wait a moment and try again.'
    default:
      // Only pass through if it looks like a human-readable message (contains spaces), not a machine code
      if (code && code.includes(' ') && !code.includes('\n') && code.length < 200) return code
      return 'We could not save your birth profile. Please check the details and try again.'
  }
}

export function BirthProfileForm({ googleName, googleEmail, hasProfile }: Props) {
  const router = useRouter()
  const [state, setState] = useState<FormState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [showTerms, setShowTerms] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<null | Record<string, unknown>>(null)
  const [birthTimeUnknown, setBirthTimeUnknown] = useState(false)
  const [resolvedPlace, setResolvedPlace] = useState<ResolvedPlace | null>(null)
  const submittingRef = useRef(false)

  function handlePlaceResolved(place: ResolvedPlace) {
    setResolvedPlace(place)
    setError(null)
  }

  function handlePlaceClear() {
    setResolvedPlace(null)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submittingRef.current) return
    setError(null)

    const formData = new FormData(e.currentTarget)
    const birthDate = normalizeDateForApi(String(formData.get('birth_date') || ''))
    const birthTime = birthTimeUnknown ? null : normalizeTimeForApi(String(formData.get('birth_time') || ''))
    const aboutSelf = String(formData.get('about_self') || '') || undefined

    if (!birthDate) { setError('Birth date is required and must be valid.'); return }
    if (!birthTimeUnknown && !birthTime) { setError('Birth time is required and must be valid.'); return }
    if (!resolvedPlace) {
      setError('Please select a valid place from the suggestions.')
      return
    }

    const payload: Record<string, unknown> = {
      birth_date: birthDate,
      birth_time: birthTime || null,
      birth_time_known: !birthTimeUnknown && !!birthTime,
      birth_time_precision: birthTimeUnknown ? 'unknown' : 'exact',
      birth_place_name: resolvedPlace.label,
      latitude: resolvedPlace.latitude,
      longitude: resolvedPlace.longitude,
      timezone: resolvedPlace.timezone,
      about_self: aboutSelf,
      calendar_system: 'gregorian',
      data_consent_version: 'astro-v1-2026-04-25',
      terms_accepted_version: TERMS_VERSION,
    }

    setPendingPayload(payload)
    setShowTerms(true)
  }

  async function acceptTermsAndSave() {
    if (!pendingPayload || submittingRef.current) return
    submittingRef.current = true
    setShowTerms(false)
    setState('submitting')
    setError(null)

    try {
      const profileResponse = await fetch('/api/astro/v1/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(pendingPayload),
      })

      const profileJson = await profileResponse.json().catch(() => ({}))

      if (!profileResponse.ok) {
        setState('error')
        const rawError = profileJson?.error ?? ''
        const message = profileJson?.message && !profileJson.message.includes('_')
          ? profileJson.message
          : mapErrorCode(rawError)
        setError(message)
        return
      }

      setState('calculating')

      const calculateResponse = await fetch('/api/astro/v1/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ profile_id: profileJson.profile_id }),
      })

      const calculateJson = await calculateResponse.json().catch(() => ({}))

      if (!calculateResponse.ok) {
        setState('error')
        setError(mapErrorCode(calculateJson?.error ?? 'chart_calculation_failed'))
        return
      }

      router.push('/astro')
    } finally {
      submittingRef.current = false
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: '#f0e8d8',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.82rem',
    color: 'rgba(240,232,216,0.65)',
    marginBottom: '0.4rem',
  }

  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0' }

  const busy = state === 'submitting' || state === 'calculating'

  return (
    <>
      {/* Terms modal */}
      {showTerms && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
        }}>
          <div style={{
            background: '#141210', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px',
            padding: '2rem', maxWidth: '420px', width: '100%', color: '#f0e8d8',
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem' }}>Terms of use</h2>
            <p style={{ fontSize: '0.88rem', lineHeight: '1.7', color: 'rgba(240,232,216,0.7)', marginBottom: '1rem' }}>
              Tarayai provides astrology guidance for reflection and symbolism only — not medical, financial, legal, or life advice. Guidance is not a prediction or guarantee. By continuing you agree to these terms.
            </p>
            <p style={{ fontSize: '0.78rem', color: 'rgba(240,232,216,0.45)', marginBottom: '1.5rem' }}>
              Your birth details are stored encrypted and are not shared with third parties.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setShowTerms(false) }}
                style={{
                  flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '999px', padding: '0.6rem 1rem', color: 'rgba(240,232,216,0.7)',
                  cursor: 'pointer', fontSize: '0.88rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={acceptTermsAndSave}
                disabled={busy}
                style={{
                  flex: 2, background: 'rgba(181,150,98,0.85)', border: 'none', borderRadius: '999px',
                  padding: '0.6rem 1rem', color: '#0a0806', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer', fontSize: '0.88rem',
                }}
              >
                I accept — continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Identity — read-only from Google */}
      <div style={{ marginBottom: '1.5rem', padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
        <p style={{ fontSize: '0.8rem', color: 'rgba(240,232,216,0.45)', marginBottom: '0.25rem' }}>Signed in as</p>
        <p style={{ fontSize: '0.95rem', fontWeight: '500' }}>{googleName}</p>
        <p style={{ fontSize: '0.82rem', color: 'rgba(240,232,216,0.5)' }}>{googleEmail}</p>
      </div>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="birth_date">Date of birth</label>
          <input id="birth_date" name="birth_date" type="date" required disabled={busy} style={inputStyle} />
        </div>

        <div style={fieldStyle}>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={birthTimeUnknown}
              onChange={(e) => setBirthTimeUnknown(e.target.checked)}
              disabled={busy}
            />
            I don&apos;t know my birth time
          </label>
        </div>

        {!birthTimeUnknown && (
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="birth_time">Time of birth</label>
            <input id="birth_time" name="birth_time" type="time" disabled={busy} style={inputStyle} />
          </div>
        )}

        <div style={fieldStyle}>
          <label style={labelStyle}>Place of birth</label>
          <PlaceAutocomplete
            disabled={busy}
            onResolved={handlePlaceResolved}
            onClear={handlePlaceClear}
            inputStyle={inputStyle}
          />
          {resolvedPlace && (
            <p style={{ fontSize: '0.75rem', color: 'rgba(128,200,128,0.8)', marginTop: '0.3rem' }}>
              Place resolved: {resolvedPlace.label}
            </p>
          )}
          {!resolvedPlace && (
            <p style={{ fontSize: '0.75rem', color: 'rgba(240,232,216,0.35)', marginTop: '0.3rem' }}>
              Type your city — select from the dropdown to confirm.
            </p>
          )}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="about_self">About yourself <span style={{ color: 'rgba(240,232,216,0.35)' }}>(optional)</span></label>
          <textarea
            id="about_self"
            name="about_self"
            placeholder="Share any context that may help guide the reading…"
            rows={3}
            maxLength={2000}
            disabled={busy}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {error && (
          <p style={{ color: '#e07070', fontSize: '0.88rem' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={busy || !resolvedPlace}
          style={{
            background: (busy || !resolvedPlace) ? 'rgba(181,150,98,0.35)' : 'rgba(181,150,98,0.85)',
            color: (busy || !resolvedPlace) ? 'rgba(240,232,216,0.45)' : '#0a0806',
            border: 'none',
            borderRadius: '999px',
            padding: '0.75rem',
            fontWeight: '600',
            fontSize: '0.95rem',
            cursor: (busy || !resolvedPlace) ? 'not-allowed' : 'pointer',
            width: '100%',
          }}
        >
          {state === 'submitting' ? 'Saving…' : state === 'calculating' ? 'Calculating chart…' : hasProfile ? 'Update birth details' : 'Continue'}
        </button>
      </form>
    </>
  )
}
