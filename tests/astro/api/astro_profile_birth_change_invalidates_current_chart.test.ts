/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest'

import { didCalculationAffectingProfileFieldsChange } from '@/lib/astro/api/profile-current-chart-invalidation'

describe('didCalculationAffectingProfileFieldsChange', () => {
  it('invalidates the current chart when birth time changes', () => {
    expect(didCalculationAffectingProfileFieldsChange({
      existingProfile: {
        birthDate: '2026-05-05',
        birthTime: '07:30:00',
        timezone: 'Asia/Kolkata',
        latitude: 13.0833,
        longitude: 80.2707,
      },
      nextProfilePatch: {
        birthTime: '08:30:00',
      },
    })).toBe(true)
  })

  it('preserves the current chart for display-only changes', () => {
    expect(didCalculationAffectingProfileFieldsChange({
      existingProfile: {
        birthDate: '2026-05-05',
        birthTime: '07:30:00',
      },
      nextProfilePatch: {
        display_name: 'New display name',
      },
    })).toBe(false)
  })

  it('treats timezone and birthplace changes as calculation-affecting', () => {
    expect(didCalculationAffectingProfileFieldsChange({
      existingProfile: {
        birthPlace: 'Chennai',
        timezone: 'Asia/Kolkata',
      },
      nextProfilePatch: {
        birthPlace: 'Bengaluru',
        timezone: 'Asia/Calcutta',
      },
    })).toBe(true)
  })

  it('handles null and numeric coordinate changes', () => {
    expect(didCalculationAffectingProfileFieldsChange({
      existingProfile: {
        latitude: null,
        longitude: null,
      },
      nextProfilePatch: {
        latitude: 13.0833,
        longitude: 80.2707,
      },
    })).toBe(true)
  })
})

