/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { afterEach, describe, expect, it } from 'vitest'

import { buildChartJson } from '../../lib/astro/chart-json'
import { decryptJson, encryptJson } from '../../lib/astro/encryption'
import { runEngine } from '../../lib/astro/engine'
import { sha256Canonical } from '../../lib/astro/hashing'
import { normalizeBirthInput } from '../../lib/astro/normalize'
import { buildPredictionContext } from '../../lib/astro/prediction-context'
import { DEFAULT_SETTINGS, hashSettings } from '../../lib/astro/settings'
import type { BirthProfileInput, EncryptedBirthPayload } from '../../lib/astro/types'

const originalEnv = { ...process.env }

const keyA = Buffer.alloc(32, 1).toString('base64')
const keyB = Buffer.alloc(32, 2).toString('base64')

const sensitiveBirthProfile: BirthProfileInput = {
  display_name: 'Security Fixture',
  birth_date: '1999-06-14',
  birth_time: '09:58:00',
  birth_time_known: true,
  birth_time_precision: 'exact',
  birth_place_name: 'Kolkata',
  latitude: 22.5666667,
  longitude: 88.3666667,
  timezone: 'Asia/Kolkata',
  gender: 'not_provided',
  calendar_system: 'gregorian',
  data_consent_version: 'astro-v1-test',
}

const sensitiveBirthPayload: EncryptedBirthPayload = {
  ...sensitiveBirthProfile,
  submitted_at: '2026-04-25T00:00:00.000Z',
}

const rawSensitiveValues = [
  '1999-06-14',
  '09:58:00',
  'Kolkata',
  '22.5666667',
  '88.3666667',
]

function useTestKey(key: string) {
  process.env.PII_ENCRYPTION_KEY = key
  process.env.PII_ENCRYPTION_KEY_VERSION = '1'
}

function buildStubPredictionContext() {
  process.env.ASTRO_ENGINE_MODE = 'stub'
  const settings = DEFAULT_SETTINGS
  const normalized = normalizeBirthInput(sensitiveBirthProfile)
  const input_hash = sha256Canonical({
    version: normalized.input_hash_material_version,
    date: normalized.birth_date_iso,
    time: normalized.birth_time_iso,
    tz: normalized.timezone,
    lat: normalized.latitude_rounded,
    lon: normalized.longitude_rounded,
  })
  const engine = runEngine(normalized, settings)

  const chartJson = buildChartJson({
    user_id: 'user-test-1',
    profile_id: 'profile-test-1',
    calculation_id: 'calculation-test-1',
    chart_version_id: 'chart-version-test-1',
    chart_version: 1,
    input_hash,
    settings_hash: hashSettings(settings),
    normalized,
    settings,
    engine,
  })

  return buildPredictionContext(chartJson, 'general')
}

function findForbiddenKeyPath(value: unknown, forbidden: Set<string>, path: string[] = []): string | null {
  if (!value || typeof value !== 'object') return null
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const found = findForbiddenKeyPath(value[i], forbidden, [...path, String(i)])
      if (found) return found
    }
    return null
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (forbidden.has(key)) return [...path, key].join('.')
    const found = findForbiddenKeyPath(nested, forbidden, [...path, key])
    if (found) return found
  }
  return null
}

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('Astro V1 security hardening', () => {
  it('round-trips encrypted birth payloads', () => {
    useTestKey(keyA)

    const encrypted = encryptJson(sensitiveBirthPayload)
    const decrypted = decryptJson<EncryptedBirthPayload>(encrypted)

    expect(decrypted).toEqual(sensitiveBirthPayload)
  })

  it('fails safely when decrypting with the wrong key', () => {
    useTestKey(keyA)
    const encrypted = encryptJson(sensitiveBirthPayload)

    useTestKey(keyB)

    expect(() => decryptJson<EncryptedBirthPayload>(encrypted)).toThrow()
  })

  it('does not leak sensitive plaintext values in encrypted payloads', () => {
    useTestKey(keyA)

    const encrypted = encryptJson(sensitiveBirthPayload)
    const serialized = JSON.stringify(encrypted)

    for (const sensitiveValue of rawSensitiveValues) {
      expect(serialized).not.toContain(sensitiveValue)
    }
  })

  it('hashes semantically identical objects deterministically across key order', () => {
    const first = {
      birth_date: '1999-06-14',
      place: {
        name: 'Kolkata',
        coordinates: {
          latitude: 22.5666667,
          longitude: 88.3666667,
        },
      },
      settings: DEFAULT_SETTINGS,
    }
    const second = {
      settings: DEFAULT_SETTINGS,
      place: {
        coordinates: {
          longitude: 88.3666667,
          latitude: 22.5666667,
        },
        name: 'Kolkata',
      },
      birth_date: '1999-06-14',
    }

    expect(sha256Canonical(first)).toBe(sha256Canonical(second))
  })

  it('changes hashes when meaningful input fields change', () => {
    const original = {
      birth_date: '1999-06-14',
      birth_time: '09:58:00',
      birth_place_name: 'Kolkata',
    }
    const changed = {
      ...original,
      birth_time: '10:58:00',
    }

    expect(sha256Canonical(original)).not.toBe(sha256Canonical(changed))
  })

  it('does not expose forbidden raw birth data in prediction_context', () => {
    const predictionContext = buildStubPredictionContext()
    const serialized = JSON.stringify(predictionContext)

    const forbiddenKeys = [
      'birth_year',
      'birth_date',
      'birth_time',
      'birth_place',
      'birth_place_name',
      'latitude',
      'longitude',
      'encrypted_birth_data',
      'ciphertext',
    ]

    for (const forbiddenKey of forbiddenKeys) {
      expect(serialized).not.toContain(forbiddenKey)
    }

    for (const sensitiveValue of rawSensitiveValues) {
      expect(serialized).not.toContain(sensitiveValue)
    }
  })

  it('recursively excludes forbidden raw birth keys from prediction_context', () => {
    const predictionContext = buildStubPredictionContext()
    const forbiddenKeys = new Set([
      'birth_year',
      'birth_date',
      'birth_time',
      'birth_time_precision',
      'birth_place',
      'birth_place_name',
      'latitude',
      'longitude',
      'encrypted_birth_data',
      'ciphertext',
      'display_name',
      'data_consent_version',
      'profile_id',
      'user_id',
    ])

    const hit = findForbiddenKeyPath(predictionContext, forbiddenKeys)
    expect(hit).toBeNull()
  })

  it('does not persist forbidden raw birth data in chart_json normalized input', () => {
    process.env.ASTRO_ENGINE_MODE = 'stub'
    const settings = DEFAULT_SETTINGS
    const normalized = normalizeBirthInput(sensitiveBirthProfile)
    const input_hash = sha256Canonical({
      version: normalized.input_hash_material_version,
      date: normalized.birth_date_iso,
      time: normalized.birth_time_iso,
      tz: normalized.timezone,
      lat: normalized.latitude_rounded,
      lon: normalized.longitude_rounded,
    })
    const engine = runEngine(normalized, settings)
    const chartJson = buildChartJson({
      user_id: 'user-test-1',
      profile_id: 'profile-test-1',
      calculation_id: 'calculation-test-1',
      chart_version_id: 'chart-version-test-1',
      chart_version: 1,
      input_hash,
      settings_hash: hashSettings(settings),
      normalized,
      settings,
      engine,
    })
    const serialized = JSON.stringify(chartJson)

    const forbiddenChartKeys = [
      'birth_date',
      'birth_time',
      'birth_place_name',
      'latitude',
      'longitude',
      'encrypted_birth_data',
    ]

    for (const forbiddenChartKey of forbiddenChartKeys) {
      expect(chartJson.normalized_input).not.toHaveProperty(forbiddenChartKey)
    }

    const forbiddenChartValues = [
      '09:58:00',
      '22.5666667',
      '88.3666667',
    ]

    for (const forbiddenChartValue of forbiddenChartValues) {
      expect(serialized).not.toContain(forbiddenChartValue)
    }

    expect(chartJson.normalized_input).toMatchObject({
      timezone: sensitiveBirthProfile.timezone,
      birth_time_known: sensitiveBirthProfile.birth_time_known,
    })
  })

  it('does not expose forbidden raw birth data in LLM payload material', () => {
    const predictionContext = buildStubPredictionContext()
    const llmPayload = {
      prediction_context: predictionContext,
      user_question: 'What does my chart say about career?',
      answer_policy: {
        max_output_tokens: 900,
        must_mention_stub_status: true,
        must_mention_confidence: true,
      },
    }
    const serialized = JSON.stringify(llmPayload)

    const forbiddenPayloadFragments = [
      'birth_date',
      'birth_time',
      'latitude',
      'longitude',
      'encrypted_birth_data',
      '1999-06-14',
      '09:58:00',
      '22.5666667',
      '88.3666667',
    ]

    for (const forbiddenPayloadFragment of forbiddenPayloadFragments) {
      expect(serialized).not.toContain(forbiddenPayloadFragment)
    }
  })

  it('keeps LLM instructions explain-only and non-calculating', () => {
    const predictionContext = buildStubPredictionContext()

    expect(predictionContext.do_not_recalculate).toBe(true)
    expect(predictionContext.llm_instructions.do_not_calculate_astrology).toBe(true)
    expect(predictionContext.llm_instructions.do_not_modify_chart_values).toBe(true)
    expect(predictionContext.llm_instructions.do_not_invent_missing_data).toBe(true)
    expect(predictionContext.llm_instructions.do_not_infer_missing_data).toBe(true)
    expect(predictionContext.llm_instructions.explain_only_from_supplied_context).toBe(true)
    expect(
      predictionContext.llm_instructions
        .refuse_deterministic_medical_legal_financial_death_or_guaranteed_event_predictions,
    ).toBe(true)
  })

  it('preserves stub calculation status and unsupported engine fields', () => {
    const predictionContext = buildStubPredictionContext()

    expect(predictionContext.chart_identity.calculation_status).toBe('stub')
    expect(predictionContext.chart_identity.ephemeris_version).toBe('stub')
    expect(predictionContext.unsupported_fields).toEqual(
      expect.arrayContaining([
        'planetary_positions',
        'houses',
        'dashas',
        'transits',
        'ashtakavarga',
      ]),
    )
  })
})
