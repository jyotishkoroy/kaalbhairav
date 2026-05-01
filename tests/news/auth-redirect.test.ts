/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    from: vi.fn(() => ({ select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) })),
  })),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('redirect')
  }),
}))

describe('news auth redirect', () => {
  it('redirects logged-out users from /news', async () => {
    const { default: NewsPage } = await import('@/app/news/page')
    await expect(NewsPage()).rejects.toThrow('redirect')
  })
  it('redirects logged-out users from /news/[slug]', async () => {
    const { default: NewsPostPage } = await import('@/app/news/[slug]/page')
    await expect(NewsPostPage({ params: Promise.resolve({ slug: 'missing' }) } as never)).rejects.toThrow('redirect')
  })
})
