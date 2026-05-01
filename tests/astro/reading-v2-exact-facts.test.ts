/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { describe, expect, it } from 'vitest'
import { generateReadingV2 } from '@/lib/astro/reading/reading-orchestrator-v2'

describe('reading v2 exact facts', () => {
  it('answers exact chart facts deterministically', async () => {
    const result = await generateReadingV2({ question: 'What exact Lagna is recorded in the birth data?' })
    expect(result.meta?.exactFactAnswered).toBe(true)
    expect(result.meta?.accuracyClass).toBe('Totally accurate')
    expect(result.answer).toContain('Direct answer: Leo.')
    expect(result.answer).not.toContain('How this is derived')
    expect(result.answer).not.toContain('Accuracy:')
  })
})
