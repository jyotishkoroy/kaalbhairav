/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createServiceClient()

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const { data: existing } = await supabase
    .from('daily_insights')
    .select('id')
    .eq('insight_date', tomorrow)
    .maybeSingle()

  if (existing) return NextResponse.json({ skipped: true })

  const llm = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'You write one-line daily reflections in a grounded Hindu spiritual voice. No horoscope fluff, no predictions. Respond with ONLY the reflection, 15-25 words, no quotation marks.',
        },
        {
          role: 'user',
          content: `Write today's reflection for ${tomorrow}.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 80,
    }),
  })

  const llmData = await llm.json()
  const message =
    llmData.choices?.[0]?.message?.content?.trim() ??
    'Sit quietly. Let what must leave, leave.'

  await supabase.from('daily_insights').insert({
    insight_date: tomorrow,
    tithi: 'Pratipada',
    nakshatra: 'Ashwini',
    rashi: 'Mesha',
    bhairav_message: message,
  })

  return NextResponse.json({ date: tomorrow, message })
}