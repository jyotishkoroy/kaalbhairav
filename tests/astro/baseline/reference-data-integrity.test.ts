import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Phase 1 baseline - reference data integrity', () => {
  it('keeps real panchang values in the python engine request fixture', () => {
    const fixturePath = path.join(process.cwd(), 'tests', 'astro', 'fixtures', 'python-engine-request.json')
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as {
      raw?: {
        panchang?: Record<string, unknown>
      }
    }
    expect(fixture.raw?.panchang).toMatchObject({
      vara: 'Monday',
      tithi: 'Pratipad',
      paksha: 'Shukla',
      yoga: 'Ganda',
      karana: 'Kintudhhana',
    })
  })

  it('does not hardcode reference panchang values in the production python adapter', () => {
    const adapterPath = path.join(process.cwd(), 'services', 'astro-engine', 'python', 'app_adapter.py')
    const adapterSource = fs.readFileSync(adapterPath, 'utf8')
    const forbiddenLiteralPatterns = [
      /or\s+["']Monday["']/,
      /or\s+["']Pratipad["']/,
      /or\s+["']Ashwini["']/,
      /or\s+["']Ganda["']/,
      /or\s+["']Kintudhhana["']/,
      /has_mangal_dosha["']?\s*:\s*False/,
      /has_kalsarpa["']?\s*:\s*False/,
      /build_reference_/,
    ]
    for (const pattern of forbiddenLiteralPatterns) {
      expect(adapterSource).not.toMatch(pattern)
    }
  })
})
