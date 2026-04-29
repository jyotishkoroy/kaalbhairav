/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { NextRequest, NextResponse } from 'next/server'
import Parser from 'rss-parser'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

type NewsSource = {
  id: string
  name: string
  rss_url: string | null
}

const llmSchema = z.object({
  summary: z.string().min(20).max(1000),
  category: z
    .enum([
      'kaal_bhairav',
      'maa_tara',
      'kali',
      'ganesha',
      'shiva',
      'occult',
      'panchang',
      'festival',
      'general',
    ])
    .catch('general'),
})

function fallbackSummary(title: string, excerpt: string) {
  const cleanExcerpt = excerpt.replace(/\s+/g, ' ').trim()
  if (cleanExcerpt) {
    return cleanExcerpt.slice(0, 350)
  }

  return `A sourced item worth reviewing for Kaalbhairav readers: ${title}`
}

async function summarizeWithGroq(title: string, excerpt: string) {
  if (!process.env.GROQ_API_KEY) {
    return {
      summary: fallbackSummary(title, excerpt),
      category: 'general',
    }
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
            'You are a curator for a Hindu spirituality and occult news site. Given an article, write a 60-80 word commentary in a grounded, anti-hype voice that makes the reader want to click through to the original. Also assign ONE category from: kaal_bhairav, maa_tara, kali, ganesha, shiva, occult, panchang, festival, general. Respond ONLY as JSON: {"summary":"...","category":"..."}.',
        },
        {
          role: 'user',
          content: `Title: ${title}\n\nExcerpt: ${excerpt}`,
        },
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    return {
      summary: fallbackSummary(title, excerpt),
      category: 'general',
    }
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  let parsedContent: unknown = {}

  try {
    parsedContent = JSON.parse(content || '{}')
  } catch {
    parsedContent = {}
  }

  const parsed = llmSchema.safeParse(parsedContent)

  if (!parsed.success) {
    return {
      summary: fallbackSummary(title, excerpt),
      category: 'general',
    }
  }

  return parsed.data
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')

  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createServiceClient()
  const parser = new Parser()

  const { data: sources, error } = await supabase
    .from('news_sources')
    .select('id, name, rss_url')
    .eq('is_active', true)
    .not('rss_url', 'is', null)
    .returns<NewsSource[]>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let processed = 0
  let inserted = 0
  const failedSources: string[] = []

  for (const source of sources ?? []) {
    if (!source.rss_url) continue

    try {
      const feed = await parser.parseURL(source.rss_url)

      for (const item of feed.items.slice(0, 5)) {
        if (!item.link || !item.title) continue

        const { data: existingDraft } = await supabase
          .from('news_drafts')
          .select('id')
          .eq('source_url', item.link)
          .maybeSingle()

        if (existingDraft) continue

        const { data: existingPost } = await supabase
          .from('news_posts')
          .select('id')
          .eq('source_url', item.link)
          .maybeSingle()

        if (existingPost) continue

        processed++

        const excerpt = String(item.contentSnippet || item.content || '').slice(0, 1000)
        const summary = await summarizeWithGroq(item.title, excerpt)

        const { error: insertError } = await supabase.from('news_drafts').insert({
          source_id: source.id,
          source_url: item.link,
          original_title: item.title,
          original_excerpt: excerpt.slice(0, 500),
          llm_summary: summary.summary,
          llm_category: summary.category,
          cover_image_url: item.enclosure?.url ?? null,
          status: 'pending_review',
        })

        if (!insertError) {
          inserted++
        }
      }
    } catch (sourceError) {
      console.error(`Failed to process ${source.name}:`, sourceError)
      failedSources.push(source.name)
    }
  }

  return NextResponse.json({ processed, inserted, failedSources })
}
