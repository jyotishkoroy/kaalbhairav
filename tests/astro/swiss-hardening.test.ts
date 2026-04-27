import { afterEach, describe, expect, it, vi } from 'vitest'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
  vi.resetModules()
})

describe('Swiss Ephemeris hardening', () => {
  it('fails closed when Swiss files are unavailable', async () => {
    process.env.SWISS_EPHE_PATH = '/tmp/nonexistent-swiss-path-for-test'

    const swiss = await import('../../lib/astro/engine/swiss')
    const status = swiss.initSwissEphemeris()

    expect(status.moshier_fallback).toBe(true)
    expect(swiss.isSwissEphemerisAvailable()).toBe(false)
    expect(status.validation_passed).toBe(false)
  })

  it('rejects astronomical calls outside the supported ephemeris range', async () => {
    const swiss = await import('../../lib/astro/engine/swiss')
    expect(() => swiss.calcPlanet(2000000, swiss.SE_SUN)).toThrow()
    expect(() => swiss.getLahiriAyanamsa(2000000)).toThrow()
    expect(() => swiss.getSunriseOrSet(2000000, 22.5, 88.3, 0, swiss.SE_CALC_RISE)).toThrow()
  })
})
