import seedCases from '../fixtures/astro-v2-question-bank-seeds.json'
import { describe, expect, it } from 'vitest'
import { generateReadingV2 } from '@/lib/astro/reading/reading-orchestrator-v2'
import { evaluateAstroAnswerQuality, getAnswerSimilarityKey } from '@/lib/astro/reading/answer-quality'

type SeedCase = {
  id: number
  domain?: string
  question?: string
  expectedMode?: string
  expectedTopic?: string
  expectedMustIncludeAny?: string[]
  expectedMustNotIncludeAny?: string[]
}

describe('Reading V2 question bank seed quality', () => {
  it.each(seedCases.slice(0, 200))('answers $id $domain', async (testCase) => {
    const caseData = testCase as SeedCase
    const question = String(caseData.question ?? '')
    const result = await generateReadingV2({
      userId: `question-bank-${caseData.id}`,
      question,
      mode: caseData.expectedMode ?? 'practical_guidance',
    })

    const quality = evaluateAstroAnswerQuality({
      testCase: {
        question,
        expectedTopic: caseData.expectedTopic ?? 'general',
        expectedMustIncludeAny: caseData.expectedMustIncludeAny ?? [],
        expectedMustNotIncludeAny: caseData.expectedMustNotIncludeAny ?? [],
      },
      answer: String(result.answer ?? ''),
      meta: result.meta,
    })

    expect(quality.score).toBeGreaterThanOrEqual(0.4)
  }, 20000)

  it('generates distinct answer keys for diverse prompts', async () => {
    const keys = new Set<string>()
    for (const testCase of seedCases.slice(0, 50)) {
      const caseData = testCase as SeedCase
      const question = String(caseData.question ?? '')
      const result = await generateReadingV2({
        userId: `question-bank-distinct-${caseData.id}`,
        question,
        mode: caseData.expectedMode ?? 'practical_guidance',
      })
      keys.add(getAnswerSimilarityKey(String(result.answer ?? '')))
    }

    expect(keys.size).toBeGreaterThanOrEqual(30)
  })
})
