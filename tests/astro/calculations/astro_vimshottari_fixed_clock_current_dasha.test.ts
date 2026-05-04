/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'
import { calculateVimshottari } from '@/lib/astro/calculations/vimshottari'
import { normalizeRuntimeClock } from '@/lib/astro/calculations/runtime-clock'

describe('calculateVimshottari fixed clock', () => {
  const moonSidereal = 123.45
  const birthUtcISO = '1999-06-14T04:28:00.000Z'

  it('is stable for the same normalized clock', () => {
    const clockA = normalizeRuntimeClock({ currentUtc: '2026-05-04T12:34:56.789Z', asOfDate: '2026-05-04' })
    const clockB = normalizeRuntimeClock({ currentUtc: '2026-05-04T12:34:56Z', asOfDate: '2026-05-04' })

    const resultA = calculateVimshottari(moonSidereal, birthUtcISO, clockA)
    const resultB = calculateVimshottari(moonSidereal, birthUtcISO, clockB)

    expect(resultA.current_dasha).toEqual(resultB.current_dasha)
    expect(resultA.mahadasha_sequence).toEqual(resultB.mahadasha_sequence)
    expect(resultA.as_of_date).toBe('2026-05-04')
    expect(resultA.current_utc).toBe('2026-05-04T12:34:56.789Z')
  })

  it('keeps the natal sequence stable when the clock changes', () => {
    const base = calculateVimshottari(moonSidereal, birthUtcISO, { currentUtc: '2026-05-04T00:00:00Z' })
    const later = calculateVimshottari(moonSidereal, birthUtcISO, { currentUtc: '2026-05-05T00:00:00Z' })

    expect(base.birth_dasha_lord).toBe(later.birth_dasha_lord)
    expect(base.mahadasha_sequence).toEqual(later.mahadasha_sequence)
  })

  it('throws on invalid currentUtc', () => {
    expect(() => normalizeRuntimeClock({ currentUtc: 'not-a-date' })).toThrow('Invalid currentUtc: not-a-date')
  })

  it('defaults the runtime clock at the helper boundary', () => {
    const normalized = normalizeRuntimeClock({ currentUtc: '2026-05-04T00:00:00Z' })
    const result = calculateVimshottari(moonSidereal, birthUtcISO, normalized)

    expect(result.current_utc).toBe('2026-05-04T00:00:00.000Z')
    expect(result.as_of_date).toBe('2026-05-04')
  })
})
