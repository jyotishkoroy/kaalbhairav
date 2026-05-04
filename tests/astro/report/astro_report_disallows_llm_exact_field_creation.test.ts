/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'

import { buildAstroReportContract } from '@/lib/astro/report/report-builder.ts'

describe('astro report disallows llm exact field creation', () => {
  it('does not resolve LLM-provided chart facts directly', () => {
    const report = buildAstroReportContract({
      chartJson: {
        llm: {
          lagna_sign: 'Virgo',
          moon_house: 5,
          remedy_guidance: 'Buy an expensive gemstone immediately.',
        },
        generated_answer: 'Your Lagna is Virgo.',
      },
      profileId: 'profile-test',
      chartVersionId: 'chart-test',
      now: new Date('2026-05-04T00:00:00.000Z'),
      sourceMode: 'test_fixture',
    })
    const fields = report.groups.flatMap((group) => group.fields)
    expect(fields.find((field) => field.fieldKey === 'lagna_sign')).toMatchObject({ status: 'unavailable' })
    expect(fields.find((field) => field.fieldKey === 'moon_house')).toMatchObject({ status: 'unavailable' })
    const remedy = fields.find((field) => field.fieldKey === 'remedy_guidance')
    expect(remedy).toMatchObject({ status: 'unavailable' })
    expect(remedy && 'unavailable' in remedy ? remedy.unavailable.reason : undefined).toMatch(/unsafe_to_answer|source_not_allowed/)
    expect(fields.find((field) => field.fieldKey === 'timing_guidance')).toMatchObject({ status: 'unavailable' })
    expect(JSON.stringify(report)).not.toContain('expensive gemstone immediately')
  })
})
