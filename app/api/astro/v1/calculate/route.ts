/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calculateRequestSchema } from '@/lib/astro/schemas/calculate'
import { decryptJson } from '@/lib/astro/encryption'
import { normalizeBirthInput } from '@/lib/astro/normalize'
import { normalizeStoredBirthData } from '@/lib/astro/profile-birth-data'
import { sha256Canonical } from '@/lib/astro/hashing'
import { getRuntimeEngineVersion, getRuntimeEphemerisVersion, SCHEMA_VERSION } from '@/lib/astro/engine/version'
import { astroV1ApiEnabled } from '@/lib/astro/feature-flags'
import { calculateMasterAstroOutputRemote } from '@/lib/astro/engine/remote'
import { isRemoteAstroEngineConfigured } from '@/lib/astro/engine/backend'
import type { BirthProfileInput, AstrologySettings } from '@/lib/astro/types'
import type { MasterAstroCalculationOutput } from '@/lib/astro/schemas/master'
import type { ChartJson } from '@/lib/astro/types'
import { buildProfileChartJsonFromMasterOutput } from '@/lib/astro/profile-chart-json-adapter'
import { mergeAvailableJyotishSectionsIntoChartJson } from '@/lib/astro/chart-json-persistence'
import { DEFAULT_SETTINGS, hashSettings } from '@/lib/astro/settings'
import { assertSameOriginRequest, checkRateLimit } from '@/lib/security/request-guards'

export const runtime = 'nodejs'
export const maxDuration = 60

async function getNextChartVersion(args: {
  service: Awaited<ReturnType<typeof createServiceClient>>
  profileId: string
}): Promise<number> {
  const { data, error } = await args.service
    .from('chart_json_versions')
    .select('chart_version')
    .eq('profile_id', args.profileId)
    .order('chart_version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`chart_version_lookup_failed: ${error.message}`)
  }

  const latest = typeof data?.chart_version === 'number' ? data.chart_version : 0

  return latest + 1
}

async function persistCalculatedOutput(args: {
  service: Awaited<ReturnType<typeof createServiceClient>>
  userId: string
  profileId: string
  calcId: string
  inputHash: string
  settingsHash: string
  chartVersion: number
  chartJson: ChartJson
  output: MasterAstroCalculationOutput
  runtimeEngineVersion: string
  runtimeEphemerisVersion: string
  schemaVersion: string
}) {
  const chartVersionId = args.chartJson.metadata.chart_version_id

  const { error: chartErr } = await args.service
    .from('chart_json_versions')
    .insert({
      id: chartVersionId,
      user_id: args.userId,
      profile_id: args.profileId,
      calculation_id: args.calcId,
      chart_version: args.chartVersion,
      input_hash: args.inputHash,
      settings_hash: args.settingsHash,
      engine_version: args.runtimeEngineVersion,
      ephemeris_version: args.runtimeEphemerisVersion,
      schema_version: args.schemaVersion,
      chart_json: args.chartJson,
    })
  if (chartErr) throw new Error(`chart_insert_failed: ${chartErr.message}`)

  const { error: predictionErr } = await args.service.from('prediction_ready_summaries').insert({
    user_id: args.userId,
    profile_id: args.profileId,
    chart_version_id: chartVersionId,
    topic: 'general',
    prediction_context: args.output.prediction_ready_context,
  })
  if (predictionErr) throw new Error(`prediction_insert_failed: ${predictionErr.message}`)

  const { error: calcCompleteErr } = await args.service
    .from('chart_calculations')
    .update({
      status: 'completed',
      current_chart_version_id: chartVersionId,
      completed_at: new Date().toISOString(),
    })
    .eq('id', args.calcId)
  if (calcCompleteErr) throw new Error(`calc_complete_failed: ${calcCompleteErr.message}`)

  const { error: auditErr } = await args.service.from('calculation_audit_logs').insert({
    user_id: args.userId,
    profile_id: args.profileId,
    calculation_id: args.calcId,
    chart_version_id: chartVersionId,
    event: 'calculation_completed',
    detail: { engine_version: args.runtimeEngineVersion, status: args.output.calculation_status },
  })
  if (auditErr) throw new Error(`audit_insert_failed: ${auditErr.message}`)

  return chartVersionId
}

function logCalculationFailure(stage: string, code: string, context: {
  hasUser: boolean
  hasProfile: boolean
  hasSettings: boolean
  hasEncryptedBirthData: boolean
}) {
  console.warn('[astro_chart_calculation_failed]', {
    stage,
    code,
    hasUser: context.hasUser,
    hasProfile: context.hasProfile,
    hasSettings: context.hasSettings,
    hasEncryptedBirthData: context.hasEncryptedBirthData,
  })
}

export async function POST(req: NextRequest) {
  if (!astroV1ApiEnabled()) {
    return NextResponse.json({ error: 'astro_v1_disabled' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  // CSRF/origin check — only relevant for authenticated requests
  const originCheck = assertSameOriginRequest(req as unknown as Request)
  if (!originCheck.ok) {
    return NextResponse.json({ error: originCheck.error }, { status: originCheck.status })
  }

  // Rate limit: 5 requests/hour per user
  const rl = checkRateLimit(`calculate:${user.id}`, 5, 60 * 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = calculateRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 })
  }

  const { profile_id: profileId, force_recalc } = parsed.data
  const service = createServiceClient()

  const { data: profile } = await service
    .from('birth_profiles')
    .select('id, user_id, encrypted_birth_data, pii_encryption_key_version, status')
    .eq('id', profileId)
    .eq('status', 'active')
    .maybeSingle()

  if (!profile) {
    logCalculationFailure('load_profile', 'profile_not_found', { hasUser: true, hasProfile: false, hasSettings: false, hasEncryptedBirthData: false })
    return NextResponse.json({ error: 'profile_not_found' }, { status: 404 })
  }
  if (!profile.encrypted_birth_data) {
    logCalculationFailure('load_profile', 'profile_birth_data_missing', { hasUser: true, hasProfile: true, hasSettings: false, hasEncryptedBirthData: false })
    return NextResponse.json({ error: 'profile_birth_data_missing' }, { status: 400 })
  }
  if (profile.user_id !== user.id) {
    logCalculationFailure('load_profile', 'profile_access_denied', { hasUser: true, hasProfile: true, hasSettings: false, hasEncryptedBirthData: Boolean(profile.encrypted_birth_data) })
    return NextResponse.json({ error: 'profile_access_denied' }, { status: 404 })
  }

  let { data: settings } = await service
    .from('astrology_settings')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!settings) {
    const { data: insertedSettings, error: settingsInsertError } = await service
      .from('astrology_settings')
      .insert({
        profile_id: profileId,
        user_id: user.id,
        ...DEFAULT_SETTINGS,
        settings_hash: hashSettings(DEFAULT_SETTINGS),
      })
      .select('*')
      .maybeSingle()
    if (settingsInsertError || !insertedSettings) {
      logCalculationFailure('load_settings', 'astrology_settings_missing', { hasUser: true, hasProfile: true, hasSettings: false, hasEncryptedBirthData: Boolean(profile.encrypted_birth_data) })
      return NextResponse.json({ error: 'astrology_settings_missing' }, { status: 400 })
    }
    settings = insertedSettings
  }

  let decryptedInput: BirthProfileInput
  try {
    decryptedInput = normalizeStoredBirthData(decryptJson<unknown>(profile.encrypted_birth_data))
  } catch {
    logCalculationFailure('decrypt_birth_data', 'profile_birth_data_invalid', { hasUser: true, hasProfile: true, hasSettings: true, hasEncryptedBirthData: Boolean(profile.encrypted_birth_data) })
    return NextResponse.json({ error: 'profile_birth_data_invalid' }, { status: 400 })
  }

  const normalized = normalizeBirthInput(decryptedInput)
  const inputHash = sha256Canonical({
    version: normalized.input_hash_material_version,
    date: normalized.birth_date_iso,
    time: normalized.birth_time_iso,
    tz: normalized.timezone,
    lat: normalized.latitude_rounded,
    lon: normalized.longitude_rounded,
  })

  const settingsForHash: AstrologySettings = {
    astrology_system: settings.astrology_system,
    zodiac_type: settings.zodiac_type,
    ayanamsa: settings.ayanamsa,
    house_system: settings.house_system,
    node_type: settings.node_type,
    dasha_year_basis: settings.dasha_year_basis,
  }
  const settingsHash = sha256Canonical(settingsForHash)

  const runtime = {
    user_id: user.id,
    profile_id: profileId,
    current_utc: new Date().toISOString(),
    production: process.env.NODE_ENV === 'production',
  }

  let remoteOutput: MasterAstroCalculationOutput | null = null
  if (isRemoteAstroEngineConfigured()) {
    remoteOutput = await calculateMasterAstroOutputRemote({
      input: decryptedInput,
      normalized,
      settings: settingsForHash,
      runtime,
    })

    if (remoteOutput.calculation_status === 'rejected') {
      return NextResponse.json(
        {
          ...remoteOutput,
          calculation_id: randomUUID(),
          reused_cache: false,
        },
        { status: 422 },
      )
    }
  }

  if (!force_recalc && !remoteOutput) {
    const { data: cached } = await service
      .from('chart_calculations')
      .select('id, current_chart_version_id')
      .eq('profile_id', profileId)
      .eq('input_hash', inputHash)
      .eq('settings_hash', settingsHash)
      .eq('engine_version', getRuntimeEngineVersion())
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cached?.current_chart_version_id) {
      const { data: latestChart } = await service
      .from('chart_json_versions')
      .select('chart_json')
      .eq('id', cached.current_chart_version_id)
      .maybeSingle()

      if (latestChart?.chart_json) {
        const cachedChart = latestChart.chart_json as Record<string, unknown>
        const cachedEngineOutput = (cachedChart.astronomical_data && typeof cachedChart.astronomical_data === 'object')
          ? (cachedChart.astronomical_data as Record<string, unknown>)
          : cachedChart
        const mergedCachedChart = mergeAvailableJyotishSectionsIntoChartJson(cachedChart, cachedEngineOutput)
        return NextResponse.json(mergedCachedChart)
      }

      return NextResponse.json({
        calculation_id: cached.id,
        chart_version_id: cached.current_chart_version_id,
        reused_cache: true,
        calculation_status: 'partial',
        schema_version: SCHEMA_VERSION,
        warnings: [],
      } satisfies Partial<MasterAstroCalculationOutput> & {
        calculation_id: string
        chart_version_id: string
        reused_cache: true
      })
    }
  }

  const { data: calc, error: calcErr } = await service
    .from('chart_calculations')
    .insert({
      user_id: user.id,
      profile_id: profileId,
      status: 'running',
      input_hash: inputHash,
      settings_hash: settingsHash,
      engine_version: getRuntimeEngineVersion(),
      ephemeris_version: getRuntimeEphemerisVersion(),
      schema_version: SCHEMA_VERSION,
      force_recalc,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (calcErr || !calc) {
    return NextResponse.json({ error: 'calc_insert_failed' }, { status: 500 })
  }

  try {
    const output = remoteOutput ?? await (async () => {
      const { calculateMasterAstroOutput } = await import('@/lib/astro/calculations/master')
      return calculateMasterAstroOutput({
        input: decryptedInput,
        normalized,
        settings: settingsForHash,
        runtime,
      })
    })()

    if (output.calculation_status === 'rejected') {
      await service
        .from('chart_calculations')
        .update({
          status: 'failed',
          error_message: output.rejection_reason ?? 'calculation_rejected',
          completed_at: new Date().toISOString(),
        })
        .eq('id', calc.id)

      await service.from('calculation_audit_logs').insert({
        user_id: user.id,
        profile_id: profileId,
        calculation_id: calc.id,
        event: 'calculation_rejected',
        detail: { engine_version: getRuntimeEngineVersion(), status: output.calculation_status },
      })

      return NextResponse.json(
        {
          ...output,
          calculation_id: calc.id,
          reused_cache: false,
        },
        { status: 422 },
      )
  }

    const chartVersionId = randomUUID()
    const nextChartVersion = await getNextChartVersion({
      service,
      profileId,
    })
    const chartJson = buildProfileChartJsonFromMasterOutput({
      output,
      userId: user.id,
      profileId,
      calculationId: calc.id,
      chartVersionId,
      chartVersion: nextChartVersion,
      inputHash,
      settingsHash,
      settingsForHash,
      normalized: {
        birth_date_iso: normalized.birth_date_iso,
        birth_time_known: normalized.birth_time_known,
        birth_time_precision: normalized.birth_time_precision,
        timezone: normalized.timezone,
        timezone_status: normalized.timezone_status,
        coordinate_confidence: normalized.coordinate_confidence,
      },
      engineVersion: getRuntimeEngineVersion(),
      ephemerisVersion: getRuntimeEphemerisVersion(),
      schemaVersion: SCHEMA_VERSION,
    })
    const mergedChartJson = mergeAvailableJyotishSectionsIntoChartJson(
      chartJson as Record<string, unknown>,
      output as unknown as Record<string, unknown>,
    ) as ChartJson & Record<string, unknown>
    const mergedApiResponse = mergeAvailableJyotishSectionsIntoChartJson(
      { ...output } as Record<string, unknown>,
      output as unknown as Record<string, unknown>,
    ) as MasterAstroCalculationOutput & Record<string, unknown>

    let persistedChartVersionId: string
    try {
      persistedChartVersionId = await persistCalculatedOutput({
        service,
        userId: user.id,
        profileId,
        calcId: calc.id,
        inputHash,
        settingsHash,
        chartVersion: nextChartVersion,
        chartJson: mergedChartJson,
        output,
        runtimeEngineVersion: getRuntimeEngineVersion(),
        runtimeEphemerisVersion: getRuntimeEphemerisVersion(),
        schemaVersion: SCHEMA_VERSION,
      })
    } catch (persistError) {
      const errorText = persistError instanceof Error ? persistError.message : 'unknown'
      const code = errorText.startsWith('prediction_insert_failed') ? 'prediction_summary_save_failed' : 'chart_version_save_failed'
      logCalculationFailure('persist_chart', code, {
        hasUser: true,
        hasProfile: true,
        hasSettings: true,
        hasEncryptedBirthData: true,
      })
      await service
        .from('chart_calculations')
        .update({
          status: 'failed',
          error_message: errorText,
          completed_at: new Date().toISOString(),
        })
        .eq('id', calc.id)
      return NextResponse.json({ error: code }, { status: 500 })
    }

    if (process.env.NODE_ENV !== 'production') {
      const rawAstronomicalData = mergedChartJson.astronomical_data && typeof mergedChartJson.astronomical_data === 'object'
        ? mergedChartJson.astronomical_data as Record<string, unknown>
        : {}
      console.log('[astro-calculate-debug]', {
        chartSchema: mergedChartJson.metadata.schema_version,
        engineVersion: mergedChartJson.metadata.engine_version,
        rootKeys: Object.keys(mergedChartJson),
        expandedKeys: Object.keys(mergedChartJson.expanded_sections ?? {}),
        astronomicalKeys: Object.keys(rawAstronomicalData),
        hasRootPlanets: !!mergedChartJson.planets,
        hasRootLagna: !!mergedChartJson.lagna,
        hasRootHouses: !!mergedChartJson.houses,
        hasRootD1: !!mergedChartJson.d1_chart,
        hasRawDailyTransits: !!rawAstronomicalData.daily_transits,
        hasRawPanchang: !!rawAstronomicalData.panchang,
        hasRawNavamsa: !!rawAstronomicalData.navamsa_d9,
        hasRawAspects: !!rawAstronomicalData.planetary_aspects_drishti,
        hasRawLifeAreas: !!rawAstronomicalData.life_area_signatures,
        hasRawVimshottari: !!rawAstronomicalData.vimshottari_dasha,
        hasTopLevelPanchang: !!mergedChartJson.panchang,
        hasTopLevelVimshottari: !!mergedChartJson.vimshottari_dasha,
        hasTopLevelNavamsa: !!mergedChartJson.navamsa_d9,
        hasTopLevelAshtakvarga: !!mergedChartJson.ashtakvarga,
        dailyStatus: mergedChartJson.expanded_sections?.daily_transits?.status,
        panchangStatus: mergedChartJson.expanded_sections?.panchang?.status,
        currentTimingStatus: mergedChartJson.expanded_sections?.current_timing?.status,
        navamsaStatus: mergedChartJson.expanded_sections?.navamsa_d9?.status,
        aspectsStatus: mergedChartJson.expanded_sections?.planetary_aspects?.status ?? mergedChartJson.expanded_sections?.basic_aspects?.status,
        lifeAreasStatus: mergedChartJson.expanded_sections?.life_area_signatures?.status,
      })
    }

    const responsePayload: Record<string, unknown> = {
      ...mergedApiResponse,
      calculation_id: calc.id,
      chart_version_id: persistedChartVersionId,
      reused_cache: false,
    }

    if (process.env.NODE_ENV !== 'production') {
      responsePayload.debug_saved_chart_json = {
        hasExpandedSections: !!mergedChartJson.expanded_sections,
        dailyStatus: mergedChartJson.expanded_sections?.daily_transits?.status ?? null,
        panchangStatus: mergedChartJson.expanded_sections?.panchang?.status ?? null,
        currentTimingStatus: mergedChartJson.expanded_sections?.current_timing?.status ?? null,
        hasTopLevelPanchang: !!mergedChartJson.panchang,
        hasTopLevelVimshottari: !!mergedChartJson.vimshottari_dasha,
        hasTopLevelNavamsa: !!mergedChartJson.navamsa_d9,
        hasTopLevelAshtakvarga: !!mergedChartJson.ashtakvarga,
        hasMasterDailyTransits: !!output.daily_transits,
        hasMasterPanchang: !!output.panchang,
        hasMasterVimshottari: !!output.vimshottari_dasha,
        savedChartVersionId: persistedChartVersionId,
      }
    }

    return NextResponse.json(responsePayload)
  } catch (error) {
    logCalculationFailure('engine_or_persist', 'chart_engine_failed', {
      hasUser: true,
      hasProfile: true,
      hasSettings: true,
      hasEncryptedBirthData: true,
    })
    await service
      .from('chart_calculations')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'unknown',
        completed_at: new Date().toISOString(),
      })
      .eq('id', calc.id)
    return NextResponse.json(
      {
        schema_version: SCHEMA_VERSION,
        calculation_status: 'rejected',
        rejection_reason: error instanceof Error ? error.message : 'unknown',
        error: 'chart_engine_failed',
      } satisfies Partial<MasterAstroCalculationOutput>,
      { status: 500 },
    )
  }
}
