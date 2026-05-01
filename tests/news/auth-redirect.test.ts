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
})
