/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const state = vi.hoisted(() => ({
  user: { id: 'u1' } as null | { id: string },
  posts: [] as Array<Record<string, unknown>>,
  likes: [] as Array<Record<string, unknown>>,
}))

function buildPostQuery() {
  const sortedPosts = () =>
    [...state.posts].sort((left, right) => {
      const leftPublished = String(left.published_at ?? '')
      const rightPublished = String(right.published_at ?? '')
      if (leftPublished !== rightPublished) return rightPublished.localeCompare(leftPublished)
      return String(right.created_at ?? '').localeCompare(String(left.created_at ?? ''))
    })
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    limit: async () => ({ data: sortedPosts(), error: null }),
    maybeSingle: async () => ({ data: sortedPosts()[0] ?? null, error: null }),
    single: async () => ({ data: sortedPosts()[0] ?? null, error: null }),
  }
  return {
    ...query,
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: state.user } })) },
    from: vi.fn((table: string) => {
      if (table === 'news_posts') return buildPostQuery()
      if (table === 'news_post_likes') return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.likes[0] ?? null, error: null }) }) }) }) }
      return { select: () => ({}) }
    }),
  })),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('redirect')
  }),
  notFound: vi.fn(() => {
    throw new Error('notfound')
  }),
}))

describe('news page rendering', () => {
  it('renders published rows newest-first', async () => {
    state.posts = [
      { id: '2', slug: 'second', title: 'Second', excerpt: 'Second excerpt', topic: 'ritual', source_name: 'Source 2', published_at: '2026-05-01T12:00:00.000Z', created_at: '2026-05-01T12:00:00.000Z' },
      { id: '1', slug: 'first', title: 'First', excerpt: 'First excerpt', topic: 'archive', source_name: 'Source 1', published_at: '2026-05-02T12:00:00.000Z', created_at: '2026-05-02T12:00:00.000Z' },
    ]
    const { default: NewsPage } = await import('@/app/news/page')
    const html = renderToStaticMarkup(await NewsPage())
    expect(html.indexOf('First')).toBeLessThan(html.indexOf('Second'))
    expect(html).toContain('Source: Source 1')
  })

  it('shows a safe empty state when no rows exist', async () => {
    state.posts = []
    const { default: NewsPage } = await import('@/app/news/page')
    const html = renderToStaticMarkup(await NewsPage())
    expect(html).toContain('No published news posts yet.')
  })

  it('renders null published_at rows without crashing', async () => {
    state.posts = [{ id: '1', slug: 'draftish', title: 'Draftish', excerpt: 'x', topic: 'other', source_name: 'Unknown', published_at: null, created_at: '2026-05-01T12:00:00.000Z' }]
    const { default: NewsPage } = await import('@/app/news/page')
    const html = renderToStaticMarkup(await NewsPage())
    expect(html).toContain('Unpublished date')
  })

  it('renders detail title, body, source line, and controls', async () => {
    state.posts = [{ id: '1', slug: 't', title: 'Title', body: 'Body', topic: 'ritual', source_name: 'Source', original_url: 'https://x.com', source_type: 'rss', excerpt: 'Body' }]
    state.likes = []
    const { default: NewsPostPage } = await import('@/app/news/[slug]/page')
    const html = renderToStaticMarkup(await NewsPostPage({ params: Promise.resolve({ slug: 't' }) } as never))
    expect(html).toContain('Title')
    expect(html).toContain('Body')
    expect(html).toContain('Source:')
    expect(html).toContain('Like')
    expect(html).toContain('Share')
  })

  it('renders safe source link attributes', async () => {
    state.posts = [{ id: '1', slug: 't', title: 'Title', body: 'Body', topic: 'ritual', source_name: 'Source', original_url: 'https://x.com', source_type: 'rss', excerpt: 'Body' }]
    const { default: NewsPostPage } = await import('@/app/news/[slug]/page')
    const html = renderToStaticMarkup(await NewsPostPage({ params: Promise.resolve({ slug: 't' }) } as never))
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('throws notFound for missing slug', async () => {
    state.posts = []
    const { default: NewsPostPage } = await import('@/app/news/[slug]/page')
    await expect(NewsPostPage({ params: Promise.resolve({ slug: 'missing' }) } as never)).rejects.toThrow('notfound')
  })
})
