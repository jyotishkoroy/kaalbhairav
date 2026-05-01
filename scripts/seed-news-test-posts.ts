/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { buildSeedNewsRow, TEST_NEWS_POSTS, assertEnglishSeedPost } from '@/lib/news/test-seed-posts'

async function main() {
  const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((name) => !process.env[name])
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { data: existing, error } = await supabase.from('news_posts').select('original_url, external_id, slug, title_hash, content_hash, status')
  if (error) throw new Error(error.message)

  const existingRows = (existing ?? []) as Array<Record<string, unknown>>
  const now = new Date()
  let inserted = 0
  let skipped = 0

  for (const post of TEST_NEWS_POSTS) {
    assertEnglishSeedPost(post)

    const duplicate = existingRows.some((row) =>
      row.original_url === post.original_url ||
      row.external_id === post.external_id ||
      row.slug === post.slug ||
      row.title_hash === buildSeedNewsRow(post, now).title_hash ||
      row.content_hash === buildSeedNewsRow(post, now).content_hash
    )

    if (duplicate) {
      skipped += 1
      continue
    }

    const row = buildSeedNewsRow(post, now)
    const { error: insertError } = await supabase.from('news_posts').upsert(row, { onConflict: 'original_url' })
    if (insertError) throw new Error(insertError.message)
    inserted += 1
  }

  console.log(JSON.stringify({ ok: true, inserted, skipped, total: TEST_NEWS_POSTS.length }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
