/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPlaceSuggestions } from '@/lib/astro/app/place-resolution'
import { checkRateLimit, getClientIp } from '@/lib/security/request-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request)
  const rl = checkRateLimit(`place-suggest:${ip}`, 30, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429 },
    )
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }
  if (q.length > 100) {
    return NextResponse.json({ error: 'query_too_long' }, { status: 400 })
  }

  const suggestions = await getPlaceSuggestions(q)
  return NextResponse.json({ suggestions })
}
