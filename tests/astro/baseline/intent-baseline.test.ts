import { describe, expect, it } from 'vitest'

import { classifyIntent } from '@/lib/astro/conversation/intent-classifier'
import { loadAllBaselineFixtures } from './baseline-test-utils'

function extractTopic(result: unknown): string {
  if (!result || typeof result !== 'object') return ''
  const record = result as Record<string, unknown>

  for (const key of ['topic', 'primaryTopic', 'intent', 'category']) {
    const value = record[key]
    if (typeof value === 'string') return value
  }

  return ''
}

const compatibleTopics: Record<string, string[]> = {
  career: ['career', 'job', 'work'],
  marriage: ['marriage', 'relationship', 'love', 'general'],
  money: ['money', 'finance', 'wealth'],
  relationship: ['relationship', 'love', 'marriage'],
  health: ['health', 'medical'],
  death: ['health', 'sensitive', 'general'],
  remedy: ['remedy', 'career', 'general'],
}

describe('Phase 1 baseline - current intent classifier', () => {
  for (const fixture of loadAllBaselineFixtures()) {
    it(`classifies ${fixture.id} without throwing`, () => {
      const result = classifyIntent(fixture.question)
      const topic = extractTopic(result)

      expect(result).toBeTruthy()
      expect(topic.length).toBeGreaterThan(0)

      const allowed = compatibleTopics[fixture.expected.topic] ?? [fixture.expected.topic]
      expect(allowed).toContain(topic)
    })
  }
})
