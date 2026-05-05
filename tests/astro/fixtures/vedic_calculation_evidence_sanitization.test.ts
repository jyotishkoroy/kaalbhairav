/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const fixtureDir = path.join(process.cwd(), 'tests/astro/fixtures/vedic-calculation-evidence')
const fixtureFiles = [
  'time_pipeline_cases.json',
  'planetary_positions_cases.json',
  'panchanga_cases.json',
  'varga_cases.json',
  'kp_cases.json',
  'dosha_cases.json',
  'ashtakavarga_total_cases.json',
]

const expectedKeys: Record<string, string[]> = {
  'time_pipeline_cases.json': [
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
  'planetary_positions_cases.json': [
    'caseId',
    'body',
    'signNumber',
    'signName',
    'degreeInSignDms',
    'absoluteSiderealLongitudeDeg',
    'nakshatra',
    'pada',
    'retrograde',
  ],
  'panchanga_cases.json': ['caseId', 'tithi', 'paksha', 'yoga', 'karana', 'weekday', 'hinduWeekday'],
  'varga_cases.json': ['caseId', 'body', 'varga', 'expectedSignNumber'],
  'kp_cases.json': ['caseId', 'kind', 'id', 'longitudeDeg', 'rashiLord', 'nakshatraLord', 'subLord', 'subSubLord'],
  'dosha_cases.json': ['caseId', 'manglik', 'manglikFromLagna', 'manglikFromMoon', 'kalsarpa', 'kalsarpaType'],
  'ashtakavarga_total_cases.json': ['caseId', 'signNumber', 'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'expectedTotal'],
}

describe('vedic calculation evidence fixture sanitization', () => {
  it('loads every fixture file with metadata and cases array', () => {
    for (const fileName of fixtureFiles) {
      const fixturePath = path.join(fixtureDir, fileName)
      expect(fs.existsSync(fixturePath)).toBe(true)
      const parsed = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as { sourceEvidenceVersion?: string; generatedAt?: string; cases?: unknown[] }
      expect(parsed.sourceEvidenceVersion).toBe('phase18_sanitized_v1')
      expect(parsed.generatedAt).toBe('1970-01-01T00:00:00.000Z')
      expect(Array.isArray(parsed.cases)).toBe(true)
    }
  })

  it('uses stable anonymous case ids and rejects duplicate ids within a file', () => {
    for (const fileName of fixtureFiles) {
      const parsed = JSON.parse(fs.readFileSync(path.join(fixtureDir, fileName), 'utf8')) as { cases?: Array<{ caseId?: string }> }
      const seen = new Set<string>()
      for (const caseItem of parsed.cases ?? []) {
        expect(caseItem.caseId).toMatch(/^case_\d{3}$/)
        expect(seen.has(caseItem.caseId ?? '')).toBe(false)
        if (caseItem.caseId) seen.add(caseItem.caseId)
      }
    }
  })

  it('does not contain raw evidence markers or private source material in serialized content', () => {
    const forbidden = ['.pdf', 'raw_text', 'source_path', '/Users/', 'http://', 'https://', 'www.', 'file://']
    for (const fileName of fixtureFiles) {
      const content = fs.readFileSync(path.join(fixtureDir, fileName), 'utf8')
      for (const token of forbidden) {
        expect(content).not.toContain(token)
      }
    }
  })

  it('keeps required keys present for each case', () => {
    for (const fileName of fixtureFiles) {
      const parsed = JSON.parse(fs.readFileSync(path.join(fixtureDir, fileName), 'utf8')) as { cases?: Array<Record<string, unknown>> }
      for (const caseItem of parsed.cases ?? []) {
        for (const key of expectedKeys[fileName]) {
          expect(Object.prototype.hasOwnProperty.call(caseItem, key)).toBe(true)
        }
      }
    }
  })

  it('does not contain private names or indicators in any serialized fixture', () => {
    const forbidden = ['jyotishko', 'jyotiskaroy', 'supershakti', 'gmail.com', 'myVedicReport', 'astro_package', 'Daniel Carter', 'native', 'report_name', 'filename', 'sourceFile']
    for (const fileName of fixtureFiles) {
      const content = fs.readFileSync(path.join(fixtureDir, fileName), 'utf8').toLowerCase()
      for (const token of forbidden) {
        expect(content).not.toContain(token.toLowerCase())
      }
    }
  })
})
