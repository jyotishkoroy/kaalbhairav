/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveBirthPlace } from '@/lib/astro/app/place-resolution'
import { assertSameOriginRequest, checkRateLimit, getClientIp } from '@/lib/security/request-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const originCheck = assertSameOriginRequest(req as unknown as Request)
  if (!originCheck.ok) {
    return NextResponse.json({ error: originCheck.error }, { status: originCheck.status })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const ip = getClientIp(req as unknown as Request)
  const rl = checkRateLimit(`resolve-place:${ip}`, 10, 60_000)
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
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const place = typeof (body as Record<string, unknown>)?.place === 'string'
    ? (body as Record<string, unknown>).place as string
    : ''

  if (place.length > 180) {
    return NextResponse.json({ error: 'place_too_long' }, { status: 400 })
  }

  const result = await resolveBirthPlace(place)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 })
  }

  return NextResponse.json({
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone,
    placeName: result.placeName,
    elevationMeters: result.elevationMeters ?? null,
  })
}
