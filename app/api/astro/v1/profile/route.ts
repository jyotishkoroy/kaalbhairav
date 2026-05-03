/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
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

  const googleEmail = user.email ?? null
  const googleName =
    typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name :
    typeof user.user_metadata?.name === 'string' ? user.user_metadata.name :
    user.email?.split('@')[0] ?? 'My chart'
  const displayName = input.display_name?.trim() || googleName

  const keyVersion = Number(process.env.PII_ENCRYPTION_KEY_VERSION ?? 1)
  const encryptedPayload = encryptJson(
    { ...input, about_self: input.about_self, submitted_at: new Date().toISOString() },
    keyVersion,
  )

  const service = createServiceClient()

  // Check for existing active profile
  const { data: existingProfile } = await service
    .from('birth_profiles')
    .select('id, last_birth_details_updated_at, birth_details_change_available_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const settingsHash = hashSettings(DEFAULT_SETTINGS)
  const now = new Date()
  const changeAvailableAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  if (existingProfile) {
    // Enforce one-week edit lock
    if (existingProfile.birth_details_change_available_at) {
      const lockDate = new Date(existingProfile.birth_details_change_available_at)
      if (lockDate > now) {
        return NextResponse.json(
          {
            error: 'profile_edit_locked',
            message: `Birth details can be changed again after ${lockDate.toDateString()}.`,
            birth_details_change_available_at: existingProfile.birth_details_change_available_at,
          },
          { status: 423 },
        )
      }
    }

    // Update existing profile
    const { error: updateError } = await service
      .from('birth_profiles')
      .update({
        display_name: displayName,
        google_email: googleEmail,
        google_name: googleName,
        about_self: input.about_self ?? null,
        encrypted_birth_data: encryptedPayload,
        pii_encryption_key_version: keyVersion,
        birth_year: parseInt(input.birth_date.slice(0, 4)),
        has_exact_birth_time: input.birth_time_known && input.birth_time_precision === 'exact',
        last_birth_details_updated_at: now.toISOString(),
        birth_details_change_available_at: changeAvailableAt.toISOString(),
        terms_accepted_at: input.terms_accepted_version ? now.toISOString() : undefined,
        terms_accepted_version: input.terms_accepted_version ?? undefined,
      })
      .eq('id', existingProfile.id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('profile_update_failed', updateError?.code)
      return NextResponse.json({ error: 'profile_update_failed' }, { status: 500 })
    }

    // Ensure settings row exists
    const { data: existingSettings } = await service
      .from('astrology_settings')
      .select('id')
      .eq('profile_id', existingProfile.id)
      .maybeSingle()

    if (!existingSettings) {
      await service.from('astrology_settings').insert({
        profile_id: existingProfile.id,
        user_id: user.id,
        ...DEFAULT_SETTINGS,
        settings_hash: settingsHash,
      })
    }

    if (input.terms_accepted_version) {
      await service.from('user_terms_acceptances').upsert({
        user_id: user.id,
        terms_version: input.terms_accepted_version,
        accepted_at: now.toISOString(),
        source: 'astro_setup',
      })
    }

    await service.from('calculation_audit_logs').insert({
      user_id: user.id,
      profile_id: existingProfile.id,
      event: 'profile_updated',
      detail: { settings_hash: settingsHash },
    })

    return NextResponse.json({
      profile_id: existingProfile.id,
      settings_hash: settingsHash,
      status: 'updated',
      birth_details_change_available_at: changeAvailableAt.toISOString(),
    })
  }

  // Create new profile
  const { data: profile, error: profileError } = await service
    .from('birth_profiles')
    .insert({
      user_id: user.id,
      display_name: displayName,
      google_email: googleEmail,
      google_name: googleName,
      about_self: input.about_self ?? null,
      encrypted_birth_data: encryptedPayload,
      pii_encryption_key_version: keyVersion,
      birth_year: parseInt(input.birth_date.slice(0, 4)),
      has_exact_birth_time: input.birth_time_known && input.birth_time_precision === 'exact',
      last_birth_details_updated_at: now.toISOString(),
      birth_details_change_available_at: changeAvailableAt.toISOString(),
      terms_accepted_at: input.terms_accepted_version ? now.toISOString() : null,
      terms_accepted_version: input.terms_accepted_version ?? null,
    })
    .select('id')
    .single()

  if (profileError || !profile) {
    console.error('profile_insert_failed', profileError?.code)
    return NextResponse.json({ error: 'profile_create_failed' }, { status: 500 })
  }

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

  if (input.terms_accepted_version) {
    await service.from('user_terms_acceptances').upsert({
      user_id: user.id,
      terms_version: input.terms_accepted_version,
      accepted_at: now.toISOString(),
      source: 'astro_setup',
    })
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
    birth_details_change_available_at: changeAvailableAt.toISOString(),
  })
}
