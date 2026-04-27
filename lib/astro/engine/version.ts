import { getSweVersion } from './swiss.ts'

export const ENGINE_VERSION_STUB = 'v2.0.0-stub'
export const ENGINE_VERSION_REAL = 'v2.0.0-real-sweph'
export const EPHEMERIS_VERSION_STUB = 'stub'
export const SCHEMA_VERSION = '2.0.0'

export const ENGINE_VERSION = ENGINE_VERSION_STUB
export const EPHEMERIS_VERSION = EPHEMERIS_VERSION_STUB

export function getRuntimeEngineVersion(): string {
  return process.env.ASTRO_ENGINE_MODE === 'real' ? ENGINE_VERSION_REAL : ENGINE_VERSION_STUB
}

export function getRuntimeEphemerisVersion(): string {
  if (process.env.ASTRO_ENGINE_MODE !== 'real') return EPHEMERIS_VERSION_STUB
  try {
    return `sweph@${getSweVersion()}`
  } catch {
    return 'sweph-unavailable'
  }
}
