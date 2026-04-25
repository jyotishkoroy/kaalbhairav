import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    profileId: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const { profileId } = await context.params
  const url = new URL(request.url)
  const topic = url.searchParams.get('topic') || 'general'

  const { data: latestChart, error: latestChartError } = await supabase
    .from('chart_json_versions')
    .select('id')
    .eq('profile_id', profileId)
    .eq('user_id', user.id)
    .order('chart_version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestChartError) {
    return NextResponse.json(
      {
        error: 'LATEST_CHART_LOOKUP_FAILED',
        detail: latestChartError.message,
      },
      { status: 500 },
    )
  }

  if (!latestChart) {
    return NextResponse.json({ error: 'CHART_NOT_FOUND' }, { status: 404 })
  }

  const { data: summary, error: summaryError } = await supabase
    .from('prediction_ready_summaries')
    .select('id, profile_id, chart_version_id, topic, prediction_context_version, prediction_context, created_at')
    .eq('profile_id', profileId)
    .eq('user_id', user.id)
    .eq('chart_version_id', latestChart.id)
    .eq('topic', topic)
    .maybeSingle()

  if (summaryError) {
    return NextResponse.json(
      {
        error: 'PREDICTION_CONTEXT_LOOKUP_FAILED',
        detail: summaryError.message,
      },
      { status: 500 },
    )
  }

  if (!summary) {
    return NextResponse.json({ error: 'PREDICTION_CONTEXT_NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json({
    prediction_context_id: summary.id,
    profile_id: summary.profile_id,
    chart_version_id: summary.chart_version_id,
    topic: summary.topic,
    prediction_context_version: summary.prediction_context_version,
    prediction_context: summary.prediction_context,
    created_at: summary.created_at,
  })
}
