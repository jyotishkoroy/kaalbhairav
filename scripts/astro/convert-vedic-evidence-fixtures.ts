/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import fs from 'node:fs'
import path from 'node:path'

type CsvRow = Record<string, string | null>
type FixtureCase = Record<string, unknown>

const MAX_CASES_PER_FILE = 100
const GENERATED_AT = '1970-01-01T00:00:00.000Z'
const SOURCE_VERSION = 'phase18_sanitized_v1'

const repoRoot = process.cwd()
const defaultInputDir = '/tmp/vedic-evidence/evidence_csv'
const defaultOutputDir = path.join(repoRoot, 'tests/astro/fixtures/vedic-calculation-evidence')

const fixtureSpecs = [
  {
    sourceFiles: ['inventory.csv', 'core_time_validation.csv'],
    outputFile: 'time_pipeline_cases.json',
    mapRow: (row: CsvRow, caseId: string): FixtureCase => ({
      caseId,
      dateLocal: safeStringOrNull(pick(row, ['date_local', 'dateLocal', 'birth_date', 'date'])),
      timeLocal: safeStringOrNull(pick(row, ['time_local', 'timeLocal', 'birth_time', 'time'])),
      timezoneHours: toNumberOrNull(pick(row, ['timezone_hours', 'timezoneHours', 'timezone', 'tz_offset'])),
      latitudeDeg: toNumberOrNull(pick(row, ['latitude_deg', 'latitudeDeg', 'latitude', 'lat'])),
      longitudeDeg: toNumberOrNull(pick(row, ['longitude_deg', 'longitudeDeg', 'longitude', 'lon', 'lng'])),
      expectedUtcIso: safeStringOrNull(pick(row, ['expected_utc_iso', 'utc_iso', 'utc', 'utc_datetime'])),
      expectedLocalTimeCorrectionSeconds: toNumberOrNull(
        pick(row, ['ltc_seconds', 'local_time_correction_seconds', 'expected_ltc_seconds']),
      ),
      expectedLocalMeanTime: safeStringOrNull(pick(row, ['local_mean_time', 'lmt', 'expected_lmt'])),
      expectedPrintedJulianDay: toNumberOrNull(
        pick(row, ['printed_julian_day', 'julian_day', 'expected_printed_julian_day']),
      ),
      expectedSiderealTimeDisplay: safeStringOrNull(
        pick(row, ['sidereal_time', 'sidereal_time_display', 'expected_sidereal_time']),
      ),
      expectedAyanamshaDisplay: safeStringOrNull(pick(row, ['ayanamsha', 'ayanamsha_display', 'expected_ayanamsha'])),
      expectedObliquityDisplay: safeStringOrNull(pick(row, ['obliquity', 'obliquity_display', 'expected_obliquity'])),
    }),
    requiredKeys: [
      'caseId',
      'dateLocal',
      'timeLocal',
      'timezoneHours',
      'latitudeDeg',
      'longitudeDeg',
      'expectedUtcIso',
      'expectedLocalTimeCorrectionSeconds',
      'expectedLocalMeanTime',
      'expectedPrintedJulianDay',
      'expectedSiderealTimeDisplay',
      'expectedAyanamshaDisplay',
      'expectedObliquityDisplay',
    ],
  },
  {
    sourceFiles: ['planetary_positions.csv'],
    outputFile: 'planetary_positions_cases.json',
    mapRow: (row: CsvRow, caseId: string): FixtureCase => ({
      caseId,
      body: normalizeBody(pick(row, ['body', 'planet', 'graha'])),
      signNumber: normalizeSignNumber(pick(row, ['sign_number', 'rashi_number', 'signNo'])),
      signName: safeStringOrNull(pick(row, ['sign_name', 'rashi', 'sign'])),
      degreeInSignDms: safeStringOrNull(pick(row, ['degree_in_sign_dms', 'degree_dms', 'longitude_dms'])),
      absoluteSiderealLongitudeDeg: toNumberOrNull(
        pick(row, ['absolute_sidereal_longitude_deg', 'sidereal_longitude_deg', 'longitude_deg']),
      ),
      nakshatra: safeStringOrNull(pick(row, ['nakshatra'])),
      pada: toNumberOrNull(pick(row, ['pada'])),
      retrograde: toBooleanOrNull(pick(row, ['retrograde', 'is_retrograde'])),
    }),
    requiredKeys: ['caseId', 'body', 'signNumber', 'signName', 'degreeInSignDms', 'absoluteSiderealLongitudeDeg', 'nakshatra', 'pada', 'retrograde'],
  },
  {
    sourceFiles: ['panchanga_validation.csv'],
    outputFile: 'panchanga_cases.json',
    mapRow: (row: CsvRow, caseId: string): FixtureCase => ({
      caseId,
      tithi: safeStringOrNull(pick(row, ['tithi'])),
      paksha: safeStringOrNull(pick(row, ['paksha'])),
      yoga: safeStringOrNull(pick(row, ['yoga'])),
      karana: safeStringOrNull(pick(row, ['karana'])),
      weekday: safeStringOrNull(pick(row, ['weekday'])),
      hinduWeekday: safeStringOrNull(pick(row, ['hindu_weekday'])),
    }),
    requiredKeys: ['caseId', 'tithi', 'paksha', 'yoga', 'karana', 'weekday', 'hinduWeekday'],
  },
  {
    sourceFiles: ['varga_validation.csv', 'varga_bhav_validation.csv'],
    outputFile: 'varga_cases.json',
    mapRow: (row: CsvRow, caseId: string): FixtureCase => ({
      caseId,
      body: normalizeBody(pick(row, ['body', 'planet', 'graha'])),
      varga: safeStringOrNull(pick(row, ['varga', 'chart', 'division'])),
      expectedSignNumber: normalizeSignNumber(pick(row, ['expected_sign_number', 'sign_number', 'rashi_number'])),
    }),
    requiredKeys: ['caseId', 'body', 'varga', 'expectedSignNumber'],
  },
  {
    sourceFiles: ['kp_lord_validation.csv'],
    outputFile: 'kp_cases.json',
    mapRow: (row: CsvRow, caseId: string): FixtureCase => ({
      caseId,
      kind: safeStringOrNull(pick(row, ['kind'])),
      id: safeStringOrNull(pick(row, ['id'])),
      longitudeDeg: toNumberOrNull(pick(row, ['longitude_deg', 'longitudeDeg'])),
      rashiLord: safeStringOrNull(pick(row, ['rashi_lord', 'rashiLord'])),
      nakshatraLord: safeStringOrNull(pick(row, ['nakshatra_lord', 'nakshatraLord'])),
      subLord: safeStringOrNull(pick(row, ['sub_lord', 'subLord'])),
      subSubLord: safeStringOrNull(pick(row, ['sub_sub_lord', 'subSubLord'])),
    }),
    requiredKeys: ['caseId', 'kind', 'id', 'longitudeDeg', 'rashiLord', 'nakshatraLord', 'subLord', 'subSubLord'],
  },
  {
    sourceFiles: ['manglik_validation.csv', 'kalsarpa_validation.csv'],
    outputFile: 'dosha_cases.json',
    mapRow: (row: CsvRow, caseId: string): FixtureCase => ({
      caseId,
      manglik: toBooleanOrNull(pick(row, ['manglik'])),
      manglikFromLagna: toBooleanOrNull(pick(row, ['manglik_from_lagna', 'manglikFromLagna'])),
      manglikFromMoon: toBooleanOrNull(pick(row, ['manglik_from_moon', 'manglikFromMoon'])),
      kalsarpa: toBooleanOrNull(pick(row, ['kalsarpa'])),
      kalsarpaType: safeStringOrNull(pick(row, ['kalsarpa_type', 'kalsarpaType'])),
    }),
    requiredKeys: ['caseId', 'manglik', 'manglikFromLagna', 'manglikFromMoon', 'kalsarpa', 'kalsarpaType'],
  },
  {
    sourceFiles: ['ashtakavarga_total_validation.csv'],
    outputFile: 'ashtakavarga_total_cases.json',
    mapRow: (row: CsvRow, caseId: string): FixtureCase => ({
      caseId,
      signNumber: normalizeSignNumber(pick(row, ['sign_number', 'rashi_number'])),
      sun: toNumberOrNull(pick(row, ['sun'])),
      moon: toNumberOrNull(pick(row, ['moon'])),
      mars: toNumberOrNull(pick(row, ['mars'])),
      mercury: toNumberOrNull(pick(row, ['mercury'])),
      jupiter: toNumberOrNull(pick(row, ['jupiter'])),
      venus: toNumberOrNull(pick(row, ['venus'])),
      saturn: toNumberOrNull(pick(row, ['saturn'])),
      expectedTotal: toNumberOrNull(pick(row, ['expected_total', 'total'])),
    }),
    requiredKeys: ['caseId', 'signNumber', 'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'expectedTotal'],
  },
] as const

function main() {
  const { inputDir, outputDir } = parseArgs(process.argv.slice(2))
  assertOutputWithinRepo(outputDir)
  fs.mkdirSync(outputDir, { recursive: true })

  const rowsRead: string[] = []
  const casesWritten: string[] = []

  for (const spec of fixtureSpecs) {
    const rows = loadRowsForSpec(inputDir, spec.sourceFiles, spec.outputFile)
    rowsRead.push(`${spec.outputFile}: ${rows.length}`)
    const cases = rows.slice(0, MAX_CASES_PER_FILE).map((row, index) => sanitizeCase(spec.mapRow(row, `case_${String(index + 1).padStart(3, '0')}`), spec.requiredKeys))
    const payload = {
      sourceEvidenceVersion: SOURCE_VERSION,
      generatedAt: GENERATED_AT,
      cases,
    }
    const outputPath = path.join(outputDir, spec.outputFile)
    fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
    casesWritten.push(`${spec.outputFile}: ${cases.length}`)
  }

  console.log(`input directory: ${inputDir}`)
  console.log(`output directory: ${outputDir}`)
  for (const line of rowsRead) console.log(`rows read: ${line}`)
  for (const line of casesWritten) console.log(`cases written: ${line}`)
}

function parseArgs(argv: string[]) {
  let inputDir = defaultInputDir
  let outputDir = defaultOutputDir
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--input') {
      inputDir = argv[i + 1] ?? inputDir
      i += 1
    } else if (arg === '--output') {
      outputDir = argv[i + 1] ?? outputDir
      i += 1
    }
  }
  return { inputDir, outputDir }
}

function assertOutputWithinRepo(outputDir: string) {
  const resolved = path.resolve(outputDir)
  const relative = path.relative(repoRoot, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside repo root: ${resolved}`)
  }
}

function loadRowsForSpec(inputDir: string, sourceFiles: readonly string[], outputFile: string) {
  for (const sourceFile of sourceFiles) {
    const candidate = path.join(inputDir, sourceFile)
    if (fs.existsSync(candidate)) {
      return parseCsv(fs.readFileSync(candidate, 'utf8'))
    }
  }
  console.warn(`Missing source CSV for ${outputFile}: ${sourceFiles.join(', ')}`)
  return []
}

function parseCsv(text: string): CsvRow[] {
  const normalized = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let current: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i]
    const next = normalized[i + 1]
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
      continue
    }
    if (char === ',') {
      current.push(cell)
      cell = ''
      continue
    }
    if (char === '\n') {
      current.push(cell)
      rows.push(current)
      current = []
      cell = ''
      continue
    }
    if (char !== '\r') {
      cell += char
    }
  }
  if (cell.length > 0 || current.length > 0) {
    current.push(cell)
    rows.push(current)
  }

  if (rows.length === 0) return []
  const headers = rows[0].map((header) => header.trim())
  return rows.slice(1).filter((row) => row.some((value) => value.trim() !== '')).map((row) => {
    const record: CsvRow = {}
    headers.forEach((header, index) => {
      record[header] = sanitizeCsvValue(row[index] ?? null)
    })
    return record
  })
}

function sanitizeCsvValue(value: string | null | undefined) {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function pick(row: CsvRow, possibleNames: readonly string[]) {
  for (const name of possibleNames) {
    const value = row[name]
    if (value != null) return value
  }
  return null
}

function safeStringOrNull(value: string | null) {
  if (value == null) return null
  if (/\.pdf|\/Users\/|https?:\/\/|www\.|file:\/\//i.test(value)) return null
  if (/jyotishko|jyotiskaroy|@gmail\.com|@supershakti\.in|myVedicReport|astro_package/i.test(value)) return null
  return value
}

function toNumberOrNull(value: string | null) {
  if (value == null) return null
  const normalized = value.replace(/,/g, '')
  const num = Number(normalized)
  return Number.isFinite(num) ? num : null
}

function toBooleanOrNull(value: string | null) {
  if (value == null) return null
  const normalized = value.toLowerCase()
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true
  if (['false', '0', 'no', 'n'].includes(normalized)) return false
  return null
}

function normalizeSignNumber(value: string | null) {
  const num = toNumberOrNull(value)
  if (num == null) return null
  return Math.trunc(num)
}

function normalizeBody(value: string | null) {
  return safeStringOrNull(value)
}

function hasAnyMeaningfulValue(object: Record<string, unknown>) {
  return Object.values(object).some((value) => value !== null && value !== undefined && value !== '')
}

function sanitizeCase(caseObject: FixtureCase, requiredKeys: readonly string[]) {
  const sanitized: FixtureCase = {}
  for (const key of requiredKeys) {
    const value = caseObject[key]
    sanitized[key] = value === undefined ? null : value
  }
  if (!hasAnyMeaningfulValue(sanitized)) return sanitized
  return sanitized
}

main()
