/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const calculateAstroEngineMock = vi.hoisted(() => vi.fn(async () => ({
  schema_version: '29.0.0',
  calculation_status: 'calculated',
  result: 'ok',
})))

vi.mock('../../services/astro-engine/src/calculate', () => ({
  calculateAstroEngine: calculateAstroEngineMock,
}))

vi.mock('../../lib/astro/feature-flags', () => ({
  astroV1ApiEnabled: vi.fn(() => true),
}))

vi.mock('../../lib/astro/engine/diagnostics', () => ({
  runStartupValidation: vi.fn(() => ({ passed: true })),
}))

import { handleAstroEngineRequest } from '../../services/astro-engine/src/server'

type TestResponse = {
  status?: number
  headers?: Record<string, string>
  body?: string
}

type TestRequest = {
  method: string
  url: string
  headers: Record<string, string>
  [Symbol.asyncIterator](): AsyncGenerator<string>
}

type TestResponseHandle = {
  writeHead(status: number, headers: Record<string, string>): void
  end(body: string): void
  response: TestResponse
}

function createRequest(body: unknown, options: { method?: string; path?: string } = {}): TestRequest {
  const payload = JSON.stringify(body)
  return {
    method: options.method ?? 'POST',
    url: options.path ?? '/astro/v1/calculate',
    headers: { host: 'localhost' },
    async *[Symbol.asyncIterator]() {
      yield payload
    },
  }
}

function createResponse(): TestResponseHandle {
  const response: TestResponse = {}
  return {
    writeHead(status: number, headers: Record<string, string>) {
      response.status = status
      response.headers = headers
    },
    end(body: string) {
      response.body = body
    },
    response,
  }
}

beforeEach(() => {
  calculateAstroEngineMock.mockClear()
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('astro engine service', () => {
  it('accepts request with input settings runtime only', async () => {
    const req = createRequest({
      input: {
        display_name: 'Fixture',
        birth_date: '1990-06-14',
        birth_time: '09:58:00',
        birth_time_known: true,
        birth_time_precision: 'exact',
        birth_place_name: 'Kolkata',
        latitude: 22.5667,
        longitude: 88.3667,
        timezone: 'Asia/Kolkata',
        data_consent_version: '2026-04-25',
      },
      settings: {
        astrology_system: 'parashari',
        zodiac_type: 'sidereal',
        ayanamsa: 'lahiri',
        house_system: 'whole_sign',
        node_type: 'mean_node',
        dasha_year_basis: 'sidereal_365.25',
      },
      runtime: {
        user_id: 'user-test',
        profile_id: 'profile-test',
        current_utc: '2026-04-27T00:00:00.000Z',
        production: false,
      },
    })
    const res = createResponse()

    await handleAstroEngineRequest(req as never, res as never)

    expect(res.response.status).toBe(200)
    expect(calculateAstroEngineMock).toHaveBeenCalledTimes(1)
    const callArgs = calculateAstroEngineMock.mock.calls[0] as unknown as [{ input: Record<string, unknown>; settings: Record<string, unknown>; runtime: Record<string, unknown> }] | undefined
    expect(callArgs?.[0]).toMatchObject({
      input: { display_name: 'Fixture' },
      settings: { astrology_system: 'parashari' },
      runtime: { profile_id: 'profile-test' },
    })
  })

  it('accepts request with input normalized settings runtime', async () => {
    const req = createRequest({
      input: {
        display_name: 'Fixture',
        birth_date: '1990-06-14',
        birth_time: '09:58:00',
        birth_time_known: true,
        birth_time_precision: 'exact',
        birth_place_name: 'Kolkata',
        latitude: 22.5667,
        longitude: 88.3667,
        timezone: 'Asia/Kolkata',
        data_consent_version: '2026-04-25',
      },
      normalized: {
        birth_date_iso: '1990-06-14',
        birth_time_iso: '09:58:00',
        birth_time_known: true,
        birth_time_precision: 'exact',
        birth_time_uncertainty_seconds: 0,
        timezone: 'Asia/Kolkata',
        timezone_status: 'valid',
        coordinate_confidence: 0.95,
        latitude_full: 22.5667,
        longitude_full: 88.3667,
        latitude_rounded: 22.5667,
        longitude_rounded: 88.3667,
        input_hash_material_version: '2.0.0',
        warnings: [],
      },
      settings: {
        astrology_system: 'parashari',
        zodiac_type: 'sidereal',
        ayanamsa: 'lahiri',
        house_system: 'whole_sign',
        node_type: 'mean_node',
        dasha_year_basis: 'sidereal_365.25',
      },
      runtime: {
        user_id: 'user-test',
        profile_id: 'profile-test',
        current_utc: '2026-04-27T00:00:00.000Z',
        production: false,
      },
    })
    const res = createResponse()

    await handleAstroEngineRequest(req as never, res as never)

    expect(res.response.status).toBe(200)
    expect(calculateAstroEngineMock).toHaveBeenCalledTimes(1)
  })

  it('returns structured 400 for invalid request', async () => {
    const req = createRequest({
      input: {
        display_name: 'Fixture',
      },
      settings: {},
      runtime: {},
    })
    const res = createResponse()

    await handleAstroEngineRequest(req as never, res as never)

    expect(res.response.status).toBe(400)
    expect(JSON.parse(res.response.body ?? '{}')).toMatchObject({
      error: 'invalid_input',
      issues: expect.any(Array),
    })
  })

  it('logs request shape without sensitive fields', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const req = createRequest({
      input: {
        display_name: 'Fixture',
        birth_date: '1990-06-14',
        birth_time: '09:58:00',
        birth_time_known: true,
        birth_time_precision: 'exact',
        birth_place_name: 'Kolkata',
        latitude: 22.5667,
        longitude: 88.3667,
        timezone: 'Asia/Kolkata',
        data_consent_version: '2026-04-25',
      },
      settings: {
        astrology_system: 'parashari',
        zodiac_type: 'sidereal',
        ayanamsa: 'lahiri',
        house_system: 'whole_sign',
        node_type: 'mean_node',
        dasha_year_basis: 'sidereal_365.25',
      },
      runtime: {
        user_id: 'user-test',
        profile_id: 'profile-test',
        current_utc: '2026-04-27T00:00:00.000Z',
        production: false,
      },
    })
    const res = createResponse()

    await handleAstroEngineRequest(req as never, res as never)

    const logCall = infoSpy.mock.calls.find(([name]) => name === 'astro_engine_request') as
      | [string, Record<string, unknown>]
      | undefined
    const eventName = logCall?.[0]
    const details = logCall?.[1]
    expect(eventName).toBe('astro_engine_request')
    expect(details).toMatchObject({
      method: 'POST',
      path: '/astro/v1/calculate',
      status: 200,
      has_input: true,
      has_normalized: false,
      has_settings: true,
      has_runtime: true,
    })
    expect(JSON.stringify(details)).not.toContain('1990-06-14')
    expect(JSON.stringify(details)).not.toContain('Kolkata')
    expect(JSON.stringify(details)).not.toContain('user-test')
    expect(JSON.stringify(details)).not.toContain('profile-test')
  })
})
