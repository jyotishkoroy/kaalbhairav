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
import { assertSameOriginRequest, checkRateLimit } from '@/lib/security/request-guards'
import { normalizeBirthTimeForCalculation } from '@/lib/astro/calculations/time'

export const runtime = 'nodejs'
export const maxDuration = 30

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function extractBirthTimeValidationInput(input: Record<string, unknown>) {
  return {
    dateOfBirth: readString(input.birth_date) ?? readString(input.dateOfBirth) ?? readString(input.birthDate) ?? readString(input.date_of_birth) ?? '',
    timeOfBirth: readString(input.birth_time) ?? readString(input.timeOfBirth) ?? readString(input.birthTime) ?? readString(input.time_of_birth),
    timezone: readString(input.timezone),
    birthTimeKnown: typeof input.birth_time_known === 'boolean'
      ? input.birth_time_known
      : typeof input.birthTimeKnown === 'boolean'
        ? input.birthTimeKnown
        : true,
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
  const rl = checkRateLimit(`profile:${user.id}`, 5, 60 * 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  // Basic input size guards
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const raw = body as Record<string, unknown>
    if (typeof raw.birth_place_name === 'string' && raw.birth_place_name.length > 180) {
      return NextResponse.json({ error: 'invalid_input', field: 'birth_place_name' }, { status: 400 })
    }
    if (typeof raw.about_self === 'string' && raw.about_self.length > 2000) {
      return NextResponse.json({ error: 'invalid_input', field: 'about_self' }, { status: 400 })
    }
    if (typeof raw.display_name === 'string' && raw.display_name.length > 120) {
      return NextResponse.json({ error: 'invalid_input', field: 'display_name' }, { status: 400 })
    }
  }

  const parsed = birthProfileInputSchema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues
    // Surface specific validation errors safely
    const dateIssue = issues.find(i => i.path.includes('birth_date'))
    const timeIssue = issues.find(i => i.path.includes('birth_time'))
    if (dateIssue) return NextResponse.json({ error: 'invalid_birth_date' }, { status: 400 })
    if (timeIssue) return NextResponse.json({ error: 'invalid_birth_time' }, { status: 400 })
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }
  const input = parsed.data
  const birthTimeValidation = normalizeBirthTimeForCalculation(extractBirthTimeValidationInput(input as Record<string, unknown>))
  if (birthTimeValidation.status === 'invalid_timezone' || birthTimeValidation.status === 'nonexistent_local_time' || birthTimeValidation.status === 'ambiguous_local_time' || birthTimeValidation.status === 'missing_timezone') {
    return NextResponse.json(
      {
        error: birthTimeValidation.status,
        code: birthTimeValidation.status,
        message: birthTimeValidationMessage(birthTimeValidation.status),
        birth_time_validation: {
          status: birthTimeValidation.status,
          dstStatus: birthTimeValidation.dstStatus,
          timezone: birthTimeValidation.timezone,
          localDate: birthTimeValidation.localDate,
          localTime: birthTimeValidation.localTime,
        },
      },
      { status: 400 },
    )
  }

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

    // Birth data is changing — clear the current chart pointer so stale chart cannot be used.
    // The user must recalculate after updating birth details.
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
        // Invalidate the current chart pointer so the stale chart cannot be used.
        // All calculation-affecting fields are re-encrypted together; we cannot diff
        // individual fields, so we always clear the pointer on any profile update.
        current_chart_version_id: null,
        input_hash: null,
      })
      .eq('id', existingProfile.id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[profile_update_failed]', updateError?.code, updateError?.message?.slice(0, 100))
      return NextResponse.json({ error: 'profile_save_failed' }, { status: 500 })
    }

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
    console.error('[profile_insert_failed]', profileError?.code, profileError?.message?.slice(0, 100))
    return NextResponse.json({ error: 'profile_save_failed' }, { status: 500 })
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
    console.error('[settings_insert_failed]', settingsError?.code, settingsError?.message?.slice(0, 100))
    return NextResponse.json({ error: 'profile_save_failed' }, { status: 500 })
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
