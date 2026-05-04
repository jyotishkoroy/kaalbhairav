/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'
import { normalizeBirthInput } from '@/lib/astro/normalize'
import { sha256Canonical } from '@/lib/astro/hashing'

describe('negative longitude normalization', () => {
  it('preserves western hemisphere longitude sign through normalization and hash material', () => {
    const normalized = normalizeBirthInput({
      display_name: 'Fixture',
      birth_date: '1999-06-14',
      birth_time: '09:58:00',
      birth_time_known: true,
      birth_time_precision: 'exact',
      birth_place_name: 'New York',
      latitude: 40.7484,
      longitude: -73.9857,
      timezone: 'America/New_York',
      data_consent_version: 'astro-v1',
    })

    const positive = normalizeBirthInput({
      display_name: 'Fixture',
      birth_date: '1999-06-14',
      birth_time: '09:58:00',
      birth_time_known: true,
      birth_time_precision: 'exact',
      birth_place_name: 'New York',
      latitude: 40.7484,
      longitude: 73.9857,
      timezone: 'America/New_York',
      data_consent_version: 'astro-v1',
    })

    expect(normalized.longitude_full).toBe(-73.9857)
    expect(normalized.longitude_rounded).toBe(-73.986)
    expect(normalized.longitude_full).toBeLessThan(0)
    expect(positive.longitude_full).toBeGreaterThan(0)
    expect(sha256Canonical({ lon: normalized.longitude_rounded })).not.toBe(sha256Canonical({ lon: positive.longitude_rounded }))
  })
})
