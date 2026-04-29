import { describe, expect, it } from 'vitest'
import { classifyUserConcern } from '@/lib/astro/reading/concern-classifier'
import {
  formatRemedy,
  getGeneralSafeRemedies,
  getSafeRemediesForPlanet,
  interpretRemedies,
  isSafeRemedy,
  saturnSafeRemedies,
  type Remedy,
} from '@/lib/astro/interpretation/remedies'

function makeRemedyContext(question: string, dasha = { mahadasha: 'Saturn' }) {
  return {
    concern: classifyUserConcern(question),
    chart: {
      lagna: 'Leo',
      moonSign: 'Gemini',
    },
    dasha,
    transits: {},
  }
}

describe('Safe remedies engine', () => {
  it('loads Saturn safe remedies', () => {
    expect(saturnSafeRemedies.length).toBeGreaterThan(0)
    expect(saturnSafeRemedies.every(isSafeRemedy)).toBe(true)
  })

  it('returns safe remedies for Saturn', () => {
    const remedies = getSafeRemediesForPlanet('Saturn')

    expect(remedies.length).toBeGreaterThan(0)
    expect(remedies.every(isSafeRemedy)).toBe(true)
    expect(remedies.map((item) => item.type)).toEqual(
      expect.arrayContaining(['discipline']),
    )
  })

  it('returns general safe remedies for unknown planets', () => {
    const remedies = getSafeRemediesForPlanet('Unknown')

    expect(remedies.length).toBeGreaterThan(0)
    expect(remedies.every(isSafeRemedy)).toBe(true)
  })

  it('formats remedy with safety note', () => {
    const remedy: Remedy = {
      planet: 'Saturn',
      type: 'discipline',
      instruction: 'Keep one fixed routine.',
      safetyNote: 'Do not use fear-based remedies.',
    }

    expect(formatRemedy(remedy)).toContain('Keep one fixed routine')
    expect(formatRemedy(remedy)).toContain('Safety note')
  })

  it('rejects unsafe remedy text', () => {
    const unsafe: Remedy = {
      planet: 'Saturn',
      type: 'routine',
      instruction: 'Wear blue sapphire immediately for guaranteed result.',
    }

    expect(isSafeRemedy(unsafe)).toBe(false)
  })

  it('creates Saturn-safe remedy evidence for remedy request', () => {
    const evidence = interpretRemedies(
      makeRemedyContext('What remedy should I do for career delay?', {
        mahadasha: 'Saturn',
      }),
    )

    expect(evidence.length).toBeGreaterThan(0)
    expect(evidence[0]?.id).toBe('remedy-saturn-safe')
    expect(evidence[0]?.guidance).toContain('routine')
    expect(evidence[0]?.caution).toContain('certainty')
  })

  it('does not create remedy evidence for non-remedy question', () => {
    const evidence = interpretRemedies(makeRemedyContext('When will I get a job?'))

    expect(evidence).toEqual([])
  })

  it('does not mention unsafe direct gemstone recommendation', () => {
    const evidence = interpretRemedies(
      makeRemedyContext('What remedy should I do?', {
        mahadasha: 'Saturn',
      }),
    )

    const text = JSON.stringify(evidence).toLowerCase()

    expect(text).not.toContain('wear blue sapphire immediately')
    expect(text).not.toContain('guaranteed result')
    expect(text).not.toContain('miracle')
    expect(text).not.toContain('pay for puja')
  })

  it('has general safe remedies', () => {
    const remedies = getGeneralSafeRemedies()

    expect(remedies.length).toBeGreaterThan(0)
    expect(remedies.every(isSafeRemedy)).toBe(true)
  })
})
