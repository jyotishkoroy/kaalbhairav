/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'

import { buildAstroReportSourceManifest } from '@/lib/astro/report/source-manifest.ts'
import { getAstroReportFieldRegistry } from '@/lib/astro/report/field-registry.ts'

describe('astro source manifest provenance contract', () => {
  it('adds provenance metadata for every registry entry', () => {
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
        allowedSourceTypes: expect.any(Array),
        requiresSourcePath: expect.any(Boolean),
        requiresChartVersion: expect.any(Boolean),
        exactFactEligible: expect.any(Boolean),
      })
    }
    expect(manifest.find((entry) => entry.fieldKey === 'lagna_sign')).toMatchObject({ exactFactEligible: true, requiresSourcePath: true })
    expect(manifest.find((entry) => entry.fieldKey === 'remedy_guidance')).toMatchObject({ exactFactEligible: false, sourceType: 'llm_grounded_text' })
    expect(manifest.find((entry) => entry.fieldKey === 'outer_planets')).toMatchObject({ exactFactEligible: false, sourceType: 'unavailable' })
    expect(JSON.stringify(manifest)).not.toContain('secret')
  })
})
