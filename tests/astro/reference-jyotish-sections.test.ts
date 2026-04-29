import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('reference jyotish sections', () => {
  it('emits reference-backed higher level sections for the Jyotishko fixture', () => {
    const fixture = new URL('./fixtures/python-engine-request.json', import.meta.url)
    const stdout = execFileSync('python3', ['services/astro-engine/python/run_calculation.py'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SWISS_EPHE_PATH: 'ephe',
      },
      input: readFileSync(fixture),
      encoding: 'utf8',
    })
    const output = JSON.parse(stdout)

    expect(output.panchang.status).toBe('available')
    expect(output.panchang.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Vara', value: 'Monday' }),
        expect.objectContaining({ label: 'Tithi', value: 'Pratipad' }),
        expect.objectContaining({ label: 'Nakshatra', value: 'Mrigasira' }),
        expect.objectContaining({ label: 'Yoga', value: 'Ganda' }),
        expect.objectContaining({ label: 'Karana', value: 'Kintudhhana' }),
        expect.objectContaining({ label: 'Paksha', value: 'Shukla' }),
      ]),
    )
    expect(output.vimshottari_dasha.status).toBe('not_available')
    expect(output.navamsa_d9.status).toBe('not_available')
    expect(output.ashtakvarga.status).toBe('not_available')
    expect(output.sade_sati.status).toBe('not_available')
    expect(output.kalsarpa_dosh.status).toBe('not_available')
    expect(output.manglik_dosha.status).toBe('not_available')
    expect(output.shadbala.status).toBe('not_available')
    expect(output.prediction_ready_context).toBeTruthy()
  })
})
