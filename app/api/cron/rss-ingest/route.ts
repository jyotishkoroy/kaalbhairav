/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ingestNews } from '@/lib/news/ingest'
import { inferSlot, getKolkataDate } from '@/lib/news/kolkata'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!process.env.NEWS_CRON_SECRET || auth !== `Bearer ${process.env.NEWS_CRON_SECRET}`) {
    return NextResponse.json({ ok: false, status: 'unauthorized' }, { status: 401 })
  }
  const slot = (request.nextUrl.searchParams.get('slot') as 'morning' | 'evening' | 'manual' | null) ?? inferSlot(new Date())
  const supabase = createServiceClient() as unknown as Parameters<typeof ingestNews>[0]['supabase']
  const result = await ingestNews({ supabase, slot })
  return NextResponse.json({ ok: result.ok, status: result.status, slot, kolkataDate: getKolkataDate(), selectedSource: result.selectedSource ?? null, selectedTopic: result.selectedTopic ?? null, postId: result.postId ?? null, attemptedSources: result.attemptedSources, skippedDuplicates: result.skippedDuplicates, errors: result.errors, fallbackReason: result.fallbackReason ?? null })
}
