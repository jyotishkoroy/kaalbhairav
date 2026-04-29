/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

export type WarningCode =
  | 'UNKNOWN_BIRTH_TIME' | 'APPROXIMATE_BIRTH_TIME' | 'INVALID_TIMEZONE'
  | 'AMBIGUOUS_TIMEZONE' | 'NONEXISTENT_LOCAL_TIME' | 'NEAR_SIGN_BOUNDARY'
  | 'NEAR_NAKSHATRA_BOUNDARY' | 'NEAR_PADA_BOUNDARY' | 'MOON_NEAR_NAKSHATRA_BOUNDARY'
  | 'LAGNA_NEAR_SIGN_BOUNDARY' | 'HIGH_LATITUDE_ASCENDANT_INSTABILITY'
  | 'UNAVAILABLE_PANCHANG' | 'UNAVAILABLE_DAILY_TRANSIT' | 'UNAVAILABLE_YOGA'
  | 'UNAVAILABLE_DOSHA' | 'UNSUPPORTED_CALCULATION_MODE' | 'UNAVAILABLE_SWISS_EPHEMERIS'

export type WarningResult = {
  code: string
  severity: 'info' | 'warning' | 'error'
  field: string
  calculation_section: string
  evidence: Record<string, unknown>
}

type EmitWarningInputs = {
  birth_time_known: boolean
  birth_time_precision: string
  timezone_status: string
  planet_boundary_warnings: string[]
  moon_near_nakshatra_boundary: boolean
  lagna_near_sign_boundary: boolean
  latitude: number
  panchang_available: boolean
  daily_transit_available: boolean
  yoga_statuses: string[]
  dosha_statuses: string[]
  swiss_ephemeris_available: boolean
}

function warn(code: string, severity: WarningResult['severity'], field: string, section: string, evidence: Record<string, unknown> = {}): WarningResult {
  return { code, severity, field, calculation_section: section, evidence }
}

export function collectWarnings(inputs: EmitWarningInputs): WarningResult[] {
  const all: WarningResult[] = []

  if (!inputs.birth_time_known || inputs.birth_time_precision === 'unknown') {
    all.push(warn('UNKNOWN_BIRTH_TIME', 'warning', 'birth_time', '2', { birth_time_precision: inputs.birth_time_precision }))
  }
  if (['minute', 'hour', 'day_part'].includes(inputs.birth_time_precision)) {
    all.push(warn('APPROXIMATE_BIRTH_TIME', 'info', 'birth_time', '2', { birth_time_precision: inputs.birth_time_precision }))
  }
  if (inputs.timezone_status === 'invalid') {
    all.push(warn('INVALID_TIMEZONE', 'error', 'timezone', '5', { timezone_status: inputs.timezone_status }))
  }
  if (inputs.timezone_status === 'ambiguous') {
    all.push(warn('AMBIGUOUS_TIMEZONE', 'warning', 'timezone', '5', {}))
  }
  if (inputs.timezone_status === 'nonexistent') {
    all.push(warn('NONEXISTENT_LOCAL_TIME', 'error', 'timezone', '5', {}))
  }
  for (const bw of inputs.planet_boundary_warnings) {
    if (bw.includes('sign boundary')) {
      all.push(warn('NEAR_SIGN_BOUNDARY', 'info', 'planets', '9', { detail: bw }))
    }
    if (bw.includes('nakshatra boundary')) {
      all.push(warn('NEAR_NAKSHATRA_BOUNDARY', 'info', 'planets', '10', { detail: bw }))
    }
    if (bw.includes('pada boundary')) {
      all.push(warn('NEAR_PADA_BOUNDARY', 'info', 'planets', '10', { detail: bw }))
    }
  }
  if (inputs.moon_near_nakshatra_boundary) {
    all.push(warn('MOON_NEAR_NAKSHATRA_BOUNDARY', 'warning', 'moon', '10', {}))
  }
  if (inputs.lagna_near_sign_boundary) {
    all.push(warn('LAGNA_NEAR_SIGN_BOUNDARY', 'warning', 'lagna', '12', {}))
  }
  if (Math.abs(inputs.latitude) >= 66.0) {
    all.push(warn('HIGH_LATITUDE_ASCENDANT_INSTABILITY', 'warning', 'lagna', '12', { latitude: inputs.latitude }))
  }
  if (!inputs.panchang_available) {
    all.push(warn('UNAVAILABLE_PANCHANG', 'info', 'panchang', '17', {}))
  }
  if (!inputs.daily_transit_available) {
    all.push(warn('UNAVAILABLE_DAILY_TRANSIT', 'info', 'transits', '18', {}))
  }
  for (const ys of inputs.yoga_statuses) {
    if (ys !== 'calculated') {
      all.push(warn('UNAVAILABLE_YOGA', 'info', 'yogas', '20', { status: ys }))
      break
    }
  }
  for (const ds of inputs.dosha_statuses) {
    if (ds !== 'calculated') {
      all.push(warn('UNAVAILABLE_DOSHA', 'info', 'doshas', '21', { status: ds }))
      break
    }
  }
  if (!inputs.swiss_ephemeris_available) {
    all.push(warn('UNAVAILABLE_SWISS_EPHEMERIS', 'error', 'engine', '4', {}))
  }

  // Deduplicate
  const seen = new Map<string, WarningResult>()
  for (const w of all) {
    const key = `${w.code}:${w.field}:${w.calculation_section}`
    if (!seen.has(key)) seen.set(key, w)
  }
  return Array.from(seen.values())
}
