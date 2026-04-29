/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { astroV1ApiEnabled } from '@/lib/astro/feature-flags'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> },
) {
  if (!astroV1ApiEnabled()) {
    return NextResponse.json({ error: 'astro_v1_disabled' }, { status: 503 })
  }
  const { profileId } = await params
  const topic = req.nextUrl.searchParams.get('topic') ?? 'general'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: summary } = await supabase
    .from('prediction_ready_summaries')
    .select('id, prediction_context, chart_version_id, created_at')
    .eq('profile_id', profileId)
    .eq('topic', topic)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!summary) return NextResponse.json({ error: 'no_context' }, { status: 404 })
  return NextResponse.json(summary.prediction_context)
}
