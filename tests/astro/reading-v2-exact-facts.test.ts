import { describe, expect, it } from 'vitest'
import { generateReadingV2 } from '@/lib/astro/reading/reading-orchestrator-v2'

describe('reading v2 exact facts', () => {
  it('answers exact chart facts deterministically', async () => {
    const result = await generateReadingV2({ question: 'What exact Lagna is recorded in the birth data?' })
    expect(result.meta?.exactFactAnswered).toBe(true)
    expect(result.meta?.accuracyClass).toBe('Totally accurate')
    expect(result.answer).toContain('Leo')
    expect(result.answer).toContain('How this is derived')
  })
})
