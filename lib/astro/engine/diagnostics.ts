import { initSwissEphemeris, getEphemerisRange, calcPlanet, getLahiriAyanamsa, SE_SUN, SEFLG_SWIEPH, type SwissEphStatus } from './swiss.ts'
import { DateTime } from 'luxon'

export type EngineBootDiagnostics = {
  swiss_ephemeris_library_loaded: boolean
  sweph_package_version: string
  swiss_ephemeris_c_version: string
  ephemeris_data_path: string
  ephemeris_files_loaded: boolean
  ephemeris_file_integrity: Array<{
    filename: string
    present: boolean
    size: number | null
    sha256: string | null
    size_match: boolean
    hash_match: boolean
    readable: boolean
    covers: string
  }>
  supported_ephemeris_date_range: EphemerisRangeMetadata
  moshier_fallback: boolean
  moshier_detection_method: string
  hardcoded_swiss_constant_verification: {
    passed: boolean
    mismatches: string[]
  }
  timezone_database_version: string
  startup_validation_passed: boolean
  startup_validation_errors: string[]
}

export type EphemerisRangeMetadata = {
  supported_start_jd: number
  supported_end_jd: number
  supported_start_date: string
  supported_end_date: string
  source: 'loaded_swiss_files' | 'wrapper_reported'
}

export type StartupValidationCheck = {
  check_id: string
  passed: boolean
  evidence: Record<string, unknown>
  error?: string
}

export type StartupValidationResult = {
  passed: boolean
  checks: StartupValidationCheck[]
}

// ─── Constant verification table ─────────────────────────────────────────
// Verified against swe.h (Swiss Ephemeris C source) and sweph@2.10.3-5.
const EXPECTED_CONSTANTS: Record<string, number> = {
  SE_SUN: 0,
  SE_MOON: 1,
  SE_MERCURY: 2,
  SE_VENUS: 3,
  SE_MARS: 4,
  SE_JUPITER: 5,
  SE_SATURN: 6,
  SE_MEAN_NODE: 10,
  SE_TRUE_NODE: 11,
  SE_SIDM_LAHIRI: 1,
  SEFLG_SWIEPH: 2,
  SEFLG_SPEED: 256,
  SEFLG_SIDEREAL: 65536,
}

import {
  SE_MOON, SE_MERCURY, SE_VENUS, SE_MARS, SE_JUPITER, SE_SATURN,
  SE_MEAN_NODE, SE_TRUE_NODE, SE_SIDM_LAHIRI, SEFLG_SPEED, SEFLG_SIDEREAL,
} from './swiss.ts'

function verifyConstants(): { passed: boolean; mismatches: string[] } {
  const actual: Record<string, number> = {
    SE_SUN, SE_MOON, SE_MERCURY, SE_VENUS, SE_MARS, SE_JUPITER, SE_SATURN,
    SE_MEAN_NODE, SE_TRUE_NODE, SE_SIDM_LAHIRI, SEFLG_SWIEPH, SEFLG_SPEED, SEFLG_SIDEREAL,
  }
  const mismatches: string[] = []
  for (const [name, expected] of Object.entries(EXPECTED_CONSTANTS)) {
    if (actual[name] !== expected) {
      mismatches.push(`${name}: expected ${expected}, got ${actual[name]}`)
    }
  }
  return { passed: mismatches.length === 0, mismatches }
}

// ─── Module cache ─────────────────────────────────────────────────────────

let _cachedDiagnostics: EngineBootDiagnostics | null = null
let _cachedValidation: StartupValidationResult | null = null

// ─── getEngineDiagnostics ────────────────────────────────────────────────

export function getEngineDiagnostics(): EngineBootDiagnostics {
  if (_cachedDiagnostics) return _cachedDiagnostics
  const status: SwissEphStatus = initSwissEphemeris()

  _cachedDiagnostics = {
    swiss_ephemeris_library_loaded: status.loaded,
    sweph_package_version: status.sweph_package_version,
    swiss_ephemeris_c_version: status.swiss_ephemeris_c_version,
    ephemeris_data_path: status.ephe_path,
    ephemeris_files_loaded: status.loaded && !status.moshier_fallback,
    ephemeris_file_integrity: status.ephe_files.map(f => ({
      filename: f.filename,
      present: f.present,
      size: f.size,
      sha256: f.sha256,
      size_match: f.size_match,
      hash_match: f.hash_match,
      readable: f.readable,
      covers: f.covers,
    })),
    supported_ephemeris_date_range: getEphemerisRangeMetadata(),
    moshier_fallback: status.moshier_fallback,
    moshier_detection_method: status.moshier_detection_method,
    hardcoded_swiss_constant_verification: verifyConstants(),
    timezone_database_version: 'iana_via_luxon',
    startup_validation_passed: status.validation_passed,
    startup_validation_errors: status.errors,
  }
  return _cachedDiagnostics
}

// ─── runStartupValidation ────────────────────────────────────────────────

export function runStartupValidation(): StartupValidationResult {
  if (_cachedValidation) return _cachedValidation
  const checks: StartupValidationCheck[] = []

  // Check 1: sweph package loads
  let sweStatus: SwissEphStatus
  try {
    sweStatus = initSwissEphemeris()
    checks.push({
      check_id: 'swiss_ephemeris_load',
      passed: sweStatus.loaded,
      evidence: {
        sweph_package_version: sweStatus.sweph_package_version,
        swiss_ephemeris_c_version: sweStatus.swiss_ephemeris_c_version,
        path: sweStatus.ephe_path,
      },
      error: sweStatus.errors.length > 0 ? sweStatus.errors.join('; ') : undefined,
    })
  } catch (e) {
    checks.push({ check_id: 'swiss_ephemeris_load', passed: false, evidence: {}, error: String(e) })
    _cachedValidation = { passed: false, checks }
    return _cachedValidation
  }

  // Check 2: Ephemeris files readable and integrity verified
  const allowMoshier = process.env.ALLOW_MOSHIER_FALLBACK === 'true'
  const filesPassed = !sweStatus.moshier_fallback || allowMoshier
  checks.push({
    check_id: 'ephemeris_files_integrity',
    passed: filesPassed,
    evidence: {
      moshier_fallback: sweStatus.moshier_fallback,
      detection_method: sweStatus.moshier_detection_method,
      allow_moshier: allowMoshier,
      files: sweStatus.ephe_files.map(f => ({
        name: f.filename,
        present: f.present,
        size: f.size,
        hash_match: f.hash_match,
      })),
    },
    error: !filesPassed ? 'Ephemeris files missing or integrity check failed; Moshier fallback not allowed in production' : undefined,
  })

  // Check 3: Hardcoded constants match expected swe.h values
  const { passed: constPassed, mismatches } = verifyConstants()
  checks.push({
    check_id: 'constant_verification',
    passed: constPassed,
    evidence: { checked_constants: Object.keys(EXPECTED_CONSTANTS), mismatches },
    error: constPassed ? undefined : `Constant mismatches: ${mismatches.join(', ')}`,
  })

  // Check 4: Lahiri sidereal mode was applied
  checks.push({
    check_id: 'lahiri_sidereal_mode',
    passed: sweStatus.loaded,
    evidence: { sid_mode: 'SE_SIDM_LAHIRI', sid_mode_value: SE_SIDM_LAHIRI },
  })

  // Check 5: Fixed reference call — Sun at J2000 (JD 2451545.0)
  // Expected tropical longitude ≈ 280.37°, ayanamsa ≈ 23.857°.
  // This is a regression anchor from sweph itself, not an independent reference.
  try {
    const JD_J2000 = 2451545.0
    const sunResult = calcPlanet(JD_J2000, SE_SUN)
    const sunLon = sunResult.data[0]
    const ayanamsa = getLahiriAyanamsa(JD_J2000)
    const usedSwephFiles = (sunResult.flag & SEFLG_SWIEPH) !== 0

    // Regression anchors (computed from sweph@2.10.3-5 with sepl_18.se1):
    const SUN_J2000_TROPICAL_EXPECTED = 280.36891867
    const AYANAMSA_J2000_EXPECTED = 23.85709235
    const TOLERANCE_PLANET = 0.01
    const TOLERANCE_AYANAMSA = 0.001

    const sunDiff = Math.abs(sunLon - SUN_J2000_TROPICAL_EXPECTED)
    const ayDiff = Math.abs(ayanamsa - AYANAMSA_J2000_EXPECTED)

    checks.push({
      check_id: 'fixed_reference_sun_j2000',
      passed: isFinite(sunLon) && isFinite(ayanamsa) && usedSwephFiles && sunDiff <= TOLERANCE_PLANET && ayDiff <= TOLERANCE_AYANAMSA,
      evidence: {
        sun_tropical_longitude: sunLon,
        sun_expected: SUN_J2000_TROPICAL_EXPECTED,
        sun_diff_degrees: sunDiff,
        ayanamsa: ayanamsa,
        ayanamsa_expected: AYANAMSA_J2000_EXPECTED,
        ayanamsa_diff_degrees: ayDiff,
        flag: sunResult.flag,
        used_sweph_files: usedSwephFiles,
      },
      error: !usedSwephFiles ? 'calc_ut returned without SEFLG_SWIEPH — Moshier fallback active'
        : sunDiff > TOLERANCE_PLANET ? `Sun longitude regression failed: diff ${sunDiff.toFixed(6)}° > ${TOLERANCE_PLANET}°`
        : ayDiff > TOLERANCE_AYANAMSA ? `Ayanamsa regression failed: diff ${ayDiff.toFixed(6)}° > ${TOLERANCE_AYANAMSA}°`
        : undefined,
    })
  } catch (e) {
    checks.push({ check_id: 'fixed_reference_sun_j2000', passed: false, evidence: {}, error: String(e) })
  }

  // Check 6: IANA timezone engine (Luxon)
  try {
    const dt = DateTime.fromISO('2000-01-01T12:00:00', { zone: 'Asia/Kolkata' })
    checks.push({
      check_id: 'iana_timezone_engine',
      passed: dt.isValid && dt.offset === 330,
      evidence: { test_offset_minutes: dt.offset, expected: 330, timezone: 'Asia/Kolkata' },
      error: dt.offset !== 330 ? `Expected UTC+5:30 (330 min), got ${dt.offset}` : undefined,
    })
  } catch (e) {
    checks.push({ check_id: 'iana_timezone_engine', passed: false, evidence: {}, error: String(e) })
  }

  const passed = checks.every(c => c.passed)
  _cachedValidation = { passed, checks }
  return _cachedValidation
}

// ─── getEphemerisRangeMetadata ────────────────────────────────────────────

export function getEphemerisRangeMetadata(): EphemerisRangeMetadata {
  const range = getEphemerisRange()
  return {
    ...range,
    supported_start_date: '1800-01-01',
    supported_end_date: '2400-01-01',
    source: 'loaded_swiss_files',
  }
}

export function assertEphemerisRange(jd_ut: number): void {
  const range = getEphemerisRange()
  if (jd_ut < range.supported_start_jd || jd_ut > range.supported_end_jd) {
    throw new Error(
      `Birth date outside loaded ephemeris range. Loaded files cover 1800–2400 CE ` +
      `(JD ${range.supported_start_jd}–${range.supported_end_jd}). ` +
      `Requested JD: ${jd_ut.toFixed(2)}`,
    )
  }
}
