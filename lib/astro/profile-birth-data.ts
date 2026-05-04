/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { BirthProfileInput, BirthTimePrecision } from './types.ts'

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normalizePrecision(value: unknown): BirthTimePrecision | null {
  return value === 'exact' || value === 'minute' || value === 'hour' || value === 'day_part' || value === 'unknown' ? value : null
}

export function normalizeStoredBirthData(input: unknown): BirthProfileInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('invalid_birth_data')
  }

  const raw = input as Record<string, unknown>
  const birth_date = raw.birth_date ?? raw.birthDate
  const birth_time = raw.birth_time ?? raw.birthTime ?? null
  const birth_time_precision = normalizePrecision(raw.birth_time_precision ?? raw.birthTimePrecision)
  const birth_time_known = typeof raw.birth_time_known === 'boolean'
    ? raw.birth_time_known
    : typeof raw.birthTimeKnown === 'boolean'
      ? raw.birthTimeKnown
      : null
  const birth_place_name = raw.birth_place_name ?? raw.birthPlaceName ?? raw.birth_place ?? raw.birthPlace
  const latitude = raw.latitude ?? raw.lat
  const longitude = raw.longitude ?? raw.lng ?? raw.lon
  const timezone = raw.timezone ?? raw.tz
  const data_consent_version = raw.data_consent_version ?? raw.dataConsentVersion

  if (!isIsoDate(birth_date)) throw new Error('invalid_birth_data')
  if (!birth_time_precision || birth_time_known === null) throw new Error('invalid_birth_data')
  if (birth_time !== null && typeof birth_time !== 'string') throw new Error('invalid_birth_data')
  if (typeof birth_place_name !== 'string' || !birth_place_name.trim()) throw new Error('invalid_birth_data')
  if (!isNumber(latitude) || latitude < -90 || latitude > 90) throw new Error('invalid_birth_data')
  if (!isNumber(longitude) || longitude < -180 || longitude > 180) throw new Error('invalid_birth_data')
  if (typeof timezone !== 'string' || !timezone.trim()) throw new Error('invalid_birth_data')
  if (typeof data_consent_version !== 'string' || !data_consent_version.trim()) throw new Error('invalid_birth_data')

  const knownBirthTime = birth_time_known

  return {
    display_name: typeof raw.display_name === 'string'
      ? raw.display_name
      : typeof raw.displayName === 'string'
        ? raw.displayName
        : 'My chart',
    birth_date,
    birth_time: birth_time && typeof birth_time === 'string' ? birth_time : null,
    birth_time_known: knownBirthTime,
    birth_time_precision,
    birth_place_name: String(birth_place_name),
    latitude,
    longitude,
    timezone: String(timezone),
    gender: typeof raw.gender === 'string' ? raw.gender as BirthProfileInput['gender'] : undefined,
    calendar_system: raw.calendar_system === 'gregorian' || raw.calendarSystem === 'gregorian' ? 'gregorian' : undefined,
    data_consent_version,
  }
}
