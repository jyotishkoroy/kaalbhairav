/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'

import { buildAstroReportSourceManifest } from '@/lib/astro/report/source-manifest.ts'
import { getAstroReportFieldRegistry } from '@/lib/astro/report/field-registry.ts'

describe('astro report source manifest', () => {
  it('mirrors the registry and keeps required coverage', () => {
    const registry = getAstroReportFieldRegistry()
    const manifest = buildAstroReportSourceManifest()
    expect(manifest).toHaveLength(registry.length)
    for (const entry of manifest) {
      expect(entry).toMatchObject({
        fieldKey: expect.any(String),
        sourceType: expect.any(String),
        requiredChartPaths: expect.any(Array),
        riskLevel: expect.any(String),
        enabled: expect.any(Boolean),
      })
    }
    expect(manifest.find((entry) => entry.fieldKey === 'outer_planets')).toMatchObject({ sourceType: 'unavailable' })
    expect(manifest.find((entry) => entry.fieldKey === 'remedy_guidance')).toMatchObject({ riskLevel: 'BLOCKER' })
    expect(manifest.find((entry) => entry.fieldKey === 'timing_guidance')).toMatchObject({ riskLevel: 'BLOCKER' })
    expect(JSON.stringify(manifest)).not.toContain('secret')
  })
})
