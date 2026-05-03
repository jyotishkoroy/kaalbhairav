/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'
import { normalizeStoredBirthData } from '@/lib/astro/profile-birth-data'

const base = {
  display_name: 'Test',
  birth_date: '1999-06-14',
  birth_time: '09:58',
  birth_time_known: true,
  birth_time_precision: 'exact',
  birth_place_name: 'Kolkata, West Bengal, India',
  latitude: 22.5726,
  longitude: 88.3639,
  timezone: 'Asia/Kolkata',
  data_consent_version: 'astro-v1',
}

describe('stored birth data normalization', () => {
  it('accepts canonical snake_case payloads', () => {
    const normalized = normalizeStoredBirthData(base)
    expect(normalized.birth_date).toBe('1999-06-14')
    expect(normalized.birth_time_precision).toBe('exact')
  })

  it('accepts legacy camelCase payloads', () => {
    const normalized = normalizeStoredBirthData({
      displayName: 'Legacy',
      birthDate: '1999-06-14',
      birthTime: '09:58',
      birthTimeKnown: true,
      birthTimePrecision: 'exact',
      birthPlace: 'Kolkata, West Bengal, India',
      lat: 22.57,
      lng: 88.36,
      tz: 'Asia/Kolkata',
      dataConsentVersion: 'astro-v1',
    })
    expect(normalized.display_name).toBe('Legacy')
    expect(normalized.timezone).toBe('Asia/Kolkata')
  })

  it('rejects missing timezone', () => {
    expect(() => normalizeStoredBirthData({
      ...base,
      timezone: '',
    })).toThrow('invalid_birth_data')
  })

  it('rejects invalid coordinates', () => {
    expect(() => normalizeStoredBirthData({
      ...base,
      latitude: 100,
    })).toThrow('invalid_birth_data')
  })

  it('accepts unknown birth time only when precision is unknown', () => {
    const normalized = normalizeStoredBirthData({
      ...base,
      birth_time: null,
      birth_time_known: false,
      birth_time_precision: 'unknown',
    })
    expect(normalized.birth_time_known).toBe(false)
    expect(normalized.birth_time).toBeNull()
  })
})
