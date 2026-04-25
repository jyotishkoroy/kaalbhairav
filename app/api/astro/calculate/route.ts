import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'

import { buildChartJson } from '@/lib/astro/chart-json'
import { decryptJson } from '@/lib/astro/encryption'
import { runEngine } from '@/lib/astro/engine'
import { ENGINE_VERSION, EPHEMERIS_VERSION, SCHEMA_VERSION } from '@/lib/astro/engine/version'
import { sha256Canonical } from '@/lib/astro/hashing'
import { normalizeBirthInput } from '@/lib/astro/normalize'
import { buildPredictionContext } from '@/lib/astro/prediction-context'
import { DEFAULT_SETTINGS, hashSettings } from '@/lib/astro/settings'
import type { BirthProfileInput } from '@/lib/astro/types'
import { calculateRequestSchema } from '@/lib/astro/schemas/calculate'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  if (process.env.ASTRO_V1_API_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'ASTRO_V1_API_DISABLED' },
      { status: 503 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = calculateRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'VALIDATION_FAILED',
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    )
  }

  const { profile_id, force_recalc } = parsed.data
  const service = createServiceClient()

  const { data: profile, error: profileError } = await service
    .from('birth_profiles')
    .select('id, user_id, encrypted_birth_data')
    .eq('id', profile_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 })
  }

  const decrypted = decryptJson<BirthProfileInput & { submitted_at?: string }>(
    profile.encrypted_birth_data,
  )

  const normalized = normalizeBirthInput(decrypted)
  const input_hash = sha256Canonical({
    version: normalized.input_hash_material_version,
    date: normalized.birth_date_iso,
    time: normalized.birth_time_iso,
    tz: normalized.timezone,
    lat: normalized.latitude_rounded,
    lon: normalized.longitude_rounded,
  })
  const settings = DEFAULT_SETTINGS
  const settingsHash = hashSettings(settings)
  const engineVersion = ENGINE_VERSION

  if (!force_recalc) {
    const { data: cachedCalculation } = await service
      .from('chart_calculations')
      .select('id, current_chart_version_id')
      .eq('profile_id', profile_id)
      .eq('user_id', user.id)
      .eq('input_hash', input_hash)
      .eq('settings_hash', settingsHash)
      .eq('engine_version', engineVersion)
      .eq('status', 'completed')
      .maybeSingle()

    if (cachedCalculation?.current_chart_version_id) {
      const { data: cachedSummary } = await service
        .from('prediction_ready_summaries')
        .select('id, prediction_context')
        .eq('chart_version_id', cachedCalculation.current_chart_version_id)
        .eq('topic', 'general')
        .maybeSingle()

      return NextResponse.json({
        calculation_id: cachedCalculation.id,
        chart_version_id: cachedCalculation.current_chart_version_id,
        prediction_context_id: cachedSummary?.id ?? null,
        reused_cache: true,
        calculation_status: 'stub',
        warnings: normalized.warnings,
      })
    }
  }

  const { data: existingVersions, error: versionCountError } = await service
    .from('chart_json_versions')
    .select('chart_version')
    .eq('profile_id', profile_id)
    .order('chart_version', { ascending: false })
    .limit(1)

  if (versionCountError) {
    return NextResponse.json(
      {
        error: 'CHART_VERSION_LOOKUP_FAILED',
        detail: versionCountError.message,
      },
      { status: 500 },
    )
  }

  const nextChartVersion = (existingVersions?.[0]?.chart_version ?? 0) + 1

  const { data: calculation, error: calculationError } = await service
    .from('chart_calculations')
    .insert({
      user_id: user.id,
      profile_id,
      status: 'running',
      input_hash,
      settings_hash: settingsHash,
      engine_version: engineVersion,
      ephemeris_version: EPHEMERIS_VERSION,
      schema_version: SCHEMA_VERSION,
      force_recalc,
      idempotency_key: randomUUID(),
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (calculationError || !calculation) {
    return NextResponse.json(
      {
        error: 'CALCULATION_CREATE_FAILED',
        detail: calculationError?.message,
      },
      { status: 500 },
    )
  }

  const chartVersionId = randomUUID()
  const engineResult = runEngine(normalized, settings)
  const chartJson = buildChartJson({
    user_id: user.id,
    profile_id,
    calculation_id: calculation.id,
    chart_version_id: chartVersionId,
    chart_version: nextChartVersion,
    input_hash,
    settings_hash: settingsHash,
    normalized,
    settings,
    engine: engineResult,
  })

  const { data: chartVersion, error: chartVersionError } = await service
    .from('chart_json_versions')
    .insert({
      id: chartVersionId,
      user_id: user.id,
      profile_id,
      calculation_id: calculation.id,
      chart_version: nextChartVersion,
      chart_json: chartJson,
      input_hash,
      settings_hash: settingsHash,
      engine_version: engineVersion,
      ephemeris_version: EPHEMERIS_VERSION,
      schema_version: SCHEMA_VERSION,
    })
    .select('id')
    .single()

  if (chartVersionError || !chartVersion) {
    await service
      .from('chart_calculations')
      .update({
        status: 'failed',
        error_code: 'CHART_VERSION_CREATE_FAILED',
        error_message: chartVersionError?.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', calculation.id)

    return NextResponse.json(
      {
        error: 'CHART_VERSION_CREATE_FAILED',
        detail: chartVersionError?.message,
      },
      { status: 500 },
    )
  }

  const predictionContext = buildPredictionContext(chartJson, 'general')

  const { data: predictionSummary, error: predictionSummaryError } = await service
    .from('prediction_ready_summaries')
    .insert({
      user_id: user.id,
      profile_id,
      chart_version_id: chartVersion.id,
      topic: 'general',
      prediction_context_version: '1.0.0',
      prediction_context: predictionContext,
    })
    .select('id')
    .single()

  if (predictionSummaryError || !predictionSummary) {
    await service
      .from('chart_calculations')
      .update({
        status: 'failed',
        error_code: 'PREDICTION_CONTEXT_CREATE_FAILED',
        error_message: predictionSummaryError?.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', calculation.id)

    return NextResponse.json(
      {
        error: 'PREDICTION_CONTEXT_CREATE_FAILED',
        detail: predictionSummaryError?.message,
      },
      { status: 500 },
    )
  }

  await service
    .from('chart_calculations')
    .update({
      status: 'completed',
      current_chart_version_id: chartVersion.id,
      completed_at: new Date().toISOString(),
    })
    .eq('id', calculation.id)

  await service.from('calculation_audit_logs').insert({
    user_id: user.id,
    profile_id,
    calculation_id: calculation.id,
    chart_version_id: chartVersion.id,
    event: 'chart_calculated',
    detail: {
      calculation_status: 'stub',
      engine_version: engineVersion,
      ephemeris_version: EPHEMERIS_VERSION,
      settings_hash: settingsHash,
      input_hash,
      warning_count: engineResult.warnings.length,
    },
  })

  return NextResponse.json({
    calculation_id: calculation.id,
    chart_version_id: chartVersion.id,
    prediction_context_id: predictionSummary.id,
    reused_cache: false,
    calculation_status: 'stub',
    warnings: engineResult.warnings,
  })
}
