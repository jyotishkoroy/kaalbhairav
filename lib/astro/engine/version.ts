/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { getSweVersion } from './swiss.ts'

export const ENGINE_VERSION_STUB = 'v2.0.0-stub'
export const ENGINE_VERSION_REAL = 'v2.0.0-real-sweph'
export const EPHEMERIS_VERSION_STUB = 'stub'
export const SCHEMA_VERSION = '2.0.0'
export const ASTRO_ENGINE_VERSION = 'tarayai-astro-engine-v1'
export const ASTRO_EPHEMERIS_VERSION_UNKNOWN = 'unknown'

export const ENGINE_VERSION = ENGINE_VERSION_STUB
export const EPHEMERIS_VERSION = EPHEMERIS_VERSION_STUB

function ensureNonEmptyVersion(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

export function getRuntimeEngineVersion(): string {
  return ensureNonEmptyVersion(
    process.env.ASTRO_ENGINE_MODE === 'real' ? ENGINE_VERSION_REAL : ENGINE_VERSION_STUB,
    ENGINE_VERSION_STUB,
  )
}

export function getRuntimeEphemerisVersion(): string {
  if (process.env.ASTRO_ENGINE_MODE !== 'real') return EPHEMERIS_VERSION_STUB
  try {
    return ensureNonEmptyVersion(`sweph@${getSweVersion()}`, 'sweph-unavailable')
  } catch {
    return 'sweph-unavailable'
  }
}
