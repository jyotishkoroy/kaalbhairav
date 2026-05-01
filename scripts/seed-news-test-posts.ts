/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { buildSeedNewsRow, TEST_NEWS_POSTS, assertEnglishSeedPost } from '../lib/news/test-seed-posts.ts'
import { mergeSeedEnv } from './news-seed-env.ts'

const OP_TIMEOUT_MS = 20_000

type NewsSchemaKind = 'modern' | 'legacy'

function withTimeout(promise: any, label: string, timeoutMs = OP_TIMEOUT_MS): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    promise.then(
      (value: any) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: any) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

function isLocalSupabaseUrl(url: string) {
  return /^https?:\/\/127\.0\.0\.1(?::\d+)?\/?$/i.test(url) || /^https?:\/\/localhost(?::\d+)?\/?$/i.test(url)
}

async function detectNewsSchema(supabase: any) {
  const legacyProbe: any = await withTimeout(supabase.from('news_posts').select('source_url').limit(1), 'probe legacy schema')
  if (!legacyProbe.error) return 'legacy' as const

  const modernProbe: any = await withTimeout(supabase.from('news_posts').select('original_url').limit(1), 'probe modern schema')
  if (!modernProbe.error) return 'modern' as const

  throw new Error(`Unable to determine news_posts schema: ${legacyProbe.error?.message ?? 'legacy probe failed'}; ${modernProbe.error?.message ?? 'modern probe failed'}`)
}

function mapSeedPayload(row: ReturnType<typeof buildSeedNewsRow>, schema: NewsSchemaKind) {
  if (schema === 'legacy') {
    const category = row.topic === 'archive' || row.topic === 'archaeology'
      ? 'general'
      : row.topic === 'temple'
        ? 'kaal_bhairav'
        : 'occult'

    return {
      slug: row.slug,
      title: row.title,
      summary: row.excerpt,
      body: row.body,
      category,
      source_name: row.source_name,
      source_url: row.original_url,
      status: row.status,
      published_at: row.published_at,
    }
  }

  return row
}

async function main() {
  const { env } = mergeSeedEnv()
  const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((name) => !env[name])
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  const target = env.NEWS_SEED_TARGET ?? 'live'
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!
  if (isLocalSupabaseUrl(supabaseUrl) && target !== 'local') {
    throw new Error('Refusing to seed local Supabase for live news. Set NEWS_SEED_TARGET=local to allow local seeding.')
  }

  const supabase = createSupabaseClient(
    supabaseUrl,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const schema = await detectNewsSchema(supabase)
  const existingSelect = schema === 'legacy'
    ? 'slug, source_url, source_name, status, title, summary, body'
    : 'slug, original_url, external_id, source_name, status, title, excerpt, body, title_hash, content_hash'
  const { data: existing, error }: any = await withTimeout(
    supabase.from('news_posts').select(existingSelect),
    'fetch existing news posts'
  )
  if (error) throw new Error(error.message)

  const existingRows = (existing ?? []) as Array<Record<string, unknown>>
  const now = new Date()
  let inserted = 0
  let skipped = 0

  for (const post of TEST_NEWS_POSTS) {
    assertEnglishSeedPost(post)
  }

  for (const post of TEST_NEWS_POSTS) {
    const row = buildSeedNewsRow(post, now)

    const duplicate = existingRows.some((existingRow) =>
      existingRow.original_url === post.original_url ||
      existingRow.source_url === post.original_url ||
      (existingRow.external_id != null && existingRow.external_id === post.external_id) ||
      existingRow.slug === row.slug ||
      existingRow.title_hash === row.title_hash ||
      existingRow.content_hash === row.content_hash ||
      existingRow.title === row.title ||
      existingRow.body === row.body
    )

    if (duplicate) {
      skipped += 1
      continue
    }

    const payload = mapSeedPayload(row, schema)
    const { error: insertError }: any = await withTimeout(
      supabase.from('news_posts').upsert(payload as Record<string, unknown>, { onConflict: schema === 'legacy' ? 'slug' : 'original_url' }),
      `upsert ${post.slug}`
    )
    if (insertError) throw new Error(insertError.message)
    inserted += 1
  }

  const { count: publishedCount, error: countError }: any = await withTimeout(
    supabase.from('news_posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    'verify published count'
  )
  if (countError) throw new Error(countError.message)

  const seededUrls = TEST_NEWS_POSTS.map((post) => post.original_url)
  const { data: seededRows, error: seededError }: any = await withTimeout(
    schema === 'legacy'
      ? supabase.from('news_posts').select('source_url').in('source_url', seededUrls)
      : supabase.from('news_posts').select('original_url').in('original_url', seededUrls),
    'verify seeded urls'
  )
  if (seededError) throw new Error(seededError.message)

  console.log(JSON.stringify({
    ok: true,
    inserted,
    skipped,
    total: TEST_NEWS_POSTS.length,
    schema,
    published_count: publishedCount ?? null,
    verified_seed_urls: seededRows?.length ?? 0,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
