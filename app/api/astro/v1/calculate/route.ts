/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calculateRequestSchema } from '@/lib/astro/schemas/calculate'
import { decryptJson } from '@/lib/astro/encryption'
import { normalizeBirthInput } from '@/lib/astro/normalize'
import { normalizeStoredBirthData } from '@/lib/astro/profile-birth-data'
import { normalizeBirthTimeForCalculation } from '@/lib/astro/calculations/time'
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
import { normalizeRuntimeClock, type AstroRuntimeClock } from '@/lib/astro/calculations/runtime-clock'
import {
  ASTRO_CALC_INTEGRATION_ENABLED,
  ASTRO_CALC_INTEGRATION_STRICT_MODE,
} from '@/lib/astro/config/feature-flags'
import {
  calculateRouteV2ResponsePayload,
  hasIgnoredClientContext,
  sanitizeCalculateBodyForDeterministicInput,
} from '@/lib/astro/calculate-route-v2'
import { persistCanonicalChartJsonV2 } from '@/lib/astro/chart-json-persistence'
import { loadCurrentAstroChartForUser } from '@/lib/astro/current-chart-version'
import { assertCanonicalChartJsonV2 } from '@/lib/astro/chart-json-v2'

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
  chartJson: ChartJson
  predictionSummary: Record<string, unknown> | null
  runtimeEngineVersion: string
  runtimeEphemerisVersion: string
  schemaVersion: string
}): Promise<{ chartVersionId: string; chartVersion: number }> {
  const auditPayload = {
    engine_version: args.runtimeEngineVersion,
    ephemeris_version: args.runtimeEphemerisVersion,
    schema_version: args.schemaVersion,
    prediction_summary_present: Boolean(args.predictionSummary),
  }

  return persistCanonicalChartJsonV2({
    supabase: args.service as never,
    userId: args.userId,
    profileId: args.profileId,
    calculationId: args.calcId,
    chartJson: args.chartJson as never,
    predictionSummary: args.predictionSummary,
    inputHash: args.inputHash,
    settingsHash: args.settingsHash,
    engineVersion: args.runtimeEngineVersion,
    auditPayload,
  })
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

function classifyPersistFailure(errorText: string): { stage: string; code: string } {
  if (errorText.startsWith('persist_and_promote_current_chart_version_failed')) {
    return { stage: 'persist_and_promote_current_chart_version', code: 'chart_version_save_failed' }
  }
  return { stage: 'persist_and_promote_current_chart_version', code: 'chart_version_save_failed' }
}

function buildPersistFailureDiagnostic(args: {
  errorText: string
  stage: string
  code: string
  hasUser: boolean
  hasProfile: boolean
  hasInputHash: boolean
  hasSettingsHash: boolean
  calcIdPresent: boolean
  profileIdPresent: boolean
  userIdPresent: boolean
  chartVersion: number
  chartJsonHasMetadata: boolean
  outputStatus: unknown
}) {
  return {
    error: args.code,
    stage: args.stage,
    message: args.errorText,
    diagnostic: {
      hasUser: args.hasUser,
      hasProfile: args.hasProfile,
      hasInputHash: args.hasInputHash,
      hasSettingsHash: args.hasSettingsHash,
      calcIdPresent: args.calcIdPresent,
      profileIdPresent: args.profileIdPresent,
      userIdPresent: args.userIdPresent,
      chartVersion: args.chartVersion,
      chartVersionType: typeof args.chartVersion,
      chartJsonHasMetadata: args.chartJsonHasMetadata,
      outputStatus: typeof args.outputStatus === 'string' ? args.outputStatus : null,
    },
  }
}

function buildRequestRuntimeClock(body: unknown): AstroRuntimeClock {
  const allowClientClock =
    process.env.NODE_ENV !== 'production' ||
    process.env.ASTRO_ALLOW_CLIENT_RUNTIME_CLOCK === 'true'

  const objectBody = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const runtimeClockBody = objectBody.runtimeClock && typeof objectBody.runtimeClock === 'object'
    ? objectBody.runtimeClock as Record<string, unknown>
    : {}
  const runtimeClockSnake = objectBody.runtime_clock && typeof objectBody.runtime_clock === 'object'
    ? objectBody.runtime_clock as Record<string, unknown>
    : {}

  return normalizeRuntimeClock({
    currentUtc: allowClientClock && typeof runtimeClockBody.currentUtc === 'string'
      ? runtimeClockBody.currentUtc
      : allowClientClock && typeof runtimeClockSnake.current_utc === 'string'
        ? runtimeClockSnake.current_utc
        : undefined,
    asOfDate: allowClientClock && typeof runtimeClockBody.asOfDate === 'string'
      ? runtimeClockBody.asOfDate
      : allowClientClock && typeof runtimeClockSnake.as_of_date === 'string'
        ? runtimeClockSnake.as_of_date
        : undefined,
  })
}

function buildInsertFailureDiagnostic(args: {
  calcErr: { code?: unknown; message?: unknown; details?: unknown; hint?: unknown } | null | undefined
  hasUser: boolean
  hasProfile: boolean
  hasInputHash: boolean
  hasSettingsHash: boolean
  engineVersion: string
  ephemerisVersion: string
  schemaVersion: string
  forceRecalc: boolean
  status: string
}) {
  const engineVersion = args.engineVersion ?? ''
  const ephemerisVersion = args.ephemerisVersion ?? ''
  const schemaVersion = args.schemaVersion ?? ''
  const forceRecalc = args.forceRecalc
  const status = args.status ?? ''

  return {
    error: 'calc_insert_failed',
    stage: 'calc_insert',
    code: typeof args.calcErr?.code === 'string' ? args.calcErr.code : null,
    message: typeof args.calcErr?.message === 'string' ? args.calcErr.message : null,
    details: typeof args.calcErr?.details === 'string' ? args.calcErr.details : null,
    hint: typeof args.calcErr?.hint === 'string' ? args.calcErr.hint : null,
    diagnostic: {
      hasUser: args.hasUser,
      hasProfile: args.hasProfile,
      hasInputHash: args.hasInputHash,
      hasSettingsHash: args.hasSettingsHash,
      engineVersion,
      engineVersionType: typeof engineVersion,
      engineVersionIsNull: engineVersion === null,
      ephemerisVersion,
      ephemerisVersionType: typeof ephemerisVersion,
      ephemerisVersionIsNull: ephemerisVersion === null,
      schemaVersion,
      schemaVersionType: typeof schemaVersion,
      schemaVersionIsNull: schemaVersion === null,
      forceRecalc,
      forceRecalcType: typeof forceRecalc,
      forceRecalcIsNull: forceRecalc === null,
      status,
      statusType: typeof status,
      statusIsNull: status === null,
    },
  }
}

function birthTimeValidationMessage(status: string): string {
  switch (status) {
    case 'invalid_timezone':
      return 'The selected timezone is invalid. Please choose a valid IANA timezone.'
    case 'nonexistent_local_time':
      return 'This local birth time did not exist in the selected timezone because of a daylight-saving transition. Please verify the time.'
    case 'ambiguous_local_time':
      return 'This local birth time is ambiguous in the selected timezone because of a daylight-saving transition. Please provide a disambiguated time.'
    case 'missing_timezone':
      return 'Timezone is required for astrology calculations.'
    case 'missing_birth_time':
      return 'Birth time is required for exact Lagna, houses, and dasha calculations.'
    default:
      return 'The provided birth time could not be used for calculation.'
  }
}

function buildBirthTimeValidationResponse(validation: {
  status: string
  dstStatus?: string
  timezone: string | null
  localDate: string
  localTime: string | null
}) {
  return NextResponse.json(
    {
      error: validation.status,
      code: validation.status,
      message: birthTimeValidationMessage(validation.status),
      birth_time_validation: {
        status: validation.status,
        dstStatus: validation.dstStatus,
        timezone: validation.timezone,
        localDate: validation.localDate,
        localTime: validation.localTime,
      },
    },
    { status: 400 },
  )
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
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_input', issues: [{ message: 'Invalid JSON body.' }] }, { status: 400 })
  }

  if (ASTRO_CALC_INTEGRATION_ENABLED) {
    const birthInput = sanitizeCalculateBodyForDeterministicInput(body as Record<string, unknown>)
    if (!birthInput.date_local) {
      return NextResponse.json({ ok: false, success: false, error: 'invalid_input', reason: 'date_local is required.' }, { status: 400 })
    }

    try {
      const payload = await calculateRouteV2ResponsePayload({
        birthInput,
        ignoredClientContext: hasIgnoredClientContext(body as Record<string, unknown>),
      })

      const chartJsonV2 = assertCanonicalChartJsonV2(
        (payload.chart_json_v2 ?? payload.chartJsonV2) as Record<string, unknown>,
      )
      const chartJsonToPersist = {
        ...chartJsonV2,
        metadata: {
          ...chartJsonV2.metadata,
        },
      }
      delete chartJsonToPersist.metadata.chartVersionId
      delete chartJsonToPersist.metadata.chartVersion

      const service = createServiceClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ ok: false, success: false, error: 'unauthenticated' }, { status: 401 })
      }

      const { data: profile } = await service
        .from('birth_profiles')
        .select('id, user_id, current_chart_version_id, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (!profile || !profile.id) {
        return NextResponse.json({ ok: false, success: false, error: 'profile_not_found' }, { status: 404 })
      }

      const { data: calc } = await service
        .from('chart_calculations')
        .insert({
          user_id: user.id,
          profile_id: profile.id,
          status: 'running',
          input_hash: payload?.meta && typeof payload.meta === 'object' ? (payload.meta as Record<string, unknown>).inputHash ?? null : null,
          settings_hash: payload?.meta && typeof payload.meta === 'object' ? (payload.meta as Record<string, unknown>).settingsHash ?? null : null,
          engine_version: payload?.meta && typeof payload.meta === 'object' ? (payload.meta as Record<string, unknown>).engineVersion ?? null : null,
          ephemeris_version: getRuntimeEphemerisVersion(),
          schema_version: SCHEMA_VERSION,
          force_recalc: false,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (!calc || !(calc as Record<string, unknown>).id) {
        return NextResponse.json({ ok: false, success: false, error: 'calc_insert_failed' }, { status: 500 })
      }

      const persistedChart = await persistCalculatedOutput({
        service,
        userId: user.id,
        profileId: String(profile.id),
        calcId: String((calc as Record<string, unknown>).id),
        inputHash: typeof (payload?.meta as Record<string, unknown> | undefined)?.inputHash === 'string'
          ? String((payload.meta as Record<string, unknown>).inputHash)
          : '',
        settingsHash: typeof (payload?.meta as Record<string, unknown> | undefined)?.settingsHash === 'string'
          ? String((payload.meta as Record<string, unknown>).settingsHash)
          : '',
        chartJson: chartJsonToPersist as never,
        predictionSummary: null,
        runtimeEngineVersion: typeof (payload?.meta as Record<string, unknown> | undefined)?.engineVersion === 'string'
          ? String((payload.meta as Record<string, unknown>).engineVersion)
          : getRuntimeEngineVersion(),
        runtimeEphemerisVersion: getRuntimeEphemerisVersion(),
        schemaVersion: SCHEMA_VERSION,
      })

      const currentChart = await loadCurrentAstroChartForUser({
        service,
        userId: user.id,
        options: { mode: 'strict_user_runtime' },
      })

      if (!currentChart.ok) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            error: currentChart.error,
            message: currentChart.message,
            status: currentChart.status,
          },
          { status: currentChart.status },
        )
      }

      const currentChartJson = assertCanonicalChartJsonV2(currentChart.chartVersion.chart_json)
      if (currentChart.chartVersion.id !== persistedChart.chartVersionId) {
        return NextResponse.json(
          { ok: false, success: false, error: 'strict_current_chart_reload_mismatch' },
          { status: 500 },
        )
      }

      return NextResponse.json({
        ...payload,
        chartVersionId: persistedChart.chartVersionId,
        chartVersion: persistedChart.chartVersion,
        chart_json_v2: currentChartJson,
        chartJsonV2: currentChartJson,
        meta: {
          ...(payload.meta as Record<string, unknown> | undefined),
          persisted: true,
          currentChartPromoted: true,
        },
      })
    } catch (error) {
      if (ASTRO_CALC_INTEGRATION_STRICT_MODE) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            error: 'Deterministic calculation failed.',
            reason: error instanceof Error ? error.message : 'unknown_error',
            meta: {
              calcIntegrationEnabled: true,
              strictMode: true,
              persisted: false,
              currentChartPromoted: false,
            },
          },
          { status: 422 },
        )
      }

      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: 'Deterministic calculation unavailable in non-strict compatibility mode.',
          reason: error instanceof Error ? error.message : 'unknown_error',
          meta: {
            calcIntegrationEnabled: true,
            strictMode: false,
            persisted: false,
            currentChartPromoted: false,
          },
        },
        { status: 202 },
      )
    }
  }
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

  const birthTimeValidation = normalizeBirthTimeForCalculation({
    dateOfBirth: decryptedInput.birth_date,
    timeOfBirth: decryptedInput.birth_time ?? null,
    timezone: decryptedInput.timezone,
    birthTimeKnown: decryptedInput.birth_time_known,
  })
  if (birthTimeValidation.status !== 'valid' && birthTimeValidation.status !== 'missing_birth_time') {
    logCalculationFailure('validate_birth_time', birthTimeValidation.status, {
      hasUser: true,
      hasProfile: true,
      hasSettings: true,
      hasEncryptedBirthData: Boolean(profile.encrypted_birth_data),
    })
    return buildBirthTimeValidationResponse(birthTimeValidation)
  }
  if (birthTimeValidation.status === 'missing_birth_time') {
    logCalculationFailure('validate_birth_time', birthTimeValidation.status, {
      hasUser: true,
      hasProfile: true,
      hasSettings: true,
      hasEncryptedBirthData: Boolean(profile.encrypted_birth_data),
    })
    return buildBirthTimeValidationResponse(birthTimeValidation)
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
  const runtimeClock = buildRequestRuntimeClock(body)

  const runtime = {
    user_id: user.id,
    profile_id: profileId,
    current_utc: runtimeClock.currentUtc,
    production: process.env.NODE_ENV === 'production',
  }

  let remoteOutput: MasterAstroCalculationOutput | null = null
  if (isRemoteAstroEngineConfigured()) {
    remoteOutput = await calculateMasterAstroOutputRemote({
      input: decryptedInput,
      normalized,
      settings: settingsForHash,
      runtime,
      runtimeClock,
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
      // Verify the cached chart version is still current and matches the profile pointer.
      const { data: profilePointer } = await service
        .from('birth_profiles')
        .select('current_chart_version_id')
        .eq('id', profileId)
        .eq('user_id', user.id)
        .maybeSingle()

      const pointerMatchesCached = profilePointer?.current_chart_version_id === cached.current_chart_version_id

      if (pointerMatchesCached) {
        const { data: cachedChartRow } = await service
          .from('chart_json_versions')
          .select('chart_json')
          .eq('id', cached.current_chart_version_id)
          .eq('is_current', true)
          .eq('status', 'completed')
          .maybeSingle()

        if (cachedChartRow?.chart_json) {
          const cachedChart = cachedChartRow.chart_json as Record<string, unknown>
          const cachedEngineOutput = (cachedChart.astronomical_data && typeof cachedChart.astronomical_data === 'object')
            ? (cachedChart.astronomical_data as Record<string, unknown>)
            : cachedChart
          const mergedCachedChart = mergeAvailableJyotishSectionsIntoChartJson(cachedChart, cachedEngineOutput)
          return NextResponse.json(mergedCachedChart)
        }
      }

      // Cache hit exists but profile pointer is stale — promote the cached chart atomically.
      if (!pointerMatchesCached && cached.current_chart_version_id) {
        const { error: promoteErr } = await service.rpc('promote_current_chart_version', {
          p_user_id: user.id,
          p_profile_id: profileId,
          p_calc_id: cached.id,
          p_chart_version_id: cached.current_chart_version_id,
          p_input_hash: inputHash,
        })
        if (!promoteErr) {
          const { data: promotedChartRow } = await service
            .from('chart_json_versions')
            .select('chart_json')
            .eq('id', cached.current_chart_version_id)
            .maybeSingle()
          if (promotedChartRow?.chart_json) {
            const cachedChart = promotedChartRow.chart_json as Record<string, unknown>
            const cachedEngineOutput = (cachedChart.astronomical_data && typeof cachedChart.astronomical_data === 'object')
              ? (cachedChart.astronomical_data as Record<string, unknown>)
              : cachedChart
            const mergedCachedChart = mergeAvailableJyotishSectionsIntoChartJson(cachedChart, cachedEngineOutput)
            return NextResponse.json(mergedCachedChart)
          }
        }
        // Promotion failed — fall through to recalculation
      }
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
    const hasUser = Boolean(user?.id)
    const hasProfile = Boolean(profileId)
    const hasInputHash = typeof inputHash === 'string' && inputHash.trim().length > 0
    const hasSettingsHash = typeof settingsHash === 'string' && settingsHash.trim().length > 0
    const engineVersion = getRuntimeEngineVersion()
    const ephemerisVersion = getRuntimeEphemerisVersion()
    const schemaVersion = SCHEMA_VERSION
    const forceRecalcValue = Boolean(force_recalc)
    const status = 'running'

    console.warn('[astro_chart_calculation_failed]', {
      stage: 'calc_insert',
      code: typeof calcErr?.code === 'string' ? calcErr.code : null,
      message: typeof calcErr?.message === 'string' ? calcErr.message : null,
      details: typeof calcErr?.details === 'string' ? calcErr.details : null,
      hint: typeof calcErr?.hint === 'string' ? calcErr.hint : null,
      hasUser,
      hasProfile,
      hasInputHash,
      hasSettingsHash,
      engineVersion,
      engineVersionType: typeof engineVersion,
      engineVersionIsNull: engineVersion === null,
      ephemerisVersion,
      ephemerisVersionType: typeof ephemerisVersion,
      ephemerisVersionIsNull: ephemerisVersion === null,
      schemaVersion,
      schemaVersionType: typeof schemaVersion,
      schemaVersionIsNull: schemaVersion === null,
      forceRecalc: forceRecalcValue,
      forceRecalcType: typeof forceRecalcValue,
      forceRecalcIsNull: forceRecalcValue === null,
      status,
      statusType: typeof status,
      statusIsNull: status === null,
    })

    if (process.env.ASTRO_CALCULATE_DEBUG === 'true') {
      return NextResponse.json(
        buildInsertFailureDiagnostic({
          calcErr,
          hasUser,
          hasProfile,
          hasInputHash,
          hasSettingsHash,
          engineVersion,
          ephemerisVersion,
          schemaVersion,
          forceRecalc: forceRecalcValue,
          status,
        }),
        { status: 500 },
      )
    }

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
        runtimeClock,
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

    const nextChartVersion = await getNextChartVersion({
      service,
      profileId,
    })
    const chartJson = buildProfileChartJsonFromMasterOutput({
      output,
      userId: user.id,
      profileId,
      calculationId: calc.id,
      chartVersionId: randomUUID(),
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
    const chartJsonV2 = assertCanonicalChartJsonV2(chartJson.chart_json_v2 ?? chartJson.chartJsonV2)
    const chartJsonToPersist = {
      ...chartJsonV2,
      metadata: {
        ...chartJsonV2.metadata,
      },
    }
    delete chartJsonToPersist.metadata.chartVersionId
    delete chartJsonToPersist.metadata.chartVersion
    const mergedChartJson = mergeAvailableJyotishSectionsIntoChartJson(
      chartJson as Record<string, unknown>,
      output as unknown as Record<string, unknown>,
    ) as ChartJson & Record<string, unknown>
    const mergedApiResponse = mergeAvailableJyotishSectionsIntoChartJson(
      { ...output } as Record<string, unknown>,
      output as unknown as Record<string, unknown>,
    ) as MasterAstroCalculationOutput & Record<string, unknown>

    let persistedChart: { chartVersionId: string; chartVersion: number }
    try {
      persistedChart = await persistCalculatedOutput({
        service,
        userId: user.id,
        profileId,
        calcId: calc.id,
        inputHash,
        settingsHash,
        chartJson: chartJsonToPersist as never,
        predictionSummary: (mergedChartJson.prediction_ready_summaries as Record<string, unknown>) ?? null,
        runtimeEngineVersion: getRuntimeEngineVersion(),
        runtimeEphemerisVersion: getRuntimeEphemerisVersion(),
        schemaVersion: SCHEMA_VERSION,
      })
    } catch (persistError) {
      const errorText = persistError instanceof Error ? persistError.message : 'unknown'
      const { stage, code } = classifyPersistFailure(errorText)
      const hasUser = Boolean(user?.id)
      const hasProfile = Boolean(profileId)
      const hasInputHash = typeof inputHash === 'string' && inputHash.trim().length > 0
      const hasSettingsHash = typeof settingsHash === 'string' && settingsHash.trim().length > 0
      const calcIdPresent = Boolean(calc?.id)
      const profileIdPresent = Boolean(profileId)
      const userIdPresent = Boolean(user?.id)
      const chartVersionValue = nextChartVersion
      const chartJsonHasMetadata = Boolean(mergedChartJson?.metadata)
      const outputStatus = output?.calculation_status

      console.warn('[astro_chart_calculation_failed]', {
        stage,
        code,
        message: errorText,
        hasUser,
        hasProfile,
        hasInputHash,
        hasSettingsHash,
        chartVersion: chartVersionValue,
        chartVersionType: typeof chartVersionValue,
        chartJsonHasMetadata,
        outputStatus,
        calcIdPresent,
        profileIdPresent,
        userIdPresent,
      })
      logCalculationFailure(stage, code, {
        hasUser,
        hasProfile,
        hasSettings: hasSettingsHash,
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
      if (process.env.ASTRO_CALCULATE_DEBUG === 'true') {
        return NextResponse.json(
          buildPersistFailureDiagnostic({
            errorText,
            stage,
            code,
            hasUser,
            hasProfile,
            hasInputHash,
            hasSettingsHash,
            calcIdPresent,
            profileIdPresent,
            userIdPresent,
            chartVersion: chartVersionValue,
            chartJsonHasMetadata,
            outputStatus,
          }),
          { status: 500 },
        )
      }
      return NextResponse.json({ error: code }, { status: 500 })
    }

    const currentChart = await loadCurrentAstroChartForUser({
      service,
      userId: user.id,
      options: { mode: 'strict_user_runtime' },
    })

    if (!currentChart.ok) {
      return NextResponse.json(
        {
          error: currentChart.error,
          message: currentChart.message,
          status: currentChart.status,
        },
        { status: currentChart.status },
      )
    }

    const currentChartJson = assertCanonicalChartJsonV2(currentChart.chartVersion.chart_json)
    if (currentChart.chartVersion.id !== persistedChart.chartVersionId) {
      return NextResponse.json(
        { error: 'strict_current_chart_reload_mismatch' },
        { status: 500 },
      )
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
      chart_version_id: persistedChart.chartVersionId,
      chart_version: persistedChart.chartVersion,
      chart_json_v2: currentChartJson,
      chartJsonV2: currentChartJson,
      reused_cache: false,
      meta: {
        ...(mergedApiResponse.meta as Record<string, unknown> | undefined),
        persisted: true,
        currentChartPromoted: true,
      },
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
        savedChartVersionId: persistedChart.chartVersionId,
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
