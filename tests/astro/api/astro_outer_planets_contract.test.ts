/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'

import { buildCanonicalChartJsonV2 } from '@/lib/astro/schemas/canonical-chart-json.ts'
import { unavailableAstroSection } from '@/lib/astro/schemas/astro-section-contract.ts'
import { buildPublicChartFacts } from '@/lib/astro/public-chart-facts.ts'

describe('astro outer planets contract', () => {
  const outerPlanets = unavailableAstroSection({
    reason: 'outer_planets_not_enabled_for_all_engine_modes',
    source: 'not_implemented',
    engine: 'engine-test',
  })

  const canonical = buildCanonicalChartJsonV2({
    metadata: {
      engine: 'engine-test',
      profileId: 'profile-test',
      chartVersionId: 'chart-test',
      calculationId: 'calc-test',
      inputHash: 'input-test',
      settingsHash: 'settings-test',
    },
    sections: {
      timeFacts: unavailableAstroSection({ reason: 'time_facts_not_available', engine: 'engine-test' }),
      planetaryPositions: unavailableAstroSection({ reason: 'planetary_positions_not_available', engine: 'engine-test' }),
      lagna: unavailableAstroSection({ reason: 'lagna_not_available', engine: 'engine-test' }),
      houses: unavailableAstroSection({ reason: 'houses_not_available', engine: 'engine-test' }),
      panchang: unavailableAstroSection({ reason: 'panchang_not_available', engine: 'engine-test' }),
      d1Chart: unavailableAstroSection({ reason: 'd1_chart_not_available', engine: 'engine-test' }),
      d9Chart: unavailableAstroSection({ reason: 'd9_chart_not_available', engine: 'engine-test' }),
      vimshottari: unavailableAstroSection({ reason: 'vimshottari_not_available', engine: 'engine-test' }),
      transits: unavailableAstroSection({ reason: 'transits_not_available', engine: 'engine-test' }),
      advanced: { outerPlanets },
    },
  })

  it('marks outer planets unavailable by default', () => {
    expect(canonical.sections.advanced.outerPlanets.status).toBe('unavailable')
    expect(canonical.sections.advanced.outerPlanets.source).toBe('not_implemented')
    expect(canonical.sections.advanced.outerPlanets.reason).toContain('outer_planets')
  })

  it('does not expose outer planets as computed without a computed contract', () => {
    expect(canonical.sections.advanced.outerPlanets.status).not.toBe('computed')
  })

  it('does not let raw Python-style outer planets become public exact facts', () => {
    const facts = buildPublicChartFacts({
      profileId: 'profile-test',
      chartVersionId: 'chart-test',
      chartJson: {
        metadata: { chart_version_id: 'chart-test', settings_hash: 'settings-test' },
        outer_planets: {
          Uranus: { sign: 'Taurus', house: 10 },
          Neptune: { sign: 'Pisces', house: 8 },
          Pluto: { sign: 'Capricorn', house: 6 },
        },
        lagna: { sign: 'Leo' },
        planets: { Sun: { sign: 'Aries', house: 9 } },
      },
    })

    expect(facts).not.toHaveProperty('Uranus')
    expect(facts).not.toHaveProperty('Neptune')
    expect(facts).not.toHaveProperty('Pluto')
  })

  it('normalizes missing outerPlanets section to unavailable', () => {
    const section = canonical.sections.advanced.outerPlanets
    expect(section.status).toBe('unavailable')
    expect(section.reason).toBe('outer_planets_not_enabled_for_all_engine_modes')
  })

  it('keeps unavailable reason stable', () => {
    expect(canonical.sections.advanced.outerPlanets.reason).toBe('outer_planets_not_enabled_for_all_engine_modes')
  })
})
