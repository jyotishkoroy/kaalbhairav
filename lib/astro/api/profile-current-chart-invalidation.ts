/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

const CALCULATION_AFFECTING_PROFILE_FIELDS = [
  'birthDate',
  'birthTime',
  'birthPlace',
  'placeName',
  'timezone',
  'timezoneHours',
  'latitude',
  'latitude_deg',
  'latitudeDeg',
  'longitude',
  'longitude_deg',
  'longitudeDeg',
  'ayanamsha',
  'ayanamsha_main',
  'house_system',
  'houseSystem',
] as const

function normalizeComparableProfileValue(value: unknown): string | number | null {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? Number(value.toFixed(8)) : null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    const numeric = Number(trimmed)
    if (trimmed !== '' && Number.isFinite(numeric) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(numeric.toFixed(8))
    }
    return trimmed
  }

  return String(value)
}

export function didCalculationAffectingProfileFieldsChange(args: {
  existingProfile: Record<string, unknown> | null
  nextProfilePatch: Record<string, unknown>
}): boolean {
  const existingProfile = args.existingProfile
  if (!existingProfile) {
    return false
  }

  return CALCULATION_AFFECTING_PROFILE_FIELDS.some((field) => {
    if (!(field in args.nextProfilePatch)) {
      return false
    }

    return normalizeComparableProfileValue(existingProfile[field])
      !== normalizeComparableProfileValue(args.nextProfilePatch[field])
  })
}
