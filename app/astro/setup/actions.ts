'use server'

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const birthChartSchema = z.object({
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birth_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  place_name: z.string().min(2).max(200),
})

async function geocode(place: string) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'Kaalbhairav/1.0 (hello@kaalbhairav.org)',
        },
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    const match = data?.[0]

    if (!match?.lat || !match?.lon) return null

    return {
      lat: String(match.lat),
      lon: String(match.lon),
    }
  } catch {
    return null
  }
}

export async function saveBirthChart(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Please sign in first.' }
  }

  const parsed = birthChartSchema.safeParse({
    birth_date: formData.get('birth_date'),
    birth_time: formData.get('birth_time') || undefined,
    place_name: formData.get('place_name'),
  })

  if (!parsed.success) {
    return { error: 'Please check the birth details and try again.' }
  }

  if (!process.env.PII_ENCRYPTION_KEY) {
    return { error: 'PII encryption key is not configured.' }
  }

  const coords = await geocode(parsed.data.place_name)

  const { error } = await supabase.rpc('upsert_birth_chart_encrypted', {
    p_user_id: user.id,
    p_place_name: parsed.data.place_name,
    p_birth_date: parsed.data.birth_date,
    p_birth_time: parsed.data.birth_time ?? null,
    p_latitude: coords?.lat ?? null,
    p_longitude: coords?.lon ?? null,
    p_encryption_key: process.env.PII_ENCRYPTION_KEY,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
