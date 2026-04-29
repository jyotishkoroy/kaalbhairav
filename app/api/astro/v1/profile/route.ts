/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { birthProfileInputSchema } from '@/lib/astro/schemas/profile'
import { encryptJson } from '@/lib/astro/encryption'
import { hashSettings, DEFAULT_SETTINGS } from '@/lib/astro/settings'
import { astroV1ApiEnabled } from '@/lib/astro/feature-flags'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  if (!astroV1ApiEnabled()) {
    return NextResponse.json({ error: 'astro_v1_disabled' }, { status: 503 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = birthProfileInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 })
  }
  const input = parsed.data
  const keyVersion = Number(process.env.PII_ENCRYPTION_KEY_VERSION ?? 1)
  const encryptedPayload = encryptJson(
    { ...input, submitted_at: new Date().toISOString() },
    keyVersion,
  )

  const service = createServiceClient()

  const { data: profile, error: profileError } = await service
    .from('birth_profiles')
    .insert({
      user_id: user.id,
      display_name: input.display_name,
      encrypted_birth_data: encryptedPayload,
      pii_encryption_key_version: keyVersion,
      birth_year: parseInt(input.birth_date.slice(0, 4)),
      has_exact_birth_time: input.birth_time_known && input.birth_time_precision === 'exact',
    })
    .select('id')
    .single()

  if (profileError || !profile) {
    console.error('profile_insert_failed', profileError?.code)
    return NextResponse.json({ error: 'profile_create_failed' }, { status: 500 })
  }

  const settingsHash = hashSettings(DEFAULT_SETTINGS)
  const { error: settingsError } = await service
    .from('astrology_settings')
    .insert({
      profile_id: profile.id,
      user_id: user.id,
      ...DEFAULT_SETTINGS,
      settings_hash: settingsHash,
    })

  if (settingsError) {
    console.error('settings_insert_failed', settingsError?.code)
    return NextResponse.json({ error: 'settings_create_failed' }, { status: 500 })
  }

  await service.from('calculation_audit_logs').insert({
    user_id: user.id,
    profile_id: profile.id,
    event: 'profile_created',
    detail: { settings_hash: settingsHash },
  })

  return NextResponse.json({
    profile_id: profile.id,
    settings_hash: settingsHash,
    status: 'created',
  })
}
