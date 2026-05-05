/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { normalizeLongitudeDeg } from './coordinates'

export type SiderealTimeResult = {
  hours: number
  formatted: string
}

function normalizeHours24(value: number): number {
  const normalized = value % 24
  return normalized < 0 ? normalized + 24 : normalized
}

function formatHoursAsHms(hours: number): string {
  const normalized = normalizeHours24(hours)
  const totalSeconds = Math.round(normalized * 3600) % 86400
  const hh = Math.floor(totalSeconds / 3600)
  const mm = Math.floor((totalSeconds % 3600) / 60)
  const ss = totalSeconds % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export function calculateGmstHours(jdUtExact: number): number {
  if (!Number.isFinite(jdUtExact)) {
    throw new Error('jdUtExact must be a finite number.')
  }

  const t = (jdUtExact - 2451545.0) / 36525
  const gmstDegrees =
    280.46061837 +
    360.98564736629 * (jdUtExact - 2451545.0) +
    0.000387933 * t * t -
    (t * t * t) / 38710000

  return normalizeHours24(gmstDegrees / 15)
}

export function calculateLocalSiderealTimeHours(
  jdUtExact: number,
  longitudeDeg: number,
): SiderealTimeResult {
  if (!Number.isFinite(jdUtExact)) {
    throw new Error('jdUtExact must be a finite number.')
  }

  const normalizedLongitude = normalizeLongitudeDeg(longitudeDeg)
  const hours = normalizeHours24(calculateGmstHours(jdUtExact) + normalizedLongitude / 15)
  return {
    hours,
    formatted: formatHoursAsHms(hours),
  }
}
