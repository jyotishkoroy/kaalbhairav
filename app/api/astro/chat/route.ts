import { NextResponse } from 'next/server'

import { chatRequestSchema } from '@/lib/astro/schemas/chat'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ASTRO_CHAT_SYSTEM_PROMPT = `
You are an astrology explanation layer.

You do not calculate astrology.
You do not change chart values.
You do not invent missing placements, dashas, yogas, doshas, or timings.
You only explain the supplied backend-generated prediction_context.

If the user asks for a value not present in the context, say that the backend has not calculated it yet.

If confidence warnings exist, mention them.

Do not provide deterministic medical, death, legal, or financial guarantees.
Do not guarantee marriage, pregnancy, accidents, disasters, success, failure, or exact events.

Use cautious, symbolic, reflective wording.
Present astrology as interpretation, not certainty.
`.trim()

export async function POST(request: Request) {
  if (process.env.ASTRO_V1_CHAT_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'ASTRO_V1_CHAT_DISABLED' },
      { status: 503 },
    )
  }

  const groqApiKey = process.env.GROQ_API_KEY

  if (!groqApiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY_MISSING' }, { status: 500 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = chatRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'VALIDATION_FAILED',
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    )
  }

  const { profile_id, session_id, topic = 'general', question } = parsed.data
  const service = createServiceClient()

  const { data: latestChart, error: latestChartError } = await service
    .from('chart_json_versions')
    .select('id')
    .eq('profile_id', profile_id)
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

  const { data: summary, error: summaryError } = await service
    .from('prediction_ready_summaries')
    .select('id, chart_version_id, prediction_context')
    .eq('profile_id', profile_id)
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

  let activeSessionId = session_id

  if (!activeSessionId) {
    const { data: newSession, error: sessionError } = await service
      .from('astro_chat_sessions')
      .insert({
        user_id: user.id,
        profile_id,
        chart_version_id: summary.chart_version_id,
        title: question.slice(0, 80),
        status: 'active',
      })
      .select('id')
      .single()

    if (sessionError || !newSession) {
      return NextResponse.json(
        {
          error: 'SESSION_CREATE_FAILED',
          detail: sessionError?.message,
        },
        { status: 500 },
      )
    }

    activeSessionId = newSession.id
  }

  await service.from('astro_chat_messages').insert({
    session_id: activeSessionId,
    user_id: user.id,
    profile_id,
    chart_version_id: summary.chart_version_id,
    prediction_context_id: summary.id,
    role: 'user',
    content: question,
    topic,
  })

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_ANSWER_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content: ASTRO_CHAT_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: JSON.stringify({
            prediction_context: summary.prediction_context,
            user_question: question,
            answer_policy: {
              max_output_tokens: 900,
              must_mention_stub_status: true,
              must_mention_confidence: true,
            },
          }),
        },
      ],
    }),
  })

  if (!groqResponse.ok) {
    const detail = await groqResponse.text()

    return NextResponse.json(
      {
        error: 'GROQ_REQUEST_FAILED',
        detail,
      },
      { status: 502 },
    )
  }

  const groqJson = await groqResponse.json()
  const answer =
    groqJson?.choices?.[0]?.message?.content ||
    'The backend context was available, but no explanation was returned.'

  await service.from('astro_chat_messages').insert({
    session_id: activeSessionId,
    user_id: user.id,
    profile_id,
    chart_version_id: summary.chart_version_id,
    prediction_context_id: summary.id,
    role: 'assistant',
    content: answer,
    topic,
    model_used: process.env.GROQ_ANSWER_MODEL || 'llama-3.1-8b-instant',
  })

  return NextResponse.json({
    session_id: activeSessionId,
    answer,
  })
}
