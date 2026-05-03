/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { guardOneShotAstroQuestion } from '@/lib/astro/app/one-shot-question-guard'
import { analyzeQuestionQuality } from '@/lib/astro/app/question-quality'
import { handleAstroV2ReadingRequest } from '@/lib/astro/rag/astro-v2-reading-handler'
import { buildAstroChartContext, formatChartBasisForAnswer } from '@/lib/astro/chart-context'
import { answerExactChartFactQuestion } from '@/lib/astro/exact-chart-facts'
import { ensureChartGroundedAnswer } from '@/lib/astro/answer-grounding'
import { assertSameOriginRequest, checkRateLimit, getClientIp } from '@/lib/security/request-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  // CSRF/origin check — only relevant for authenticated requests
  const originCheck = assertSameOriginRequest(req as unknown as Request)
  if (!originCheck.ok) {
    return NextResponse.json({ error: originCheck.error }, { status: originCheck.status })
  }

  // Rate limit: 10 requests/min per user
  const rl = checkRateLimit(`ask:${user.id}`, 10, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429 },
    )
  }
  // Fallback rate limit by IP
  const ip = getClientIp(req as unknown as Request)
  const rlIp = checkRateLimit(`ask-ip:${ip}`, 20, 60_000)
  if (!rlIp.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: rlIp.retryAfterSeconds },
      { status: 429 },
    )
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

  // Input size limit
  if (questionRaw.length > 2000) {
    return NextResponse.json({ answer: 'aadesh: Your question is too long. Please ask one focused question.' })
  }

  // Language + security guard (runs first, before quality)
  const guard = guardOneShotAstroQuestion(questionRaw)
  if (!guard.allowed) {
    return NextResponse.json({ answer: guard.answer }, { status: 200 })
  }

  // Question quality + misspelling correction
  const quality = analyzeQuestionQuality(guard.normalizedQuestion)
  const question = quality.normalizedQuestion

  const service = createServiceClient()

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

  const { data: latestChart } = await service
    .from('chart_json_versions')
    .select('id, chart_json')
    .eq('profile_id', activeProfile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestChart) {
    return NextResponse.json({
      answer: 'aadesh: Your birth chart context is not ready yet. Please update your birth details once so Tarayai can calculate your chart before answering.',
    })
  }

  const { data: latestPredictionSummary } = await service
    .from('prediction_ready_summaries')
    .select('id, chart_version_id, prediction_context, topic, created_at')
    .eq('profile_id', activeProfile.id)
    .eq('chart_version_id', latestChart.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const chartContext = buildAstroChartContext({
    profileId: activeProfile.id,
    chartVersionId: latestChart.id,
    chartJson: latestChart.chart_json,
    predictionSummary: latestPredictionSummary?.prediction_context,
  })

  if (!chartContext.ready) {
    return NextResponse.json({
      answer: 'aadesh: Your birth chart context is not ready yet. Please update your birth details once so Tarayai can calculate your chart before answering.',
    })
  }

  const exactFactAnswer = answerExactChartFactQuestion({
    question,
    chartContext,
  })

  if (exactFactAnswer.matched) {
    return NextResponse.json({ answer: exactFactAnswer.answer })
  }

  const v2Body = {
    question,
    message: question,
    mode: 'practical_guidance',
    userId: user.id,
    profileId: activeProfile.id,
    chartVersionId: latestChart.id,
    chartContext: chartContext.compactPromptContext,
    deterministicChartFacts: chartContext.publicFacts,
    predictionSummary: latestPredictionSummary?.prediction_context ?? null,
    metadata: {
      source: 'astro-canonical-page',
      oneShot: true,
      disableFollowUps: true,
      disableMemory: true,
      requireChartGrounding: true,
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
    return NextResponse.json({
      answer: `aadesh: ${formatChartBasisForAnswer(chartContext)}\n\nI could not complete a deeper reading right now, but based on the saved chart context, avoid taking the result as certainty. Please try again shortly.`,
      error: errMsg,
    }, { status: v2Response.ok ? 500 : v2Response.status })
  }

  // Prefix with spelling correction notice if any
  let answer = ensureChartGroundedAnswer({
    answer: typeof v2Data.answer === 'string' ? v2Data.answer : '',
    chartContext,
  })
  if (quality.warnings.length > 0) {
    answer = answer.startsWith('aadesh:')
      ? `${answer}\n\n${quality.warnings.join(' ')}`
      : `aadesh: ${quality.warnings.join(' ')} ${answer}`
  }

  // Return only { answer } — no metadata, model, provider, server, profileId, etc.
  return NextResponse.json({ answer })
}
