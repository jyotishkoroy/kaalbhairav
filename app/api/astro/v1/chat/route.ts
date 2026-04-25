import { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { chatRequestSchema } from '@/lib/astro/schemas/chat'
import { astroV1ChatEnabled } from '@/lib/astro/feature-flags'

export const runtime = 'nodejs'
export const maxDuration = 60

const redis = Redis.fromEnv()
const dailyLimit = Number(process.env.ASTRO_DAILY_FREE_QUESTIONS ?? 20)
const rl = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(dailyLimit, '1 d'),
  prefix: 'astro:v1:chat',
})

const SYSTEM_PROMPT = `You are an astrology explanation layer for Kaalbhairav.org.

CRITICAL RULES:
- You do NOT calculate astrology.
- You do NOT change chart values.
- You do NOT invent missing placements, dashas, yogas, doshas, or timings.
- You ONLY explain the supplied backend-generated prediction_context.

If the user asks for a value that is not present in the context, say: "The backend has not calculated that yet for your chart."

If confidence is "low" or warnings exist, mention them transparently.

You do NOT provide deterministic medical, death, legal, financial, marriage, pregnancy, accident, or guaranteed-event predictions. Always frame as reflection and symbolism.

Required disclaimer when relevant: "This is offered for reflection and symbolic interpretation, not as a guarantee or professional advice. For medical, legal, financial, or mental-health concerns, consult a qualified professional."

Respond in the user's language (English or Hindi). Be warm, grounded, brief.`

export async function POST(req: NextRequest) {
  if (!astroV1ChatEnabled()) {
    return Response.json({ error: 'astro_v1_chat_disabled' }, { status: 503 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = chatRequestSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'invalid_input' }, { status: 400 })
  const { profile_id, session_id, topic, question } = parsed.data

  const { success, remaining } = await rl.limit(user.id)
  if (!success) {
    return Response.json({
      error: 'daily_limit',
      message: 'You have reached today\'s reflection limit. Return tomorrow.',
    }, { status: 429 })
  }

  const service = createServiceClient()

  const { data: summary } = await service
    .from('prediction_ready_summaries')
    .select('id, prediction_context, chart_version_id')
    .eq('profile_id', profile_id)
    .eq('user_id', user.id)
    .eq('topic', topic ?? 'general')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!summary) {
    return Response.json({ error: 'no_context', message: 'Please calculate your chart first.' }, { status: 404 })
  }

  // Safety gate — reject if forbidden keys appear in payload destined for LLM
  const ctxStr = JSON.stringify(summary.prediction_context)
  const FORBIDDEN_KEYS = ['birth_date', 'birth_time', 'encrypted_birth_data', 'latitude', 'longitude']
  for (const k of FORBIDDEN_KEYS) {
    if (ctxStr.includes(`"${k}"`)) {
      console.error('safety_gate_triggered', k)
      return Response.json({ error: 'safety_gate' }, { status: 500 })
    }
  }

  let sessionId = session_id
  if (!sessionId) {
    const { data: newSession } = await service
      .from('astro_chat_sessions')
      .insert({
        user_id: user.id,
        profile_id,
        chart_version_id: summary.chart_version_id,
        title: question.slice(0, 60),
      })
      .select('id')
      .single()
    sessionId = newSession?.id
  }

  if (!sessionId) {
    return Response.json({ error: 'session_create_failed' }, { status: 500 })
  }

  await service.from('astro_chat_messages').insert({
    session_id: sessionId,
    user_id: user.id,
    profile_id,
    chart_version_id: summary.chart_version_id,
    prediction_context_id: summary.id,
    role: 'user',
    content: question,
    topic: topic ?? 'general',
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }
      send('meta', { remaining: remaining - 1, session_id: sessionId })

      let fullResponse = ''

      try {
        const llmPayload = {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'system', content: `prediction_context (do not recalculate):\n${JSON.stringify(summary.prediction_context)}` },
            { role: 'user', content: question },
          ],
          stream: true,
          temperature: 0.6,
          max_tokens: 900,
        }

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify(llmPayload),
        })

        if (!res.ok || !res.body) throw new Error(`Groq ${res.status}`)
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
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
            } catch {}
          }
        }
      } catch (err) {
        send('error', { message: 'The Guru paused. Please try again.' })
        controller.close()
        return
      }

      if (fullResponse) {
        await service.from('astro_chat_messages').insert({
          session_id: sessionId,
          user_id: user.id,
          profile_id,
          chart_version_id: summary.chart_version_id,
          prediction_context_id: summary.id,
          role: 'assistant',
          content: fullResponse,
          topic: topic ?? 'general',
          model_used: 'groq/llama-3.3-70b',
        })
        send('done', { session_id: sessionId })
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
