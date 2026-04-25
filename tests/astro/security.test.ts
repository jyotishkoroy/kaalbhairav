import { afterEach, describe, expect, it } from 'vitest'

import { buildChartJson } from '../../lib/astro/chart-json'
import { decryptJson, encryptJson } from '../../lib/astro/encryption'
import { sha256Canonical } from '../../lib/astro/hashing'
import { buildPredictionContext } from '../../lib/astro/prediction-context'
import { getDefaultAstrologySettings, getSettingsHash } from '../../lib/astro/settings'
import type { BirthProfileInput, EncryptedBirthPayload } from '../../lib/astro/types'

const originalEnv = { ...process.env }

const keyA = Buffer.alloc(32, 1).toString('base64')
const keyB = Buffer.alloc(32, 2).toString('base64')

const sensitiveBirthProfile: BirthProfileInput = {
  display_name: 'Security Fixture',
  birth_date: '1999-06-14',
  birth_time: '09:58:00',
  birth_time_known: true,
  birth_time_precision: 'exact_to_second',
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
  const settings = getDefaultAstrologySettings()
  const normalizedInput = {
    birth_date: sensitiveBirthProfile.birth_date,
    birth_time: sensitiveBirthProfile.birth_time,
    birth_place_name: sensitiveBirthProfile.birth_place_name,
    latitude: sensitiveBirthProfile.latitude,
    longitude: sensitiveBirthProfile.longitude,
    timezone: sensitiveBirthProfile.timezone,
  }

  const chartJson = buildChartJson({
    user_id: 'user-test-1',
    profile_id: 'profile-test-1',
    calculation_id: 'calculation-test-1',
    chart_version_id: 'chart-version-test-1',
    chart_version: 1,
    input_hash: sha256Canonical(normalizedInput),
    settings_hash: getSettingsHash(settings),
    settings,
    normalized_input: normalizedInput,
    engine_result: {
      life_area_signatures: {
        career: {
          signal: 'stub',
          confidence: 'low',
        },
      },
      timing_signatures: {
        current: {
          signal: 'stub',
          confidence: 'low',
        },
      },
      dashas: {},
      doshas: {},
    },
  })

  return buildPredictionContext(chartJson)
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
      settings: getDefaultAstrologySettings(),
    }
    const second = {
      settings: getDefaultAstrologySettings(),
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
