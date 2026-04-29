/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { describe, expect, it } from 'vitest'
import {
  answerExactChartFact,
  compareSarvashtakavarga,
  getHouseInfo,
  getMahadashaInfo,
  getPlanetPlacement,
  getVarshaphal2026Period,
} from '@/lib/astro/reading/chart-facts'

describe('chart facts', () => {
  it('answers identity and placement facts', () => {
    expect(answerExactChartFact('What exact Name is recorded in the birth data?')?.answer).toBe('Jyotishko Roy')
    expect(answerExactChartFact('What exact Sex is recorded in the birth data?')?.answer).toBe('Male')
    expect(answerExactChartFact('What exact Lagna is recorded in the birth data?')?.answer).toBe('Leo')
    expect(answerExactChartFact('Where is Sun placed by sign, degree, nakshatra, pada and whole-sign house?')?.answer).toContain('Taurus')
  })

  it('returns house and period facts', () => {
    expect(getHouseInfo(10)?.sign).toBe('Taurus')
    expect(getHouseInfo(12)?.domain).toContain('sleep')
    expect(getPlanetPlacement('Sun')).toContain('house 10')
    expect(getMahadashaInfo('Jupiter')?.[1]).toBe('22 Aug 2018')
    expect(getVarshaphal2026Period('Rahu')).toContain('Bhav 8th')
  })

  it('compares Sarvashtakavarga deterministically', () => {
    expect(compareSarvashtakavarga('Aries', 'Taurus')).toEqual({ stronger: 'Aries', difference: 4 })
  })
})
