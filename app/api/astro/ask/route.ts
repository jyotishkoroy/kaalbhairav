/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { guardOneShotAstroQuestion } from '@/lib/astro/app/one-shot-question-guard'
import { handleAstroV2ReadingRequest } from '@/lib/astro/rag/astro-v2-reading-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const questionRaw = typeof raw.question === 'string' ? raw.question : ''
  const requestId = typeof raw.requestId === 'string' ? raw.requestId.slice(0, 120) : undefined

  const guard = guardOneShotAstroQuestion(questionRaw)
  if (!guard.allowed) {
    return NextResponse.json({ answer: guard.answer }, { status: 200 })
  }

  const question = guard.normalizedQuestion

  const service = createServiceClient()

  // Load the one active birth profile for the authenticated user
  const { data: activeProfile } = await service
    .from('birth_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!activeProfile) {
    return NextResponse.json(
      { error: 'setup_required', message: 'Please complete birth profile setup first.' },
      { status: 404 },
    )
  }

  // Load latest chart version
  const { data: latestChart } = await service
    .from('chart_json_versions')
    .select('id')
    .eq('profile_id', activeProfile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestChart) {
    return NextResponse.json(
      { error: 'setup_required', message: 'Chart is not ready. Please complete setup and wait for calculation.' },
      { status: 404 },
    )
  }

  // Build server-side body for V2/RAG handler — never use client-supplied ids
  const v2Body = {
    question,
    message: question,
    mode: 'practical_guidance',
    userId: user.id,
    profileId: activeProfile.id,
    chartVersionId: latestChart.id,
    metadata: {
      source: 'astro-canonical-page',
      oneShot: true,
      disableFollowUps: true,
      disableMemory: true,
      requestId,
    },
  }

  const v2Request = new Request(req.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(v2Body),
  })

  const v2Response = await handleAstroV2ReadingRequest(v2Request)

  let v2Data: Record<string, unknown> = {}
  try {
    v2Data = await v2Response.json()
  } catch {
    return NextResponse.json(
      { error: 'Unable to generate a reading right now. Please try again.' },
      { status: 500 },
    )
  }

  if (!v2Response.ok || typeof v2Data.answer !== 'string') {
    const errMsg = typeof v2Data.error === 'string' ? v2Data.error : 'Unable to generate a reading right now. Please try again.'
    return NextResponse.json({ error: errMsg }, { status: v2Response.ok ? 500 : v2Response.status })
  }

  // Strip follow-up and meta — return only answer
  return NextResponse.json({ answer: v2Data.answer })
}
