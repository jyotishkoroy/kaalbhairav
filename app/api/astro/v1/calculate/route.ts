import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calculateRequestSchema } from '@/lib/astro/schemas/calculate'
import { decryptJson } from '@/lib/astro/encryption'
import { normalizeBirthInput } from '@/lib/astro/normalize'
import { sha256Canonical } from '@/lib/astro/hashing'
import { getRuntimeEngineVersion, getRuntimeEphemerisVersion, SCHEMA_VERSION } from '@/lib/astro/engine/version'
import { astroV1ApiEnabled } from '@/lib/astro/feature-flags'
import { calculateMasterAstroOutputRemote } from '@/lib/astro/engine/remote'
import { isRemoteAstroEngineConfigured } from '@/lib/astro/engine/backend'
import type { BirthProfileInput, AstrologySettings } from '@/lib/astro/types'
import type { MasterAstroCalculationOutput } from '@/lib/astro/schemas/master'
import { buildProfileChartJsonFromMasterOutput } from '@/lib/astro/profile-chart-json-adapter'

export const runtime = 'nodejs'
export const maxDuration = 60

async function persistCalculatedOutput(args: {
  service: Awaited<ReturnType<typeof createServiceClient>>
  userId: string
  profileId: string
  calcId: string
  inputHash: string
  settingsHash: string
  chartJson: ReturnType<typeof buildProfileChartJsonFromMasterOutput>
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
      chart_version: 1,
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

export async function POST(req: NextRequest) {
  if (!astroV1ApiEnabled()) {
    return NextResponse.json({ error: 'astro_v1_disabled' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = calculateRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 })
  }

  const { profile_id, force_recalc } = parsed.data
  const service = createServiceClient()

  const { data: profile } = await service
    .from('birth_profiles')
    .select('id, user_id, encrypted_birth_data, pii_encryption_key_version')
    .eq('id', profile_id)
    .single()

  if (!profile) return NextResponse.json({ error: 'profile_not_found' }, { status: 404 })
  if (profile.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data: settings } = await service
    .from('astrology_settings')
    .select('*')
    .eq('profile_id', profile_id)
    .single()

  if (!settings) return NextResponse.json({ error: 'settings_not_found' }, { status: 400 })

  let decryptedInput: BirthProfileInput
  try {
    decryptedInput = decryptJson<BirthProfileInput>(profile.encrypted_birth_data)
  } catch {
    return NextResponse.json({ error: 'decrypt_failed' }, { status: 500 })
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
    profile_id,
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
      .eq('profile_id', profile_id)
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
        const cachedChart = latestChart.chart_json as { astronomical_data?: unknown } & Record<string, unknown>
        return NextResponse.json(cachedChart.astronomical_data ?? cachedChart)
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
      profile_id,
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
        profile_id,
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
    const chartJson = buildProfileChartJsonFromMasterOutput({
      output,
      userId: user.id,
      profileId: profile_id,
      calculationId: calc.id,
      chartVersionId,
      chartVersion: 1,
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
    const persistedChartVersionId = await persistCalculatedOutput({
      service,
      userId: user.id,
      profileId: profile_id,
      calcId: calc.id,
      inputHash,
      settingsHash,
      chartJson,
      output,
      runtimeEngineVersion: getRuntimeEngineVersion(),
      runtimeEphemerisVersion: getRuntimeEphemerisVersion(),
      schemaVersion: SCHEMA_VERSION,
    })

    return NextResponse.json({
      ...output,
      calculation_id: calc.id,
      chart_version_id: persistedChartVersionId,
      reused_cache: false,
      debug_saved_chart_json: {
        hasExpandedSections: !!chartJson.expanded_sections,
        dailyStatus: chartJson.expanded_sections?.daily_transits?.status ?? null,
        panchangStatus: chartJson.expanded_sections?.panchang?.status ?? null,
        currentTimingStatus: chartJson.expanded_sections?.current_timing?.status ?? null,
        hasMasterDailyTransits: !!output.daily_transits,
        hasMasterPanchang: !!output.panchang,
        hasMasterVimshottari: !!output.vimshottari_dasha,
        savedChartVersionId: persistedChartVersionId,
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[astro-v1-calculate-error]', error)
    }
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
      } satisfies Partial<MasterAstroCalculationOutput>,
      { status: 500 },
    )
  }
}
