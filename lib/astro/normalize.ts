import type { BirthProfileInput, AstroWarning, BirthTimePrecision } from './types'

export type NormalizedBirthInput = {
  input_hash_material_version: '1.0.0'
  birth_date_iso: string
  birth_time_iso: string | null
  birth_time_known: boolean
  birth_time_precision: BirthTimePrecision
  birth_time_uncertainty_seconds: number
  timezone: string
  timezone_status: 'valid' | 'invalid' | 'ambiguous' | 'unknown'
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
  if (!input.birth_time_known) {
    warnings.push({
      warning_code: 'BIRTH_TIME_UNKNOWN', severity: 'medium',
      affected_calculations: ['lagna', 'houses', 'dashas'],
      explanation: 'Birth time was not provided. House-based calculations are unreliable.',
      confidence_impact: -25,
    })
  }
  const latitudeRounded = Math.round(input.latitude * 1000) / 1000
  const longitudeRounded = Math.round(input.longitude * 1000) / 1000
  return {
    input_hash_material_version: '1.0.0',
    birth_date_iso: input.birth_date,
    birth_time_iso: input.birth_time ?? null,
    birth_time_known: input.birth_time_known,
    birth_time_precision: input.birth_time_precision,
    birth_time_uncertainty_seconds: PRECISION_TO_UNCERTAINTY[input.birth_time_precision],
    timezone: input.timezone,
    timezone_status: timezoneStatus,
    latitude_rounded: latitudeRounded,
    longitude_rounded: longitudeRounded,
    coordinate_confidence: 0.85,
    warnings,
  }
}
