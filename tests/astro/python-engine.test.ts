/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { calculateMasterAstroOutput } from '../../lib/astro/calculations/master.ts'
import { normalizeBirthInput } from '../../lib/astro/normalize.ts'
import type { BirthProfileInput, AstrologySettings } from '../../lib/astro/types.ts'
import {
  PythonAstroEngineError,
  summarizePythonError,
  withPythonFallbackWarning,
} from '../../services/astro-engine/src/python-engine.ts'

type PythonEngineFixture = {
  input: BirthProfileInput
  settings: AstrologySettings
  runtime: {
    user_id: string
    profile_id: string
    current_utc: string
    production: boolean
  }
}

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/python-engine-request.json', import.meta.url), 'utf8'),
) as PythonEngineFixture

describe('python engine bridge helpers', () => {
  it('summarizePythonError returns the code for PythonAstroEngineError', () => {
    const error = new PythonAstroEngineError('python_timeout')
    expect(summarizePythonError(error)).toBe('python_timeout')
  })

  it('summarizePythonError returns python_unknown_error for generic Error', () => {
    expect(summarizePythonError(new Error('boom'))).toBe('python_unknown_error')
  })

  it('withPythonFallbackWarning appends a safe warning', async () => {
    const normalized = normalizeBirthInput(fixture.input)
    const output = await calculateMasterAstroOutput({
      input: fixture.input,
      normalized,
      settings: fixture.settings,
      runtime: fixture.runtime,
    })

    const result = withPythonFallbackWarning(
      output,
      new PythonAstroEngineError('python_invalid_json'),
    )

    const warnings = result.warnings as Array<Record<string, unknown>>

    expect(Array.isArray(warnings)).toBe(true)
    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          warning_code: 'PYTHON_ENGINE_FALLBACK_TO_TS',
          severity: 'medium',
        }),
      ]),
    )

    const fallbackWarning = warnings.find(
      (warning) => warning.warning_code === 'PYTHON_ENGINE_FALLBACK_TO_TS',
    )

    expect(fallbackWarning).toBeTruthy()
    expect(JSON.stringify(fallbackWarning)).not.toContain('birth_date')
    expect(JSON.stringify(fallbackWarning)).not.toContain('latitude')
    expect(JSON.stringify(fallbackWarning)).not.toContain('longitude')
    expect(JSON.stringify(fallbackWarning)).not.toContain('user_id')
    expect(JSON.stringify(fallbackWarning)).not.toContain('profile_id')
  })

  it('withPythonFallbackWarning preserves existing output shape', async () => {
    const normalized = normalizeBirthInput(fixture.input)
    const output = await calculateMasterAstroOutput({
      input: fixture.input,
      normalized,
      settings: fixture.settings,
      runtime: fixture.runtime,
    })

    const result = withPythonFallbackWarning(
      output,
      new PythonAstroEngineError('python_invalid_json'),
    )

    expect(result.schema_version).toBe(output.schema_version)
    expect(result.calculation_status).toBe(output.calculation_status)
    expect(result).toHaveProperty('prediction_ready_context')
  })
})
