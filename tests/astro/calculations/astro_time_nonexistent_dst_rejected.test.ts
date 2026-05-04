/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'
import { normalizeBirthTimeForCalculation } from '@/lib/astro/calculations/time'

describe('normalizeBirthTimeForCalculation nonexistent DST', () => {
  it('rejects spring-forward local time that never existed', () => {
    const result = normalizeBirthTimeForCalculation({
      dateOfBirth: '2024-03-10',
      timeOfBirth: '02:30:00',
      timezone: 'America/New_York',
      birthTimeKnown: true,
    })

    expect(result.status).toBe('nonexistent_local_time')
    expect(result.dstStatus).toBe('nonexistent')
    expect(result.utcDateTime).toBeUndefined()
    expect(result.error).toBe('nonexistent_local_time')
  })
})
