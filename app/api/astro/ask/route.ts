/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { guardOneShotAstroQuestion } from '@/lib/astro/app/one-shot-question-guard'
import { analyzeQuestionQuality } from '@/lib/astro/app/question-quality'
import { answerCanonicalAstroQuestion } from '@/lib/astro/ask/answer-canonical-astro-question'
import { buildAstroChartContext } from '@/lib/astro/chart-context'
import { sha256Canonical } from '@/lib/astro/hashing'
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
    .order('chart_version', { ascending: false })
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

  if (process.env.ASTRO_DEBUG_CHART_CONTEXT === 'true') {
    const chartJsonRecord = latestChart.chart_json && typeof latestChart.chart_json === 'object' && !Array.isArray(latestChart.chart_json)
      ? latestChart.chart_json as Record<string, unknown>
      : {}
    const chartVersionHash = sha256Canonical({
      chartVersionId: latestChart.id,
      chartVersion: chartJsonRecord.metadata && typeof chartJsonRecord.metadata === 'object'
        ? (chartJsonRecord.metadata as Record<string, unknown>).chart_version
        : null,
      inputHash: chartJsonRecord.metadata && typeof chartJsonRecord.metadata === 'object'
        ? (chartJsonRecord.metadata as Record<string, unknown>).input_hash
        : null,
      settingsHash: chartJsonRecord.metadata && typeof chartJsonRecord.metadata === 'object'
        ? (chartJsonRecord.metadata as Record<string, unknown>).settings_hash
        : null,
    }).slice(0, 12)
    const chartFactsFound = chartContext.ready ? chartContext.basisFacts.map((fact) => fact.split(':')[0].replace(/\s+/g, '')) : []
    const chartJsonAscendantPathsFound = [
      ['public_facts', 'lagna_sign'],
      ['publicFacts', 'lagnaSign'],
      ['d1', 'lagna', 'sign'],
      ['d1', 'ascendant', 'sign'],
      ['ascendant', 'sign'],
      ['lagna', 'sign'],
    ].filter((path) => {
      let current: unknown = latestChart.chart_json
      for (const part of path) {
        if (!current || typeof current !== 'object' || Array.isArray(current)) return false
        current = (current as Record<string, unknown>)[part]
      }
      return typeof current === 'string' && current.trim().length > 0
    }).map((path) => path.join('.'))
    console.log('[astro_chart_context_debug]', {
      hasProfile: true,
      chartVersionSelected: chartVersionHash,
      chartCreatedAt: chartJsonRecord.metadata && typeof chartJsonRecord.metadata === 'object'
        ? (chartJsonRecord.metadata as Record<string, unknown>).computed_at ?? null
        : null,
      chartFactsFound,
      lagnaFromContext: chartContext.ready ? chartContext.publicFacts.lagnaSign ?? null : null,
      chartJsonAscendantPathsFound,
    })
  }

  const result = await answerCanonicalAstroQuestion({
    question,
    userId: user.id,
    profileId: activeProfile.id,
    chartVersionId: latestChart.id,
    chartJson: latestChart.chart_json,
    predictionSummary: latestPredictionSummary?.prediction_context,
    requestId,
  })

  let answer = result.answer
  if (quality.warnings.length > 0) {
    answer = answer.startsWith('aadesh:')
      ? `${answer}\n\n${quality.warnings.join(' ')}`
      : `aadesh: ${quality.warnings.join(' ')} ${answer}`
  }

  // Return only { answer } — no metadata, model, provider, server, profileId, etc.
  return NextResponse.json({ answer })
}
