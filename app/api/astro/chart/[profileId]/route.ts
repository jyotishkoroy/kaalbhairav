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
  const requestedVersion = url.searchParams.get('version')

  let query = supabase
    .from('chart_json_versions')
    .select('id, profile_id, chart_version, chart_json, created_at')
    .eq('profile_id', profileId)
    .eq('user_id', user.id)
    .order('chart_version', { ascending: false })
    .limit(1)

  if (requestedVersion) {
    const versionNumber = Number(requestedVersion)

    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      return NextResponse.json({ error: 'INVALID_VERSION' }, { status: 400 })
    }

    query = supabase
      .from('chart_json_versions')
      .select('id, profile_id, chart_version, chart_json, created_at')
      .eq('profile_id', profileId)
      .eq('user_id', user.id)
      .eq('chart_version', versionNumber)
      .limit(1)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    return NextResponse.json(
      {
        error: 'CHART_LOOKUP_FAILED',
        detail: error.message,
      },
      { status: 500 },
    )
  }

  if (!data) {
    return NextResponse.json({ error: 'CHART_NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json({
    profile_id: data.profile_id,
    chart_version_id: data.id,
    chart_version: data.chart_version,
    chart_json: data.chart_json,
    created_at: data.created_at,
  })
}
