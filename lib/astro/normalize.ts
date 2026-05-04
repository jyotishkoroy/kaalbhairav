/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { BirthProfileInput, AstroWarning, BirthTimePrecision } from './types.ts'
import { normalizeBirthTimeForCalculation } from './calculations/time.ts'

export type NormalizedBirthInput = {
  input_hash_material_version: '2.0.0'
  birth_date_iso: string
  birth_time_iso: string | null
  birth_time_known: boolean
  birth_time_precision: BirthTimePrecision
  birth_time_uncertainty_seconds: number
  timezone: string
  timezone_status: 'valid' | 'invalid' | 'ambiguous' | 'unknown'
  birth_time_validation_status?: 'valid' | 'invalid_timezone' | 'nonexistent_local_time' | 'ambiguous_local_time' | 'missing_timezone' | 'missing_birth_time'
  birth_time_validation_dst_status?: 'not_applicable' | 'standard' | 'daylight' | 'ambiguous' | 'nonexistent' | 'unknown'
  birth_utc?: string | null
  // Full precision for astronomical calculation (no rounding)
  latitude_full: number
  longitude_full: number
  // Rounded for display/hashing (3 decimal places)
  latitude_rounded: number
  longitude_rounded: number
  coordinate_confidence: number
  warnings: AstroWarning[]
}

const PRECISION_TO_UNCERTAINTY: Record<BirthTimePrecision, number> = {
  exact: 0, minute: 60, hour: 3600, day_part: 21600, unknown: 86400,
}

export function normalizeBirthInput(input: BirthProfileInput): NormalizedBirthInput {
  const warnings: AstroWarning[] = []
  let timezoneStatus: NormalizedBirthInput['timezone_status'] = 'valid'
  try {
    new Intl.DateTimeFormat('en', { timeZone: input.timezone })
  } catch {
    timezoneStatus = 'invalid'
    warnings.push({
      warning_code: 'TZ_INVALID', severity: 'high',
      affected_calculations: ['planets', 'lagna', 'panchang', 'dashas'],
      explanation: `Timezone "${input.timezone}" is not recognised.`,
      confidence_impact: -30,
    })
  }
  const birthTimeValidation = normalizeBirthTimeForCalculation({
    dateOfBirth: input.birth_date,
    timeOfBirth: input.birth_time ?? null,
    timezone: input.timezone,
    birthTimeKnown: input.birth_time_known,
  })
  const birthTimeValidationStatus = birthTimeValidation.status
  const birthTimeValidationDstStatus = birthTimeValidation.dstStatus
  const birthUtc = birthTimeValidation.utcDateTime ?? null
  if (birthTimeValidationStatus === 'invalid_timezone' && timezoneStatus !== 'invalid') {
    timezoneStatus = 'invalid'
  }
  if (!input.birth_time_known) {
    warnings.push({
      warning_code: 'BIRTH_TIME_UNKNOWN', severity: 'medium',
      affected_calculations: ['lagna', 'houses', 'dashas'],
      explanation: 'Birth time was not provided. House-based calculations are unreliable.',
      confidence_impact: -25,
    })
  }

  // Full precision for astronomical calculations
  const latitude_full = input.latitude
  const longitude_full = input.longitude
  // Display/hash precision (3 decimal places ≈ 110m)
  const latitude_rounded = Math.round(input.latitude * 1000) / 1000
  const longitude_rounded = Math.round(input.longitude * 1000) / 1000

  return {
    input_hash_material_version: '2.0.0',
    birth_date_iso: input.birth_date,
    birth_time_iso: input.birth_time ?? null,
    birth_time_known: input.birth_time_known,
    birth_time_precision: input.birth_time_precision,
    birth_time_uncertainty_seconds: PRECISION_TO_UNCERTAINTY[input.birth_time_precision],
    timezone: input.timezone,
    timezone_status: timezoneStatus,
    birth_time_validation_status: birthTimeValidationStatus,
    birth_time_validation_dst_status: birthTimeValidationDstStatus,
    birth_utc: birthUtc,
    latitude_full,
    longitude_full,
    latitude_rounded,
    longitude_rounded,
    coordinate_confidence: 0.95,
    warnings,
  }
}
