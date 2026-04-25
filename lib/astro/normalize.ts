import type { AstroWarning, BirthProfileInput } from './types'
import { sha256Canonical } from './hashing'

export function normalizeBirthInput(input: BirthProfileInput) {
  const warnings: AstroWarning[] = []

  if (!input.birth_time_known) {
    warnings.push({
      warning_code: 'BIRTH_TIME_UNKNOWN',
      severity: 'medium',
      affected_calculations: ['lagna', 'houses', 'dashas'],
      explanation: 'Birth time is unknown, so time-sensitive calculations are limited.',
    })
  }

  const normalized = {
    input_hash_material_version: '1.0.0' as const,
    birth_time_known: input.birth_time_known,
    birth_time_precision: input.birth_time_precision,
    timezone: input.timezone,
    coordinate_confidence: 0.8,
    geocoding_confidence: 0.8,
    warnings,
  }

  return {
    normalized,
    input_hash: sha256Canonical(normalized),
    warnings,
  }
}
