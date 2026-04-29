/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { DateTime } from 'luxon'

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

const PRECISION_UNCERTAINTY: Record<string, number> = {
  exact: 0, minute: 60, hour: 3600, day_part: 21600, unknown: 86400,
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
  // Normalize time to HH:MM:SS
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
        timezone_status: 'nonexistent' as const,
        timezone_disambiguation: 'rejected' as const,
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
