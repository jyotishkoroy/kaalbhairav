import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { createRequire } from 'module'

// ─── Swiss Ephemeris numeric constants ────────────────────────────────────
// Hardcoded because sweph npm package does not export them as JS properties.
// Verified against sweph C source (swe.h) and sweph@2.10.3-5.
export const SE_SUN = 0
export const SE_MOON = 1
export const SE_MERCURY = 2
export const SE_VENUS = 3
export const SE_MARS = 4
export const SE_JUPITER = 5
export const SE_SATURN = 6
export const SE_MEAN_NODE = 10
export const SE_TRUE_NODE = 11
export const SE_SIDM_LAHIRI = 1
export const SEFLG_SWIEPH = 2      // bit: use Swiss Ephemeris files (not Moshier)
export const SEFLG_SPEED = 256     // bit: compute speed
export const SEFLG_SIDEREAL = 65536 // bit: sidereal mode (rarely used; we subtract ayanamsa manually)
export const SE_CALC_RISE = 1
export const SE_CALC_SET = 2
export const SE_BIT_DISC_CENTER = 256
export const SE_BIT_NO_REFRACTION = 512
export const SE_GREG_CAL = 1

// ─── Known ephemeris file checksums ───────────────────────────────────────
// SHA-256 of files downloaded from github.com/aloistr/swisseph on 2026-04-26.
// Used to detect file corruption or substitution at startup.
export const KNOWN_EPHE_FILES: Record<string, { size: number; sha256: string; covers: string }> = {
  'sepl_18.se1': {
    size: 484061,
    sha256: 'b8e657c1f5a9c51821ef973baf233a3c07137101e35b95e00ac0e9eeea7fbeb8',
    covers: '1800–2400 CE (planets)',
  },
  'semo_18.se1': {
    size: 1304771,
    sha256: '7034c7825a0fef2f660d99161aa8e60429adfa315d269ac68042ef5a5e6319bf',
    covers: '1800–2400 CE (Moon)',
  },
}

// ─── sweph instance types ─────────────────────────────────────────────────
// Actual API verified against sweph@2.10.3-5 runtime behaviour.

export type SwephCalcResult = {
  flag: number
  error: string
  data: number[] // [longitude, latitude, distance, speedLon, speedLat, speedDist]
}

// houses_ex: hsys must be a string ('P' = Placidus, 'W' = whole-sign, etc.)
// Return shape verified at runtime: { flag, data: { houses: number[], points: number[] } }
export type SwephHousesResult = {
  flag: number
  error: string
  data: {
    houses: number[] // cusps [1..12]
    points: number[] // [ascendant, MC, ARMC, vertex, ...]
  }
}

export type SwephRiseTransResult = {
  flag: number
  error: string
  data: number[] // [jd_ut_of_event]
}

type SwephInstance = {
  set_ephe_path: (p: string) => void
  set_sid_mode: (mode: number, t0: number, ayan_t0: number) => void
  calc_ut: (jd: number, body: number, flags: number) => SwephCalcResult
  houses_ex: (jd: number, flags: number, lat: number, lon: number, hsys: string) => SwephHousesResult
  rise_trans: (jdStart: number, body: number, star: string, flags: number, rsmi: number, geopos: [number, number, number], atpress: number, attemp: number) => SwephRiseTransResult
  get_ayanamsa_ut: (jd: number) => number
  julday: (y: number, m: number, d: number, h: number, gregCal: number) => number
  version: () => string
  get_library_path: () => string
  close: () => void
}

// ─── File integrity result ────────────────────────────────────────────────

export type EpheFileStatus = {
  filename: string
  present: boolean
  size: number | null
  sha256: string | null
  size_match: boolean
  hash_match: boolean
  readable: boolean
  covers: string
}

export type SwissEphStatus = {
  loaded: boolean
  sweph_package_version: string
  swiss_ephemeris_c_version: string
  ephe_path: string
  ephe_files: EpheFileStatus[]
  moshier_fallback: boolean
  moshier_detection_method: 'flag_bit' | 'file_missing' | 'error_string'
  validation_passed: boolean
  errors: string[]
}

// ─── Module state ─────────────────────────────────────────────────────────

let _sweph: SwephInstance | null = null
let _initialized = false
let _status: SwissEphStatus | null = null
const require = createRequire(import.meta.url)

// ─── Resolve ephemeris path ───────────────────────────────────────────────

function resolveEphePath(): string {
  return process.env.SWISS_EPHE_PATH ?? path.join(process.cwd(), 'ephe')
}

// ─── File integrity check ─────────────────────────────────────────────────

function checkEpheFiles(ephePath: string): { files: EpheFileStatus[]; allPresent: boolean } {
  const files: EpheFileStatus[] = []
  let allPresent = true

  for (const [filename, expected] of Object.entries(KNOWN_EPHE_FILES)) {
    const filePath = path.join(ephePath, filename)
    const entry: EpheFileStatus = {
      filename,
      present: false,
      size: null,
      sha256: null,
      size_match: false,
      hash_match: false,
      readable: false,
      covers: expected.covers,
    }

    try {
      const stat = fs.statSync(filePath)
      entry.present = true
      entry.size = stat.size
      entry.size_match = stat.size === expected.size

      const buf = fs.readFileSync(filePath)
      entry.readable = true
      entry.sha256 = crypto.createHash('sha256').update(buf).digest('hex')
      entry.hash_match = entry.sha256 === expected.sha256
    } catch {
      allPresent = false
    }

    if (!entry.present) allPresent = false
    files.push(entry)
  }

  return { files, allPresent }
}

// ─── Initialise ───────────────────────────────────────────────────────────

export function initSwissEphemeris(): SwissEphStatus {
  if (_initialized && _status) return _status
  _initialized = true

  const errors: string[] = []
  const ephePath = resolveEphePath()
  const { files: epheFiles, allPresent: epheFilesPresent } = checkEpheFiles(ephePath)

  let moshierFallback = !epheFilesPresent // presume fallback if files missing
  let moshierDetectionMethod: SwissEphStatus['moshier_detection_method'] = 'file_missing'
  let swePackageVersion = 'unknown'
  let sweCVersion = 'unknown'

  if (!epheFilesPresent) {
    errors.push(`Required Swiss Ephemeris files missing or unreadable at "${ephePath}". Set SWISS_EPHE_PATH env or add ephe/*.se1 files. Files needed: ${Object.keys(KNOWN_EPHE_FILES).join(', ')}`)
  }

  // Corrupted files (present but wrong hash) are treated as missing
  const corruptFiles = epheFiles.filter(f => f.present && !f.hash_match)
  if (corruptFiles.length > 0) {
    errors.push(`Ephemeris file integrity check failed: ${corruptFiles.map(f => `${f.filename} (expected sha256 ${KNOWN_EPHE_FILES[f.filename]?.sha256?.slice(0, 12)}…, got ${f.sha256?.slice(0, 12)}…)`).join(', ')}`)
    moshierFallback = true
  }

  try {
    _sweph = require('sweph') as SwephInstance
    swePackageVersion = 'sweph'
    sweCVersion = _sweph.version()

    _sweph.set_ephe_path(ephePath)
    _sweph.set_sid_mode(SE_SIDM_LAHIRI, 0, 0)

    // Moshier detection via flag bit — more reliable than error-string matching.
    // When SE files are loaded, returned flag has SEFLG_SWIEPH bit (2) set.
    // When Moshier fallback is active, that bit is absent.
    const JD_J2000 = 2451545.0
    const testResult = _sweph.calc_ut(JD_J2000, SE_SUN, SEFLG_SWIEPH | SEFLG_SPEED)
    const usedSwephFiles = (testResult.flag & SEFLG_SWIEPH) !== 0

    if (!usedSwephFiles) {
      moshierFallback = true
      moshierDetectionMethod = 'flag_bit'
      errors.push('Swiss Ephemeris data files not loaded — calc_ut returned without SEFLG_SWIEPH bit. Production requires SE files in ephe/.')
    } else {
      moshierFallback = false
      moshierDetectionMethod = 'flag_bit'
    }
  } catch (e) {
    errors.push(`Failed to load sweph package: ${String(e)}`)
    _sweph = null
  }

  const validationPassed =
    !!_sweph && !moshierFallback && epheFilesPresent && corruptFiles.length === 0

  _status = {
    loaded: !!_sweph,
    sweph_package_version: swePackageVersion,
    swiss_ephemeris_c_version: sweCVersion,
    ephe_path: ephePath,
    ephe_files: epheFiles,
    moshier_fallback: moshierFallback,
    moshier_detection_method: moshierDetectionMethod,
    validation_passed: validationPassed,
    errors,
  }

  return _status
}

// ─── Accessors ────────────────────────────────────────────────────────────

export function getSweph(): SwephInstance {
  if (!_sweph) {
    initSwissEphemeris()
    if (!_sweph) throw new Error(`Swiss Ephemeris not available: ${_status?.errors.join('; ') ?? 'unknown'}`)
  }
  return _sweph
}

export function isSwissEphemerisAvailable(): boolean {
  if (!_initialized) initSwissEphemeris()
  return !!_sweph && !(_status?.moshier_fallback ?? true)
}

export function isMoshierFallback(): boolean {
  if (!_initialized) initSwissEphemeris()
  return _status?.moshier_fallback ?? true
}

export function getSweVersion(): string {
  if (!_initialized) initSwissEphemeris()
  return _status?.swiss_ephemeris_c_version ?? 'unknown'
}

export function getSwephStatus(): SwissEphStatus {
  if (!_initialized) initSwissEphemeris()
  return _status!
}

// ─── Calculation functions ────────────────────────────────────────────────

export function sweJulday(year: number, month: number, day: number, hourDecimalUTC: number): number {
  return getSweph().julday(year, month, day, hourDecimalUTC, SE_GREG_CAL)
}

export function calcPlanet(jd: number, planetId: number): SwephCalcResult {
  const range = getEphemerisRange()
  if (jd < range.supported_start_jd || jd > range.supported_end_jd) {
    throw new Error(`JD ${jd.toFixed(2)} outside supported ephemeris range ${range.supported_start_jd}..${range.supported_end_jd}`)
  }
  return getSweph().calc_ut(jd, planetId, SEFLG_SWIEPH | SEFLG_SPEED)
}

export function getLahiriAyanamsa(jd: number): number {
  const range = getEphemerisRange()
  if (jd < range.supported_start_jd || jd > range.supported_end_jd) {
    throw new Error(`JD ${jd.toFixed(2)} outside supported ephemeris range ${range.supported_start_jd}..${range.supported_end_jd}`)
  }
  return getSweph().get_ayanamsa_ut(jd)
}

// houses_ex with Placidus ('P'). Returns data.points[0] as ascendant.
export function getAscendant(jd: number, lat: number, lon: number): SwephHousesResult {
  const range = getEphemerisRange()
  if (jd < range.supported_start_jd || jd > range.supported_end_jd) {
    throw new Error(`JD ${jd.toFixed(2)} outside supported ephemeris range ${range.supported_start_jd}..${range.supported_end_jd}`)
  }
  return getSweph().houses_ex(jd, 0, lat, lon, 'P')
}

export function getSunriseOrSet(
  jdStart: number, lat: number, lon: number, altitude: number, flag: number,
): SwephRiseTransResult {
  const range = getEphemerisRange()
  if (jdStart < range.supported_start_jd || jdStart > range.supported_end_jd) {
    throw new Error(`JD ${jdStart.toFixed(2)} outside supported ephemeris range ${range.supported_start_jd}..${range.supported_end_jd}`)
  }
  const geopos: [number, number, number] = [lon, lat, altitude]
  return getSweph().rise_trans(jdStart, SE_SUN, '', SEFLG_SWIEPH, flag, geopos, 1013.25, 15)
}

export function getEphemerisRange(): { supported_start_jd: number; supported_end_jd: number } {
  // sepl_18.se1 + semo_18.se1 cover 1800–2400 CE.
  // JD 1800-01-01 ≈ 2378497.5, JD 2400-01-01 ≈ 2597641.5
  return { supported_start_jd: 2378497, supported_end_jd: 2597641 }
}
