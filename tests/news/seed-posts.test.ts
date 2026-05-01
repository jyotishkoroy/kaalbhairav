/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'
import { TEST_NEWS_POSTS, buildSeedNewsRow, assertEnglishSeedPost } from '@/lib/news/test-seed-posts'
import { contentHash, titleHash } from '@/lib/news/dedupe'

describe('news seed posts', () => {
  it('contains six English-only posts', () => {
    expect(TEST_NEWS_POSTS).toHaveLength(6)
    for (const post of TEST_NEWS_POSTS) assertEnglishSeedPost(post)
  })

  it('keeps slugs, urls, and external ids unique', () => {
    expect(new Set(TEST_NEWS_POSTS.map((post) => post.slug)).size).toBe(6)
    expect(new Set(TEST_NEWS_POSTS.map((post) => post.original_url)).size).toBe(6)
    expect(new Set(TEST_NEWS_POSTS.map((post) => post.external_id)).size).toBe(6)
  })

  it('generates stable hashes per post', () => {
    const rows = TEST_NEWS_POSTS.map((post) => buildSeedNewsRow(post, new Date('2026-05-01T00:00:00.000Z')))
    expect(new Set(rows.map((row) => row.title_hash)).size).toBe(6)
    expect(new Set(rows.map((row) => row.content_hash)).size).toBe(6)
    expect(rows[0].title_hash).toBe(titleHash(TEST_NEWS_POSTS[0].title))
    expect(rows[0].content_hash).toBe(contentHash(TEST_NEWS_POSTS[0].title, TEST_NEWS_POSTS[0].body))
  })

  it('marks posts published with manual slot and seed raw metadata', () => {
    const row = buildSeedNewsRow(TEST_NEWS_POSTS[0], new Date('2026-05-01T00:00:00.000Z'))
    expect(row.status).toBe('published')
    expect(row.scheduled_slot).toBe('manual')
    expect(row.raw).toMatchObject({ seed: true, language: 'en', phase: 'phase-1-news-page-fix' })
  })

  it('preserves source metadata for the six fixtures', () => {
    expect(TEST_NEWS_POSTS.map((post) => post.source_name)).toEqual([
      'Internet Archive',
      'Correspondences Journal',
      'EIN Religion News',
      'Archaeology Magazine',
      'Arkeonews',
      'Live Science Archaeology',
    ])
  })
})
