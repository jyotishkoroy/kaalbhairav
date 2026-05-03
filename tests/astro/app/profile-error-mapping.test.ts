/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, it, expect } from 'vitest'

// Mirrors the mapErrorCode function in BirthProfileForm.tsx
function mapErrorCode(code: string): string {
  switch (code) {
    case 'unauthenticated': return 'Your session has expired. Please sign in again.'
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

describe('profile error code mapping', () => {
  it('maps profile_create_failed to user-friendly message', () => {
    const msg = mapErrorCode('profile_create_failed')
    expect(msg).not.toBe('profile_create_failed')
    expect(msg.toLowerCase()).toContain('profile')
  })

  it('maps profile_save_failed to user-friendly message', () => {
    const msg = mapErrorCode('profile_save_failed')
    expect(msg).not.toBe('profile_save_failed')
    expect(msg.length).toBeGreaterThan(10)
  })

  it('maps unauthenticated to session expired message', () => {
    const msg = mapErrorCode('unauthenticated')
    expect(msg.toLowerCase()).toContain('session')
  })

  it('maps invalid_birth_date to date message', () => {
    const msg = mapErrorCode('invalid_birth_date')
    expect(msg.toLowerCase()).toContain('date')
  })

  it('maps profile_edit_locked to locked message', () => {
    const msg = mapErrorCode('profile_edit_locked')
    expect(msg.toLowerCase()).toContain('locked')
  })

  it('maps rate_limited to wait message', () => {
    const msg = mapErrorCode('rate_limited')
    expect(msg.toLowerCase()).toContain('wait')
  })

  it('does not expose raw machine codes to user', () => {
    const rawCodes = ['profile_create_failed', 'profile_save_failed', 'profile_update_failed']
    for (const code of rawCodes) {
      const msg = mapErrorCode(code)
      expect(msg).not.toContain('_failed')
    }
  })

  it('returns generic message for unknown underscore_code', () => {
    const msg = mapErrorCode('some_internal_error_code')
    expect(msg).not.toContain('some_internal')
    expect(msg.length).toBeGreaterThan(10)
  })
})
