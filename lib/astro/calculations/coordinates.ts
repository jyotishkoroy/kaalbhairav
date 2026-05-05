/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

export type CoordinateKind = 'latitude' | 'longitude'

function coerceFiniteNumber(value: unknown, label: string): number {
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return value
    throw new Error(`${label} must be a finite number.`)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      throw new Error(`${label} must not be empty.`)
    }

    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) return parsed
  }

  throw new Error(`${label} must be a finite number.`)
}

function assertRange(value: number, min: number, max: number, label: string): number {
  if (value < min || value > max) {
    throw new Error(`${label} must be between ${min} and ${max} degrees.`)
  }

  return value
}

export function normalizeLatitudeDeg(value: unknown): number {
  const latitude = coerceFiniteNumber(value, 'Latitude')
  return assertRange(latitude, -90, 90, 'Latitude')
}

export function normalizeLongitudeDeg(value: unknown): number {
  const longitude = coerceFiniteNumber(value, 'Longitude')
  return assertRange(longitude, -180, 180, 'Longitude')
}

function parseDmsParts(input: string): { degrees: number; minutes: number; seconds: number; direction: string } {
  const normalized = input.trim().replace(/[°º]/g, ':').replace(/[’']/g, ':').replace(/[″"]/g, ':')
  const compact = normalized.replace(/\s+/g, ' ').replace(/:/g, ' : ').replace(/\s+/g, ' ').trim()
  const match = /^([+-]?\d+(?:\.\d+)?)\s*(?::\s*([+-]?\d+(?:\.\d+)?)\s*)?(?::\s*([+-]?\d+(?:\.\d+)?)\s*)?([NSEW])$/i.exec(compact)
  if (!match) {
    const spaced = /^([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)?(?:\s+([+-]?\d+(?:\.\d+)?)?)?\s+([NSEW])$/i.exec(normalized)
    if (!spaced) throw new Error('Coordinate must be a valid DMS string.')
    return {
      degrees: Number(spaced[1]),
      minutes: Number(spaced[2] ?? '0'),
      seconds: Number(spaced[3] ?? '0'),
      direction: spaced[4].toUpperCase(),
    }
  }

  return {
    degrees: Number(match[1]),
    minutes: Number(match[2] ?? '0'),
    seconds: Number(match[3] ?? '0'),
    direction: match[4].toUpperCase(),
  }
}

function assertDirection(kind: CoordinateKind, direction: string): void {
  if (kind === 'latitude' && !['N', 'S'].includes(direction)) {
    throw new Error('Latitude coordinates must use N or S direction letters.')
  }
  if (kind === 'longitude' && !['E', 'W'].includes(direction)) {
    throw new Error('Longitude coordinates must use E or W direction letters.')
  }
}

export function parseDmsCoordinate(input: string, kind: CoordinateKind): number {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('Coordinate must be a non-empty string.')
  }

  const { degrees, minutes, seconds, direction } = parseDmsParts(input)
  assertDirection(kind, direction)

  if (!Number.isFinite(degrees) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    throw new Error('Coordinate must contain finite DMS values.')
  }
  if (minutes < 0 || minutes >= 60) {
    throw new Error('Coordinate minutes must be between 0 and 60.')
  }
  if (seconds < 0 || seconds >= 60) {
    throw new Error('Coordinate seconds must be between 0 and 60.')
  }

  const signFromDirection = direction === 'S' || direction === 'W' ? -1 : 1
  if (degrees < 0 && signFromDirection > 0) {
    throw new Error('Positive directions must not be supplied with negative degrees.')
  }

  const absoluteDegrees = Math.abs(degrees) + minutes / 60 + seconds / 3600
  const decimalDegrees = absoluteDegrees * signFromDirection

  return kind === 'latitude'
    ? normalizeLatitudeDeg(decimalDegrees)
    : normalizeLongitudeDeg(decimalDegrees)
}
