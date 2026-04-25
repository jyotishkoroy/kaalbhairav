import { NextResponse } from 'next/server'

import { encryptJson } from '@/lib/astro/encryption'
import { getDefaultAstrologySettings, getSettingsHash } from '@/lib/astro/settings'
import type { EncryptedBirthPayload } from '@/lib/astro/types'
import { birthProfileInputSchema } from '@/lib/astro/schemas/profile'
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

  const parsed = birthProfileInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'VALIDATION_FAILED',
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    )
  }

  const input = parsed.data
  const encryptedPayload: EncryptedBirthPayload = {
    ...input,
    submitted_at: new Date().toISOString(),
  }

  const encryptedBirthData = encryptJson(encryptedPayload)
  const settings = getDefaultAstrologySettings()
  const settingsHash = getSettingsHash(settings)
  const service = createServiceClient()

  const { data: profile, error: profileError } = await service
    .from('birth_profiles')
    .insert({
      user_id: user.id,
      display_name: input.display_name,
      encrypted_birth_data: encryptedBirthData,
      pii_encryption_key_version: Number(process.env.PII_ENCRYPTION_KEY_VERSION ?? '1'),
      birth_year: Number(input.birth_date.slice(0, 4)),
      has_exact_birth_time:
        input.birth_time_known &&
        ['exact_to_second', 'exact_to_minute'].includes(input.birth_time_precision),
      status: 'active',
    })
    .select('id')
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      {
        error: 'PROFILE_CREATE_FAILED',
        detail: profileError?.message,
      },
      { status: 500 },
    )
  }

  const { error: settingsError } = await service
    .from('astrology_settings')
    .insert({
      profile_id: profile.id,
      user_id: user.id,
      astrology_system: settings.astrology_system,
      zodiac_type: settings.zodiac_type,
      ayanamsa: settings.ayanamsa,
      house_system: settings.house_system,
      node_type: settings.node_type,
      dasha_year_basis: settings.dasha_year_basis,
      settings_hash: settingsHash,
      settings_version: 1,
    })

  if (settingsError) {
    return NextResponse.json(
      {
        error: 'SETTINGS_CREATE_FAILED',
        detail: settingsError.message,
      },
      { status: 500 },
    )
  }

  await service.from('calculation_audit_logs').insert({
    user_id: user.id,
    profile_id: profile.id,
    event: 'birth_profile_created',
    detail: {
      pii_encryption_key_version: Number(process.env.PII_ENCRYPTION_KEY_VERSION ?? '1'),
      settings_hash: settingsHash,
      engine_mode: process.env.ASTRO_ENGINE_MODE ?? 'stub',
    },
  })

  return NextResponse.json({
    profile_id: profile.id,
    settings_hash: settingsHash,
    status: 'created',
  })
}
