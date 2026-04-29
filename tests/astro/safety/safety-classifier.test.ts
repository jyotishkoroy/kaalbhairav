/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { describe, expect, it } from 'vitest'
import { classifySafety, detectSafetyRisk } from '@/lib/astro/safety'

describe('Astro safety classifier', () => {
  it('detects self-harm risk', () => {
    expect(detectSafetyRisk('I want to kill myself').selfHarm).toBe(true)
  })

  it('detects medical risk', () => {
    expect(
      detectSafetyRisk('Do I have cancer according to my chart?').medical,
    ).toBe(true)
  })

  it('detects death prediction risk', () => {
    expect(detectSafetyRisk('When will I die?').death).toBe(true)
  })

  it('detects legal risk', () => {
    expect(detectSafetyRisk('Will I go to jail?').legal).toBe(true)
  })

  it('detects pregnancy risk', () => {
    expect(
      detectSafetyRisk('Am I pregnant according to astrology?').pregnancy,
    ).toBe(true)
  })

  it('detects fear-based astrology risk', () => {
    expect(detectSafetyRisk('Am I cursed?').fearBased).toBe(true)
  })

  it('detects gemstone risk', () => {
    expect(
      detectSafetyRisk('Should I wear blue sapphire immediately?').gemstone,
    ).toBe(true)
  })

  it('returns risk names', () => {
    const result = classifySafety('Can astrology diagnose cancer?')

    expect(result.hasRisk).toBe(true)
    expect(result.riskNames).toContain('medical')
  })

  it('does not overblock normal career questions', () => {
    const result = classifySafety('When will my career improve?')

    expect(result.hasRisk).toBe(false)
    expect(result.riskNames).toEqual([])
  })
})
