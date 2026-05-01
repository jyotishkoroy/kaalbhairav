import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const post = { id: '1', slug: 't', title: 'Title', body: 'Body', topic: 'ritual', source_name: 'Source', original_url: 'https://x.com', source_type: 'rss' }
const buildQuery = () => ({
  eq: () => buildQuery(),
  order: () => ({ limit: async () => ({ data: [{ ...post, excerpt: 'Body' }], error: null }) }),
  single: async () => ({ data: post, error: null }),
  maybeSingle: async () => ({ data: null, error: null }),
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) },
    from: vi.fn((table: string) => {
      if (table !== 'news_posts' && table !== 'news_post_likes') return { select: () => ({}) }
      return {
        select: () => buildQuery(),
      }
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

describe('page rendering', () => {
  it('renders title once', async () => {
    const { default: NewsPage } = await import('@/app/news/page')
    const html = renderToStaticMarkup(await NewsPage())
    expect(html.match(/Title/g)?.length).toBe(1)
  })
  it('renders body below heading and source line', async () => {
    const { default: NewsPage } = await import('@/app/news/page')
    const html = renderToStaticMarkup(await NewsPage())
    expect(html).toContain('Body')
    expect(html).toContain('Source:')
  })
  it('renders detail with safe source link', async () => {
    const { default: NewsPostPage } = await import('@/app/news/[slug]/page')
    const html = renderToStaticMarkup(await NewsPostPage({ params: Promise.resolve({ slug: 't' }) } as never))
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })
  it('detail renders heading and body', async () => {
    const { default: NewsPostPage } = await import('@/app/news/[slug]/page')
    const html = renderToStaticMarkup(await NewsPostPage({ params: Promise.resolve({ slug: 't' }) } as never))
    expect(html).toContain('Title')
    expect(html).toContain('Body')
  })
})
