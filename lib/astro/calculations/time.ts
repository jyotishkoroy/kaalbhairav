/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { DateTime, IANAZone } from 'luxon'
import type { BirthInputV2, NormalizedBirthInputV2 } from './contracts.ts'
import {
  calculateAstronomicalJulianDateFromUtc,
  calculateGregorianJdnForLocalDate,
} from './julian-day.ts'
import { normalizeLatitudeDeg, normalizeLongitudeDeg } from './coordinates.ts'

export type BirthTimeValidationStatus =
  | 'valid'
  | 'invalid_timezone'
  | 'nonexistent_local_time'
  | 'ambiguous_local_time'
  | 'missing_timezone'
  | 'missing_birth_time'

export type NormalizedBirthTime = {
  status: BirthTimeValidationStatus
  localDate: string
  localTime: string | null
  timezone: string | null
  utcDateTime?: string
  offsetMinutes?: number
  dstStatus?: 'not_applicable' | 'standard' | 'daylight' | 'ambiguous' | 'nonexistent' | 'unknown'
  warnings: string[]
  error?: string
}

export type TimezoneDisambiguation = 'not_needed' | 'earlier' | 'later' | 'rejected'

export type BirthTimeResult = {
  birth_local_wall_time: string
  timezone: string
  birth_utc: string
  utc_offset_minutes: number
  timezone_status: 'valid' | 'invalid' | 'ambiguous' | 'nonexistent'
  timezone_disambiguation: TimezoneDisambiguation
  birth_time_uncertainty_seconds: number
}

export type NormalizedBirthTimeV2 = NormalizedBirthInputV2

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function formatIsoLocal(parts: { year: number; month: number; day: number; hour: number; minute: number; second: number }): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}.000`
}

export function parseDateParts(date: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const dt = DateTime.fromObject({ year, month, day }, { zone: 'utc' })
  if (!dt.isValid || dt.year !== year || dt.month !== month || dt.day !== day) return null
  return { year, month, day }
}

export function parseTimeParts(time: string): { hour: number; minute: number; second: number } | null {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  const second = Number(match[3] ?? '0')
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null
  return { hour, minute, second }
}

function parseLocalDate(dateLocal: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateLocal)
  if (!match) {
    throw new Error('date_local must be in YYYY-MM-DD format.')
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const check = new Date(Date.UTC(year, month - 1, day))
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new Error('date_local must be a valid Gregorian date.')
  }

  return { year, month, day }
}

function parseLocalTime(timeLocal: string): { hour: number; minute: number; second: number; normalized: string } {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(timeLocal)
  if (!match) {
    throw new Error('time_local must be in HH:mm or HH:mm:ss format.')
  }

  const hour = Number(match[1])
  const minute = Number(match[2])
  const second = Number(match[3] ?? '0')

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
    throw new Error('time_local must be a valid civil time.')
  }

  return {
    hour,
    minute,
    second,
    normalized: `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`,
  }
}

function normalizeRuntimeClockIso(runtimeClock?: string): string {
  const candidate = runtimeClock ?? new Date().toISOString()
  const parsed = new Date(candidate)
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error('runtime_clock must be a valid ISO datetime.')
  }
  return parsed.toISOString()
}

function addSecondsToLocalIso(dateLocal: string, normalizedTime: string, seconds: number): string {
  const parsedDate = parseLocalDate(dateLocal)
  const parsedTime = parseLocalTime(normalizedTime)
  const baseMs = Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day, parsedTime.hour, parsedTime.minute, parsedTime.second)
  return DateTime.fromMillis(baseMs + seconds * 1000, { zone: 'utc' }).toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS")
}

function buildFixedOffsetUtcIso(
  dateLocal: string,
  normalizedTime: string,
  timezoneHours: number,
  warTimeCorrectionSeconds: number,
): string {
  const parsedDate = parseLocalDate(dateLocal)
  const parsedTime = parseLocalTime(normalizedTime)
  const baseMs = Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day, parsedTime.hour, parsedTime.minute, parsedTime.second)
  const utcMs = baseMs - (timezoneHours * 3600 + warTimeCorrectionSeconds) * 1000
  return new Date(utcMs).toISOString()
}

function detectIanaLocalTimeStatus(args: {
  dateLocal: string
  normalizedTime: string
  timezone: string
  disambiguation?: 'earlier' | 'later'
}): { utcIso: string; timezoneHours: number } {
  const [year, month, day] = args.dateLocal.split('-').map(Number)
  const [hour, minute, second] = args.normalizedTime.split(':').map(Number)
  const local = DateTime.fromObject({ year, month, day, hour, minute, second }, { zone: args.timezone })
  if (!local.isValid) {
    throw new Error(`Invalid IANA local time: ${local.invalidExplanation ?? 'nonexistent or invalid time.'}`)
  }

  const possibleOffsets = typeof (local as { getPossibleOffsets?: () => DateTime[] }).getPossibleOffsets === 'function'
    ? (local as { getPossibleOffsets: () => DateTime[] }).getPossibleOffsets()
    : [local]

  const wall = `${args.dateLocal}T${args.normalizedTime}`
  const roundTrip = local.toFormat("yyyy-MM-dd'T'HH:mm:ss")
  if (roundTrip !== wall) {
    throw new Error('Invalid IANA local time: nonexistent DST local time.')
  }

  if (possibleOffsets.length > 1) {
    if (!args.disambiguation) {
      throw new Error('Ambiguous DST local time requires disambiguation.')
    }
    const selected = args.disambiguation === 'later' ? possibleOffsets[possibleOffsets.length - 1] : possibleOffsets[0]
    return { utcIso: selected.toUTC().toISO()!, timezoneHours: selected.offset / 60 }
  }

  return { utcIso: local.toUTC().toISO()!, timezoneHours: local.offset / 60 }
}

export function normalizeBirthDateTime(input: BirthInputV2): NormalizedBirthInputV2 {
  const dateParts = parseLocalDate(input.date_local)
  const printedJulianDay = calculateGregorianJdnForLocalDate(input.date_local)
  const warnings: string[] = []
  const runtimeClockIso = normalizeRuntimeClockIso(input.runtime_clock)

  const latitudeDeg = input.latitude_deg == null ? null : normalizeLatitudeDeg(input.latitude_deg)
  const longitudeDeg = input.longitude_deg == null ? null : normalizeLongitudeDeg(input.longitude_deg)

  if (latitudeDeg == null) warnings.push('Latitude is missing; coordinate-dependent calculations are unavailable.')
  if (longitudeDeg == null) warnings.push('Longitude is missing; coordinate-dependent calculations are unavailable.')

  let timezoneMode: 'iana' | 'fixed_offset_hours' = 'fixed_offset_hours'
  let timezone: string | null = null
  let timezoneHours: number | null = null
  let utcDateTimeIso: string | null = null
  let localDateTimeIso: string | null = null
  let localMeanTimeIso: string | null = null
  let jdUtExact: number | null = null
  let timeLocal: string | null = null
  let standardMeridianDeg: number | null = null
  let localTimeCorrectionSeconds: number | null = null

  const warTimeCorrectionSeconds = input.war_time_correction_seconds ?? 0
  if (!Number.isFinite(warTimeCorrectionSeconds)) {
    throw new Error('war_time_correction_seconds must be finite.')
  }

  if (typeof input.timezone === 'number') {
    if (!Number.isFinite(input.timezone)) {
      throw new Error('timezone must be a finite number or valid IANA string.')
    }
    timezoneMode = 'fixed_offset_hours'
    timezoneHours = input.timezone
  } else if (typeof input.timezone === 'string') {
    const trimmed = input.timezone.trim()
    if (!trimmed) {
      throw new Error('timezone must not be empty.')
    }
    const numeric = Number(trimmed)
    if (Number.isFinite(numeric)) {
      timezoneMode = 'fixed_offset_hours'
      timezoneHours = numeric
    } else {
      if (!IANAZone.isValidZone(trimmed)) {
        throw new Error('timezone must be a valid IANA timezone.')
      }
      timezoneMode = 'iana'
      timezone = trimmed
    }
  } else {
    throw new Error('timezone must be a finite number or valid IANA string.')
  }

  if (input.time_local != null) {
    const parsedTime = parseLocalTime(input.time_local)
    timeLocal = parsedTime.normalized
    localDateTimeIso = formatIsoLocal({
      year: dateParts.year,
      month: dateParts.month,
      day: dateParts.day,
      hour: parsedTime.hour,
      minute: parsedTime.minute,
      second: parsedTime.second,
    })

    if (timezoneMode === 'fixed_offset_hours') {
      if (timezoneHours == null) {
        throw new Error('timezoneHours missing for fixed offset conversion.')
      }
      utcDateTimeIso = buildFixedOffsetUtcIso(input.date_local, timeLocal, timezoneHours, warTimeCorrectionSeconds)
    } else if (timezone) {
      const resolved = detectIanaLocalTimeStatus({
        dateLocal: input.date_local,
        normalizedTime: timeLocal,
        timezone,
        disambiguation: input.disambiguation,
      })
      timezoneHours = resolved.timezoneHours
      utcDateTimeIso = new Date(Date.parse(resolved.utcIso) - warTimeCorrectionSeconds * 1000).toISOString()
    }

    if (utcDateTimeIso) {
      jdUtExact = calculateAstronomicalJulianDateFromUtc(utcDateTimeIso)
    }
  } else {
    warnings.push('Birth time is missing; exact time-dependent calculations are unavailable.')
  }

  if (timezoneHours != null && longitudeDeg != null) {
    standardMeridianDeg = timezoneHours * 15
    localTimeCorrectionSeconds = (longitudeDeg - standardMeridianDeg) * 240
  }

  if (timeLocal != null && localTimeCorrectionSeconds != null) {
    localMeanTimeIso = addSecondsToLocalIso(input.date_local, timeLocal, localTimeCorrectionSeconds)
  }

  return {
    dateLocal: input.date_local,
    timeLocal,
    localDateTimeIso,
    utcDateTimeIso,
    placeName: input.place_name,
    latitudeDeg,
    longitudeDeg,
    timezoneMode,
    timezone,
    timezoneHours,
    warTimeCorrectionSeconds,
    standardMeridianDeg,
    localTimeCorrectionSeconds,
    localMeanTimeIso,
    printedJulianDay,
    jdUtExact,
    runtimeClockIso,
    warnings,
  }
}

export function getLocalTimestampCandidates(args: {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  timezone: string
}): DateTime[] {
  const baseUtcMs = Date.UTC(args.year, args.month - 1, args.day, args.hour, args.minute, args.second)
  const candidates: DateTime[] = []
const seen = new Set<string>()

  for (let ms = baseUtcMs - 14 * 60 * 60 * 1000; ms <= baseUtcMs + 14 * 60 * 60 * 1000; ms += 60_000) {
    const candidate = DateTime.fromMillis(ms, { zone: 'utc' }).setZone(args.timezone)
    if (
      candidate.year === args.year &&
      candidate.month === args.month &&
      candidate.day === args.day &&
      candidate.hour === args.hour &&
      candidate.minute === args.minute &&
      candidate.second === args.second
    ) {
      const key = `${candidate.toMillis()}:${candidate.offset}`
      if (!seen.has(key)) {
        seen.add(key)
        candidates.push(candidate)
      }
    }
  }

  return candidates
}

const PRECISION_UNCERTAINTY: Record<string, number> = {
  exact: 0,
  minute: 60,
  hour: 3600,
  day_part: 21600,
  unknown: 86400,
}

export function convertBirthTimeToUTC(params: {
  birth_date: string
  birth_time?: string
  birth_time_known: boolean
  birth_time_precision: string
  timezone: string
  disambiguation?: 'earlier' | 'later'
}): BirthTimeResult {
  const { birth_date, birth_time, birth_time_known, birth_time_precision, timezone, disambiguation } = params
  const uncertainty = PRECISION_UNCERTAINTY[birth_time_precision] ?? 86400

  const tzCheck = DateTime.now().setZone(timezone, { keepLocalTime: true })
  if (!tzCheck.isValid || tzCheck.zoneName !== timezone) {
    return {
      birth_local_wall_time: `${birth_date}T12:00:00`,
      timezone,
      birth_utc: '',
      utc_offset_minutes: 0,
      timezone_status: 'invalid',
      timezone_disambiguation: 'rejected',
      birth_time_uncertainty_seconds: uncertainty,
    }
  }

  const timeStr = birth_time_known && birth_time ? birth_time : '12:00:00'
  const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr
  const localWall = `${birth_date}T${normalizedTime}`

  const dt = DateTime.fromISO(localWall, { zone: timezone })
  if (!dt.isValid) {
    return {
      birth_local_wall_time: localWall,
      timezone,
      birth_utc: '',
      utc_offset_minutes: 0,
      timezone_status: 'invalid',
      timezone_disambiguation: 'rejected',
      birth_time_uncertainty_seconds: uncertainty,
    }
  }

  const roundTrip = dt.toISO()!
  const reparsed = DateTime.fromISO(roundTrip, { zone: timezone })
  const localFromReparsed = reparsed.toFormat('yyyy-MM-dd\'T\'HH:mm:ss')

  let tzStatus: BirthTimeResult['timezone_status'] = 'valid'
  let tzDisambig: TimezoneDisambiguation = 'not_needed'
  const possibleOffsets = typeof (dt as { getPossibleOffsets?: () => DateTime[] }).getPossibleOffsets === 'function'
    ? (dt as { getPossibleOffsets: () => DateTime[] }).getPossibleOffsets()
    : [dt]

  if (localFromReparsed !== localWall) {
    if (!disambiguation) {
      return {
        birth_local_wall_time: localWall,
        timezone,
        birth_utc: '',
        utc_offset_minutes: 0,
        timezone_status: 'nonexistent',
        timezone_disambiguation: 'rejected',
        birth_time_uncertainty_seconds: uncertainty,
      }
    }
    tzStatus = 'nonexistent'
    tzDisambig = 'rejected'
  } else if (possibleOffsets.length > 1) {
    tzStatus = 'ambiguous'
    if (disambiguation === 'earlier' || disambiguation === 'later') {
      tzDisambig = disambiguation
    } else {
      return {
        birth_local_wall_time: localWall,
        timezone,
        birth_utc: '',
        utc_offset_minutes: 0,
        timezone_status: 'ambiguous',
        timezone_disambiguation: 'rejected',
        birth_time_uncertainty_seconds: uncertainty,
      }
    }
  }

  if (tzStatus === 'ambiguous' && disambiguation === 'later') {
    const later = possibleOffsets[possibleOffsets.length - 1] ?? dt
    return {
      birth_local_wall_time: localWall,
      timezone,
      birth_utc: later.toUTC().toISO()!,
      utc_offset_minutes: later.offset,
      timezone_status: 'ambiguous',
      timezone_disambiguation: 'later',
      birth_time_uncertainty_seconds: uncertainty,
    }
  }

  return {
    birth_local_wall_time: localWall,
    timezone,
    birth_utc: dt.toUTC().toISO()!,
    utc_offset_minutes: dt.offset,
    timezone_status: tzStatus,
    timezone_disambiguation: tzDisambig,
    birth_time_uncertainty_seconds: birth_time_known ? uncertainty : 86400,
  }
}

export function detectDstStatus(args: {
  requested: { year: number; month: number; day: number; hour: number; minute: number; second: number }
  timezone: string
}): 'standard' | 'daylight' | 'ambiguous' | 'nonexistent' | 'unknown' {
  const candidates = getLocalTimestampCandidates({ ...args.requested, timezone: args.timezone })
  if (candidates.length === 0) return 'nonexistent'
  const distinctOffsets = new Set(candidates.map((candidate) => candidate.offset))
  if (distinctOffsets.size > 1) return 'ambiguous'
  return candidates[0]?.isInDST ? 'daylight' : 'standard'
}

function formatLocalDate(parts: { year: number; month: number; day: number }): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`
}

function formatLocalTime(parts: { hour: number; minute: number; second: number }): string {
  return `${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`
}

export function normalizeBirthTimeForCalculation(input: {
  dateOfBirth: string
  timeOfBirth?: string | null
  timezone?: string | null
  birthTimeKnown?: boolean
}): NormalizedBirthTime {
  const dateParts = parseDateParts(input.dateOfBirth)
  const localDate = dateParts ? formatLocalDate(dateParts) : input.dateOfBirth
  const timezone = typeof input.timezone === 'string' && input.timezone.trim() ? input.timezone.trim() : null

  if (!timezone) {
    return {
      status: 'missing_timezone',
      localDate,
      localTime: typeof input.timeOfBirth === 'string' ? input.timeOfBirth : null,
      timezone: null,
      dstStatus: 'unknown',
      warnings: [],
      error: 'missing_timezone',
    }
  }

  if (!IANAZone.isValidZone(timezone)) {
    return {
      status: 'invalid_timezone',
      localDate,
      localTime: typeof input.timeOfBirth === 'string' ? input.timeOfBirth : null,
      timezone,
      dstStatus: 'unknown',
      warnings: [],
      error: 'invalid_timezone',
    }
  }

  if (input.birthTimeKnown === false) {
    return {
      status: 'missing_birth_time',
      localDate,
      localTime: null,
      timezone,
      dstStatus: 'unknown',
      warnings: ['birth_time_missing'],
      error: 'missing_birth_time',
    }
  }

  const timeOfBirth = typeof input.timeOfBirth === 'string' ? input.timeOfBirth.trim() : ''
  if (!timeOfBirth) {
    return {
      status: 'missing_birth_time',
      localDate,
      localTime: null,
      timezone,
      dstStatus: 'unknown',
      warnings: ['birth_time_missing'],
      error: 'missing_birth_time',
    }
  }

  const timeParts = parseTimeParts(timeOfBirth)
  if (!dateParts || !timeParts) {
    return {
      status: 'nonexistent_local_time',
      localDate,
      localTime: timeOfBirth,
      timezone,
      dstStatus: 'nonexistent',
      warnings: [],
      error: 'nonexistent_local_time',
    }
  }

  const candidates = getLocalTimestampCandidates({ ...dateParts, ...timeParts, timezone })
  if (candidates.length === 0) {
    return {
      status: 'nonexistent_local_time',
      localDate,
      localTime: formatLocalTime(timeParts),
      timezone,
      dstStatus: 'nonexistent',
      warnings: [],
      error: 'nonexistent_local_time',
    }
  }
  if (candidates.length > 1) {
    return {
      status: 'ambiguous_local_time',
      localDate,
      localTime: formatLocalTime(timeParts),
      timezone,
      dstStatus: 'ambiguous',
      warnings: [],
      error: 'ambiguous_local_time',
    }
  }

  const candidate = candidates[0]
  const dstStatus = candidate.isInDST ? 'daylight' : 'standard'
  return {
    status: 'valid',
    localDate,
    localTime: formatLocalTime(timeParts),
    timezone,
    utcDateTime: candidate.toUTC().toISO() ?? undefined,
    offsetMinutes: candidate.offset,
    dstStatus,
    warnings: [],
  }
}
