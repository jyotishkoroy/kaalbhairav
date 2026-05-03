/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'
import { normalizeDateForApi, normalizeTimeForApi } from '@/lib/astro/profile-input-normalize'

describe('profile input normalization', () => {
  it('keeps ISO birth dates unchanged', () => {
    expect(normalizeDateForApi('1999-06-14')).toBe('1999-06-14')
  })

  it('converts DD/MM/YYYY to ISO when unambiguous', () => {
    expect(normalizeDateForApi('14/06/1999')).toBe('1999-06-14')
  })

  it('rejects invalid dates', () => {
    expect(normalizeDateForApi('31/02/1999')).toBeNull()
  })

  it('converts AM/PM times to 24h format', () => {
    expect(normalizeTimeForApi('09:58 AM')).toBe('09:58')
    expect(normalizeTimeForApi('09:58 PM')).toBe('21:58')
  })

  it('rejects invalid times', () => {
    expect(normalizeTimeForApi('25:61')).toBeNull()
  })
})
