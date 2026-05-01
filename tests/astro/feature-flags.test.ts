/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { afterEach, describe, expect, it } from 'vitest'

import { getAstroFeatureFlags, isAstroMemoryRelevanceGateEnabled, isAstroReadingV2Enabled, isAstroUserFacingPlanEnabled } from '@/lib/astro/config/feature-flags'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('astro feature flags', () => {
  it('defaults reading v2 to false', () => {
    delete process.env.ASTRO_READING_V2_ENABLED

    expect(isAstroReadingV2Enabled()).toBe(false)
    expect(getAstroFeatureFlags().readingV2Enabled).toBe(false)
    expect(getAstroFeatureFlags().remediesEnabled).toBe(false)
    expect(getAstroFeatureFlags().memoryRelevanceGateEnabled).toBe(false)
    expect(getAstroFeatureFlags().domainAwareEvidenceEnabled).toBe(false)
    expect(isAstroUserFacingPlanEnabled()).toBe(false)
    expect(isAstroMemoryRelevanceGateEnabled()).toBe(false)
  })

  it('defaults remedies to false', () => {
    delete process.env.ASTRO_REMEDIES_ENABLED

    expect(getAstroFeatureFlags().remediesEnabled).toBe(false)
  })

  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
    ['maybe', false],
  ])('parses remedies value %s as %s', (value, expected) => {
    process.env.ASTRO_REMEDIES_ENABLED = value

    expect(getAstroFeatureFlags().remediesEnabled).toBe(expected)
  })

  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
    ['maybe', false],
  ])('parses %s as %s', (value, expected) => {
    process.env.ASTRO_READING_V2_ENABLED = value

    expect(isAstroReadingV2Enabled()).toBe(expected)
  })

  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
    ['maybe', false],
  ])('parses ASTRO_USER_FACING_PLAN_ENABLED %s as %s', (value, expected) => {
    process.env.ASTRO_USER_FACING_PLAN_ENABLED = value

    expect(isAstroUserFacingPlanEnabled()).toBe(expected)
  })

  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
    ['maybe', false],
  ])('parses ASTRO_MEMORY_RELEVANCE_GATE_ENABLED %s as %s', (value, expected) => {
    process.env.ASTRO_MEMORY_RELEVANCE_GATE_ENABLED = value

    expect(isAstroMemoryRelevanceGateEnabled()).toBe(expected)
  })

  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
    ['maybe', false],
  ])('parses ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED %s as %s', (value, expected) => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = value

    expect(getAstroFeatureFlags().domainAwareEvidenceEnabled).toBe(expected)
  })
})
