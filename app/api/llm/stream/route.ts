/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isE2ERateLimitDisabled, logE2ERateLimitDisabled } from '@/lib/security/e2e-rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 60

const requestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  question: z.string().min(3).max(1500),
})

const SYSTEM_PROMPT = `You are a guide on Kaalbhairav.org, rooted in Hindu spiritual and occult traditions.

Hard rules, always:
- You do NOT predict health outcomes, medical diagnoses, deaths, or specific dates for life events.
- You do NOT give financial or investment advice.
- You do NOT speak about legal matters as a lawyer would.
- If asked about any of the above, gently redirect: "For that, I would guide you to a qualified practitioner. What I can offer is reflection on the energies and patterns at play."
- Frame insights as reflection and symbolism, not fate or guarantee.
- Always respond in English only, even if the user asks in Hindi or naturally mixed language.
- Keep answers grounded, warm, and specific. Avoid generic horoscope fluff.
- Reference the user's chart details only when genuinely relevant.`

function createRateLimiter() {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null
  }

  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.fixedWindow(20, '1 d'),
    prefix: 'llm:free',
    analytics: true,
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: llmConfig } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', 'llm_enabled')
    .single()

  if (llmConfig?.value === false) {
    return Response.json(
      {
        error: 'disabled',
        message: 'The Guru is taking a brief pause. Please return shortly.',
      },
      { status: 503 }
    )
  }

  const rateLimiter = createRateLimiter()
  let remaining: number | null = null

  if (isE2ERateLimitDisabled()) {
    logE2ERateLimitDisabled('/api/llm/stream', 'llm-free')
  } else if (rateLimiter) {
    const result = await rateLimiter.limit(user.id)
    remaining = Math.max(0, result.remaining - 1)

    if (!result.success) {
      return Response.json(
        {
          error: 'daily_limit',
          message:
            'You have asked all you can for today. The Guru will listen again tomorrow.',
          resetAt: new Date(result.reset).toISOString(),
        },
        { status: 429 }
      )
    }
  }

  const body = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: 'invalid_input' }, { status: 400 })
  }

  if (!process.env.GROQ_API_KEY) {
    return Response.json(
      { error: 'missing_groq_key', message: 'Groq API key is not configured.' },
      { status: 503 }
    )
  }

  const { conversationId, question } = parsed.data

  const { data: chart } = await supabase
    .from('birth_charts')
    .select('chart_json, place_name')
    .eq('user_id', user.id)
    .single()

  const contextBlock = chart?.chart_json
    ? `\n\nUser birth chart context (use only if relevant):\n${JSON.stringify(chart.chart_json).slice(0, 3000)}`
    : chart?.place_name
      ? `\n\nUser birth place: ${chart.place_name}`
      : ''

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      send('meta', { remaining })

      let fullResponse = ''

      try {
        const response = await fetch(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                { role: 'system', content: SYSTEM_PROMPT + contextBlock },
                { role: 'user', content: question },
              ],
              stream: true,
              temperature: 0.7,
              max_tokens: 1024,
            }),
          }
        )

        if (!response.ok || !response.body) {
          throw new Error(`Groq ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue

            const payload = line.slice(6).trim()
            if (payload === '[DONE]') break

            try {
              const json = JSON.parse(payload)
              const token = json.choices?.[0]?.delta?.content

              if (token) {
                fullResponse += token
                send('token', { t: token })
              }
            } catch {
              // Ignore malformed provider chunks and keep streaming.
            }
          }
        }
      } catch (error) {
        console.error('LLM stream failed:', error)
        send('error', {
          message: 'The Guru is in deep meditation. Please try again shortly.',
        })
        controller.close()
        return
      }

      if (fullResponse) {
        try {
          let activeConversationId = conversationId

          if (!activeConversationId) {
            const { data: newConversation } = await supabase
              .from('astro_conversations')
              .insert({ user_id: user.id, title: question.slice(0, 60) })
              .select('id')
              .single()

            activeConversationId = newConversation?.id
          }

          if (activeConversationId) {
            await supabase.from('astro_messages').insert([
              {
                conversation_id: activeConversationId,
                user_id: user.id,
                role: 'user',
                content: question,
              },
              {
                conversation_id: activeConversationId,
                user_id: user.id,
                role: 'assistant',
                content: fullResponse,
                model_used: 'groq/llama-3.3-70b',
              },
            ])

            send('done', { conversationId: activeConversationId })
          }
        } catch (error) {
          console.error('Persist failed:', error)
        }
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
