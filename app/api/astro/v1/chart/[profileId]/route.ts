/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { astroV1ApiEnabled } from '@/lib/astro/feature-flags'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> },
) {
  if (!astroV1ApiEnabled()) {
    return NextResponse.json({ error: 'astro_v1_disabled' }, { status: 503 })
  }
  const { profileId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: chart } = await supabase
    .from('chart_json_versions')
    .select('id, profile_id, chart_version, computed_at, chart_json')
    .eq('profile_id', profileId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!chart) return NextResponse.json({ error: 'no_chart' }, { status: 404 })

  return NextResponse.json({
    profile_id: chart.profile_id,
    chart_version_id: chart.id,
    chart_version: chart.chart_version,
    computed_at: chart.computed_at,
    chart_json: chart.chart_json,
  })
}
