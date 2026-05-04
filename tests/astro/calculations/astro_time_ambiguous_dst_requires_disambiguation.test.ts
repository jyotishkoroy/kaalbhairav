/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'
import { normalizeBirthTimeForCalculation } from '@/lib/astro/calculations/time'

describe('normalizeBirthTimeForCalculation ambiguous DST', () => {
  it('rejects fall-back local time that occurs twice', () => {
    const result = normalizeBirthTimeForCalculation({
      dateOfBirth: '2024-11-03',
      timeOfBirth: '01:30:00',
      timezone: 'America/New_York',
      birthTimeKnown: true,
    })

    expect(result.status).toBe('ambiguous_local_time')
    expect(result.dstStatus).toBe('ambiguous')
    expect(result.utcDateTime).toBeUndefined()
    expect(result.error).toBe('ambiguous_local_time')
  })
})
