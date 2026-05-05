/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { masterAstroOutputSchema, type MasterAstroCalculationOutput } from '../schemas/master.ts'
import type { AstroRuntimeClock } from '../calculations/runtime-clock.ts'
import type { AstrologySettings, BirthProfileInput } from '../types.ts'
import type { NormalizedBirthInput } from '../normalize.ts'
import { getAstroEngineServiceApiKey, getAstroEngineServiceUrl } from './backend.ts'

// Remote ephemeris provider wiring is intentionally omitted because the current
// remote engine does not expose a deterministic tropical-position endpoint.

export type RemoteAstroRuntime = {
  user_id: string
  profile_id: string
  current_utc: string
  production: boolean
}

export type RemoteAstroCalculationArgs = {
  input: BirthProfileInput
  normalized: NormalizedBirthInput
  settings: AstrologySettings
  runtime: RemoteAstroRuntime
  runtimeClock?: Partial<AstroRuntimeClock>
}

function buildRejectedOutput(reason: string): MasterAstroCalculationOutput {
  return masterAstroOutputSchema.parse({
    schema_version: '29.0.0',
    calculation_status: 'rejected',
    rejection_reason: reason,
    warnings: [
      {
        warning_code: 'REMOTE_ENGINE_UNAVAILABLE',
        severity: 'critical',
        affected_calculations: ['all'],
        explanation: reason,
      },
    ],
    prediction_ready_context: {
      do_not_recalculate: true,
      chart_identity: {
        chart_version_id: '',
        schema_version: '29.0.0',
        engine_version: '',
        ephemeris_version: '',
        calculation_status: 'rejected',
      },
      confidence: {},
      warnings: [],
      core_natal_summary: {},
      life_area_signatures: {},
      current_timing: {},
      dashas: {},
      doshas: {},
      allowed_astro_terms: [],
      unsupported_fields: [],
      llm_instructions: {
        do_not_calculate_astrology: true,
        do_not_modify_chart_values: true,
        do_not_invent_missing_data: true,
        do_not_infer_missing_data: true,
        explain_only_from_supplied_context: true,
        mention_warnings_where_relevant: true,
        refuse_deterministic_medical_legal_financial_death_or_guaranteed_event_predictions: true,
      },
    },
  })
}

function sanitizeValidationIssues(issues: unknown): Array<{ path: string[]; message: string }> {
  if (!Array.isArray(issues)) return []

  return issues.flatMap((issue) => {
    if (!issue || typeof issue !== 'object') return []

    const rawIssue = issue as { path?: unknown; message?: unknown }
    const path = Array.isArray(rawIssue.path) ? rawIssue.path.map((segment) => String(segment)) : []
    const message = typeof rawIssue.message === 'string' ? rawIssue.message : ''
    if (!message) return []

    return [{ path, message }]
  })
}

export async function calculateMasterAstroOutputRemote(
  args: RemoteAstroCalculationArgs,
): Promise<MasterAstroCalculationOutput> {
  const serviceUrl = getAstroEngineServiceUrl()
  if (!serviceUrl) return buildRejectedOutput('remote_astro_engine_not_configured')

  let response: Response
  try {
    response = await fetch(`${serviceUrl}/astro/v1/calculate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(getAstroEngineServiceApiKey() ? { authorization: `Bearer ${getAstroEngineServiceApiKey()}` } : {}),
      },
      body: JSON.stringify(args),
    })
  } catch {
    return buildRejectedOutput('remote_astro_engine_unavailable')
  }

  const payload = await response.json().catch(() => null)

  if (response.status === 422) {
    return masterAstroOutputSchema.parse({
      ...(payload ?? {}),
      calculation_status: 'rejected',
    })
  }

  if (response.status === 400) {
    const issues = sanitizeValidationIssues((payload as { issues?: unknown } | null)?.issues)
    return masterAstroOutputSchema.parse({
      schema_version: '29.0.0',
      calculation_status: 'rejected',
      rejection_reason: 'remote_astro_engine_http_400',
      warnings: [
        {
          warning_code: 'REMOTE_ENGINE_HTTP_400',
          severity: 'high',
          affected_calculations: ['all'],
          explanation: 'Remote astro engine rejected the request payload.',
          evidence: {
            status: 400,
            issues,
          },
        },
      ],
    })
  }

  if (!response.ok) {
    return buildRejectedOutput(`remote_astro_engine_http_${response.status}`)
  }

  const parsed = masterAstroOutputSchema.safeParse(payload)
  if (!parsed.success) {
    return buildRejectedOutput('remote_astro_engine_invalid_response')
  }

  return parsed.data
}
