import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calculateRequestSchema } from '@/lib/astro/schemas/calculate'
import { decryptJson } from '@/lib/astro/encryption'
import { normalizeBirthInput } from '@/lib/astro/normalize'
import { sha256Canonical } from '@/lib/astro/hashing'
import { runEngine } from '@/lib/astro/engine'
import { getRuntimeEngineVersion, getRuntimeEphemerisVersion, SCHEMA_VERSION } from '@/lib/astro/engine/version'
import { buildChartJson } from '@/lib/astro/chart-json'
import { buildPredictionContext } from '@/lib/astro/prediction-context'
import { astroV1ApiEnabled } from '@/lib/astro/feature-flags'
import type { BirthProfileInput, AstrologySettings } from '@/lib/astro/types'

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
  if (profile.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { data: settings } = await service
    .from('astrology_settings')
    .select('*')
    .eq('profile_id', profile_id)
    .single()

  if (!settings) return NextResponse.json({ error: 'settings_not_found' }, { status: 400 })

  let decryptedInput: BirthProfileInput
  try {
    decryptedInput = decryptJson<BirthProfileInput>(profile.encrypted_birth_data)
  } catch (e) {
    console.error('decrypt_failed')
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
      return NextResponse.json({
        calculation_id: cached.id,
        chart_version_id: cached.current_chart_version_id,
        reused_cache: true,
        calculation_status: process.env.ASTRO_ENGINE_MODE === 'real' ? 'real' : 'stub',
        warnings: [],
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
    const engineResult = runEngine(normalized, settingsForHash)
    const newChartId = randomUUID()
    const finalChartJson = buildChartJson({
      user_id: user.id,
      profile_id,
      calculation_id: calc.id,
      chart_version_id: newChartId,
      chart_version: 1,
      input_hash: inputHash,
      settings_hash: settingsHash,
      normalized,
      settings: settingsForHash,
      engine: engineResult,
    })

    const { error: chartErr } = await service
      .from('chart_json_versions')
      .insert({
        id: newChartId,
        user_id: user.id,
        profile_id,
        calculation_id: calc.id,
        chart_version: 1,
        input_hash: inputHash,
        settings_hash: settingsHash,
        engine_version: getRuntimeEngineVersion(),
        ephemeris_version: getRuntimeEphemerisVersion(),
        schema_version: SCHEMA_VERSION,
        chart_json: finalChartJson,
      })

    if (chartErr) throw new Error('chart_insert_failed')

    const ctx = buildPredictionContext(finalChartJson, 'general')
    await service.from('prediction_ready_summaries').insert({
      user_id: user.id,
      profile_id,
      chart_version_id: newChartId,
      topic: 'general',
      prediction_context: ctx,
    })

    await service
      .from('chart_calculations')
      .update({
        status: 'completed',
        current_chart_version_id: newChartId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', calc.id)

    await service.from('calculation_audit_logs').insert({
      user_id: user.id,
      profile_id,
      calculation_id: calc.id,
      chart_version_id: newChartId,
      event: 'calculation_completed',
      detail: { engine_version: getRuntimeEngineVersion(), status: engineResult.calculation_status },
    })

    return NextResponse.json({
      calculation_id: calc.id,
      chart_version_id: newChartId,
      reused_cache: false,
      calculation_status: engineResult.calculation_status,
      warnings: engineResult.warnings,
    })

  } catch (e) {
    console.error('calculation_failed')
    await service
      .from('chart_calculations')
      .update({
        status: 'failed',
        error_message: e instanceof Error ? e.message : 'unknown',
        completed_at: new Date().toISOString(),
      })
      .eq('id', calc.id)
    return NextResponse.json({ error: 'calculation_failed' }, { status: 500 })
  }
}
