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

export const runtime = 'nodejs'
export const maxDuration = 60

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

  if (isRemoteAstroEngineConfigured()) {
    const output = await calculateMasterAstroOutputRemote({
      input: decryptedInput,
      normalized,
      settings: settingsForHash,
      runtime,
    })

    if (output.calculation_status === 'rejected') {
      return NextResponse.json(
        {
          ...output,
          calculation_id: randomUUID(),
          reused_cache: false,
        },
        { status: 422 },
      )
    }

    return NextResponse.json({
      ...output,
      calculation_id: randomUUID(),
      reused_cache: false,
    })
  }

  if (!force_recalc) {
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
    const { calculateMasterAstroOutput } = await import('@/lib/astro/calculations/master')
    const output = await calculateMasterAstroOutput({
      input: decryptedInput,
      normalized,
      settings: settingsForHash,
      runtime,
    })

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
    const chartJson = {
      metadata: {
        user_id: user.id,
        profile_id,
        calculation_id: calc.id,
        chart_version_id: chartVersionId,
        input_hash: inputHash,
        settings_hash: settingsHash,
        engine_version: getRuntimeEngineVersion(),
        ephemeris_version: getRuntimeEphemerisVersion(),
        schema_version: SCHEMA_VERSION,
        chart_version: 1,
        computed_at: new Date().toISOString(),
        calculation_status: output.calculation_status,
      },
      normalized_input: {
        birth_date_iso: normalized.birth_date_iso,
        birth_time_known: normalized.birth_time_known,
        birth_time_precision: normalized.birth_time_precision,
        timezone: normalized.timezone,
        timezone_status: normalized.timezone_status,
        coordinate_confidence: normalized.coordinate_confidence,
      },
      calculation_settings: settingsForHash,
      astronomical_data: output,
      prediction_ready_summaries: output.prediction_ready_context,
      confidence_and_warnings: {
        confidence: { overall: output.confidence },
        warnings: output.warnings,
      },
      audit: {
        sources: [String((output as { external_engine_metadata?: { ephemeris_engine?: string } }).external_engine_metadata?.ephemeris_engine ?? 'swiss_ephemeris')],
        engine_modules: ['master_calculator'],
        notes: [],
      },
    }

    const { error: chartErr } = await service
      .from('chart_json_versions')
      .insert({
        id: chartVersionId,
        user_id: user.id,
        profile_id,
        calculation_id: calc.id,
        chart_version: 1,
        input_hash: inputHash,
        settings_hash: settingsHash,
        engine_version: getRuntimeEngineVersion(),
        ephemeris_version: getRuntimeEphemerisVersion(),
        schema_version: SCHEMA_VERSION,
        chart_json: chartJson,
      })

    if (chartErr) throw new Error('chart_insert_failed')

    await service.from('prediction_ready_summaries').insert({
      user_id: user.id,
      profile_id,
      chart_version_id: chartVersionId,
      topic: 'general',
      prediction_context: output.prediction_ready_context,
    })

    await service
      .from('chart_calculations')
      .update({
        status: 'completed',
        current_chart_version_id: chartVersionId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', calc.id)

    await service.from('calculation_audit_logs').insert({
      user_id: user.id,
      profile_id,
      calculation_id: calc.id,
      chart_version_id: chartVersionId,
      event: 'calculation_completed',
      detail: { engine_version: getRuntimeEngineVersion(), status: output.calculation_status },
    })

    return NextResponse.json({
      ...output,
      calculation_id: calc.id,
      chart_version_id: chartVersionId,
      reused_cache: false,
    })
  } catch (error) {
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
      { status: 422 },
    )
  }
}
