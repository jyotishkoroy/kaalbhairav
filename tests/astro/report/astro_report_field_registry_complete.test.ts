/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'

import { assertUniqueAstroReportFieldKeys, getAstroReportFieldRegistry } from '@/lib/astro/report/field-registry.ts'

describe('astro report field registry complete', () => {
  it('has unique field keys', () => {
    expect(() => assertUniqueAstroReportFieldKeys()).not.toThrow()
  })

  it('includes required field keys and required shape', () => {
    const registry = getAstroReportFieldRegistry()
    const required = ['display_name', 'birth_date', 'birth_time', 'birth_place', 'lagna_sign', 'moon_sign', 'sun_sign', 'moon_house', 'sun_house', 'moon_nakshatra', 'moon_nakshatra_pada', 'current_mahadasha', 'current_antardasha', 'dasha_timeline', 'panchang_convention', 'tithi', 'paksha', 'yoga', 'karana', 'weekday', 'outer_planets', 'shadbala', 'ashtakavarga', 'remedy_guidance', 'timing_guidance']
    for (const fieldKey of required) {
      expect(registry.some((entry) => entry.fieldKey === fieldKey)).toBe(true)
    }

    for (const entry of registry.filter((item) => item.enabled)) {
      expect(entry.groupId).toBeTruthy()
      expect(entry.groupName).toBeTruthy()
      expect(entry.fieldKey).toBeTruthy()
      expect(entry.displayLabel).toBeTruthy()
      expect(entry.sourceType).toBeTruthy()
      expect(entry.unavailablePolicy?.reason).toBeTruthy()
      expect(entry.riskLevel).toBeTruthy()
      expect(entry.testIds.length).toBeGreaterThanOrEqual(1)
      if (entry.riskLevel === 'HIGH' || entry.riskLevel === 'BLOCKER') {
        expect(entry.versionedSettingsRequired.length > 0 || Boolean(entry.unavailablePolicy)).toBe(true)
      }
    }
  })
})
