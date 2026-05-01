import { describe, expect, it } from 'vitest'
import { NEWS_SOURCES } from '@/lib/news/sources'
import { selectSourceQueue } from '@/lib/news/select-random-source'

const rng = (values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]!
}

describe('news source selection', () => {
  it('case A returns a non-config order', () => {
    const order = selectSourceQueue({ sources: NEWS_SOURCES, rng: rng([0.11]) }).map((source) => source.key)
    expect(order).not.toEqual(NEWS_SOURCES.map((source) => source.key))
  })
  it('case B excludes morning source when evening slot uses it', () => {
    const order = selectSourceQueue({ sources: NEWS_SOURCES, excludeSourceKeys: ['arkeonews'], rng: rng([0.11]) }).map((source) => source.key)
    expect(order[0]).not.toBe('arkeonews')
  })
  it('case C allows excluded fallback when needed', () => {
    const order = selectSourceQueue({ sources: NEWS_SOURCES.map((s) => ({ ...s, isActive: s.key === 'arkeonews' })), excludeSourceKeys: ['arkeonews'], rng: rng([0.11]), allowExcludedFallback: true }).map((source) => source.key)
    expect(order).toContain('arkeonews')
  })
  it('case D is stable for repeated runs', () => {
    const one = selectSourceQueue({ sources: NEWS_SOURCES, rng: rng([0.11, 0.42, 0.73]) }).map((s) => s.key)
    const two = selectSourceQueue({ sources: NEWS_SOURCES, rng: rng([0.11, 0.42, 0.73]) }).map((s) => s.key)
    expect(one).toEqual(two)
  })
  it('case E ignores inactive sources', () => {
    const order = selectSourceQueue({ sources: NEWS_SOURCES.map((s) => ({ ...s, isActive: s.key !== 'arkeonews' })), rng: rng([0.11]) }).map((s) => s.key)
    expect(order).not.toContain('arkeonews')
  })
})
