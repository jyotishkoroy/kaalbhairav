/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { DateTime, IANAZone } from 'luxon'

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

function pad2(value: number): string {
  return String(value).padStart(2, '0')
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
