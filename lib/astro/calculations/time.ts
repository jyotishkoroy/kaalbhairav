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

  // Validate timezone exists in Luxon/IANA
  const tzCheck = DateTime.now().setZone(timezone)
  if (tzCheck.zoneName === null || tzCheck.zoneName === 'UTC' && timezone !== 'UTC') {
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

  // Parse in the given timezone with Luxon — detects nonexistent and ambiguous times
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

  // Luxon doesn't natively expose DST ambiguity/nonexistence the same way Temporal does.
  // We detect it by checking if keepLocalTime gives a different result than the parsed offset.
  // Check for nonexistent time: if the local time "doesn't exist" due to spring-forward,
  // Luxon will still parse it but jump forward. We detect this by comparing the round-trip.
  const roundTrip = dt.toISO()!
  const reparsed = DateTime.fromISO(roundTrip, { zone: timezone })
  const localFromReparsed = reparsed.toFormat('yyyy-MM-dd\'T\'HH:mm:ss')

  let tzStatus: BirthTimeResult['timezone_status'] = 'valid'
  let tzDisambig: TimezoneDisambiguation = 'not_needed'
  let isNonexistent = false

  // If the local time doesn't round-trip to itself, it was nonexistent (spring-forward)
  if (localFromReparsed !== localWall) {
    // Default policy: reject nonexistent local times
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
    isNonexistent = true
    tzStatus = 'ambiguous'
    tzDisambig = disambiguation
  }

  // Check for ambiguous time (fall-back): try to detect by attempting both offsets
  // Luxon always picks earlier offset for ambiguous times; if we asked for 'later', adjust
  const offsetMinutes = dt.offset
  const birthUtcStr = dt.toUTC().toISO()!

  if (disambiguation === 'later' && !isNonexistent) {
    // For ambiguous fall-back with 'later', add 60 min to find the later occurrence
    // This is a best-effort approach since Luxon doesn't expose ambiguity natively
    const laterDt = dt.plus({ hours: 1 })
    const laterUtc = laterDt.toUTC().toISO()!
    const laterLocalCheck = DateTime.fromISO(laterUtc, { zone: timezone }).toFormat('yyyy-MM-dd\'T\'HH:mm:ss')
    if (laterLocalCheck === localWall) {
      return {
        birth_local_wall_time: localWall,
        timezone,
        birth_utc: laterUtc,
        utc_offset_minutes: laterDt.offset,
        timezone_status: 'ambiguous',
        timezone_disambiguation: 'later',
        birth_time_uncertainty_seconds: uncertainty,
      }
    }
  }

  return {
    birth_local_wall_time: localWall,
    timezone,
    birth_utc: birthUtcStr,
    utc_offset_minutes: offsetMinutes,
    timezone_status: tzStatus,
    timezone_disambiguation: tzDisambig,
    birth_time_uncertainty_seconds: birth_time_known ? uncertainty : 86400,
  }
}
