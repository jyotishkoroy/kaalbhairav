import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

async function createMessage(date: string) {
  if (!process.env.GROQ_API_KEY) {
    return 'Sit quietly. Let what must leave, leave.'
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            'Write one-line daily reflections in the voice of Kaal Bhairav: grounded, warm, direct when needed. No predictions, no horoscope fluff. Respond only with the reflection, 15-25 words, no quotation marks.',
        },
        {
          role: 'user',
          content: `Write the daily reflection for ${date}.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 80,
    }),
  })

  if (!response.ok) {
    return 'Sit quietly. Let what must leave, leave.'
  }

  const data = await response.json()
  return (
    data?.choices?.[0]?.message?.content?.trim() ||
    'Sit quietly. Let what must leave, leave.'
  )
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')

  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
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

  if (existing) {
    return NextResponse.json({ skipped: true, date: tomorrow })
  }

  const message = await createMessage(tomorrow)

  const { error } = await supabase.from('daily_insights').insert({
    insight_date: tomorrow,
    tithi: 'Pratipada',
    nakshatra: 'Ashwini',
    rashi: 'Mesha',
    bhairav_message: message,
    panchang_data: {
      status: 'placeholder_until_astro_engine_connected',
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ date: tomorrow, message })
}
