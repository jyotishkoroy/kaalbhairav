export const ENGINE_VERSION_STUB = 'v1.0.0-stub'
export const ENGINE_VERSION_REAL = 'v1.0.0-real'
export const EPHEMERIS_VERSION_STUB = 'stub'
export const EPHEMERIS_VERSION_REAL = 'moshier@2.2.0'
export const SCHEMA_VERSION = '1.0.0'

// Static stub exports — kept so pre-existing imports and tests compile unchanged
export const ENGINE_VERSION = ENGINE_VERSION_STUB
export const EPHEMERIS_VERSION = EPHEMERIS_VERSION_STUB

// Runtime-aware getters — use these wherever the value must match the live mode
export function getRuntimeEngineVersion(): string {
  return process.env.ASTRO_ENGINE_MODE === 'real' ? ENGINE_VERSION_REAL : ENGINE_VERSION_STUB
}
export function getRuntimeEphemerisVersion(): string {
  return process.env.ASTRO_ENGINE_MODE === 'real' ? EPHEMERIS_VERSION_REAL : EPHEMERIS_VERSION_STUB
}
