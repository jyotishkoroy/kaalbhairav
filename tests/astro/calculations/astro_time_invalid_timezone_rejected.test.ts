/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'
import { normalizeBirthTimeForCalculation } from '@/lib/astro/calculations/time'

describe('normalizeBirthTimeForCalculation invalid timezone', () => {
  it('rejects invalid IANA timezone strings', () => {
    const result = normalizeBirthTimeForCalculation({
      dateOfBirth: '1999-06-14',
      timeOfBirth: '09:58:00',
      timezone: 'Mars/Olympus',
      birthTimeKnown: true,
    })

    expect(result.status).toBe('invalid_timezone')
    expect(result.dstStatus).toBe('unknown')
    expect(result.utcDateTime).toBeUndefined()
    expect(result.error).toBe('invalid_timezone')
  })
})
