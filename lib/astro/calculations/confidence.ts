/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

export type ConfidenceResult = {
  score: number
  label: 'high' | 'medium' | 'low'
  deductions: Array<{
    condition: string
    deduction: number
    evidence: Record<string, unknown>
  }>
  rejected: boolean
  rejection_reason?: string
}

export type ConfidenceInputs = {
  birth_time_known: boolean
  birth_time_precision: string
  timezone_status: string
  moon_near_nakshatra_boundary: boolean
  lagna_near_sign_boundary: boolean
  any_planet_near_sign_boundary: boolean
  high_latitude_ascendant_instability: boolean
  panchang_sunrise_unavailable: boolean
  swiss_ephemeris_available: boolean
}

export function calculateConfidence(inputs: ConfidenceInputs): ConfidenceResult {
  const deductions: ConfidenceResult['deductions'] = []
  let score = 100

  // Reject conditions
  if (!inputs.swiss_ephemeris_available) {
    return {
      score: 0, label: 'low',
      deductions: [{ condition: 'Swiss Ephemeris unavailable', deduction: 100, evidence: {} }],
      rejected: true, rejection_reason: 'Swiss Ephemeris is not available',
    }
  }
  if (inputs.timezone_status === 'invalid') {
    return {
      score: 0, label: 'low',
      deductions: [{ condition: 'timezone invalid', deduction: 100, evidence: { timezone_status: inputs.timezone_status } }],
      rejected: true, rejection_reason: 'Timezone is invalid',
    }
  }
  if (inputs.timezone_status === 'nonexistent') {
    return {
      score: 0, label: 'low',
      deductions: [{ condition: 'timezone nonexistent', deduction: 100, evidence: { timezone_status: inputs.timezone_status } }],
      rejected: true, rejection_reason: 'Local time is nonexistent (spring-forward gap)',
    }
  }

  // Birth time precision
  if (!inputs.birth_time_known || inputs.birth_time_precision === 'unknown') {
    score -= 60; deductions.push({ condition: 'birth time unknown', deduction: 60, evidence: { birth_time_precision: inputs.birth_time_precision } })
  } else if (inputs.birth_time_precision === 'day_part') {
    score -= 40; deductions.push({ condition: 'birth time precision day_part', deduction: 40, evidence: {} })
  } else if (inputs.birth_time_precision === 'hour') {
    score -= 20; deductions.push({ condition: 'birth time precision hour', deduction: 20, evidence: {} })
  } else if (inputs.birth_time_precision === 'minute') {
    score -= 5; deductions.push({ condition: 'birth time precision minute', deduction: 5, evidence: {} })
  }

  if (inputs.timezone_status === 'ambiguous') {
    score -= 50; deductions.push({ condition: 'timezone ambiguous', deduction: 50, evidence: { timezone_status: inputs.timezone_status } })
  }
  if (inputs.moon_near_nakshatra_boundary) {
    score -= 25; deductions.push({ condition: 'Moon near nakshatra boundary', deduction: 25, evidence: {} })
  }
  if (inputs.lagna_near_sign_boundary) {
    score -= 20; deductions.push({ condition: 'Lagna near sign boundary', deduction: 20, evidence: {} })
  }
  if (inputs.any_planet_near_sign_boundary) {
    score -= 10; deductions.push({ condition: 'planet near sign boundary', deduction: 10, evidence: {} })
  }
  if (inputs.high_latitude_ascendant_instability) {
    score -= 15; deductions.push({ condition: 'high latitude ascendant instability', deduction: 15, evidence: {} })
  }
  if (inputs.panchang_sunrise_unavailable) {
    score -= 20; deductions.push({ condition: 'panchang sunrise unavailable', deduction: 20, evidence: {} })
  }

  score = Math.max(0, Math.min(100, score))
  const label: ConfidenceResult['label'] = score >= 85 ? 'high' : score >= 60 ? 'medium' : 'low'

  return { score, label, deductions, rejected: false }
}
