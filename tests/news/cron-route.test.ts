import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/cron/rss-ingest/route'
import { NextRequest } from 'next/server'

const ingestMock = vi.fn()

vi.mock('@/lib/news/ingest', () => ({ ingestNews: (...args: unknown[]) => ingestMock(...args) }))
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn(() => ({})) }))

beforeEach(() => {
  ingestMock.mockReset()
  process.env.NEWS_CRON_SECRET = 'secret'
})

describe('cron route', () => {
  it('rejects missing auth', async () => {
    const res = await GET(new NextRequest('https://x.com/api/cron/rss-ingest'))
    expect(res.status).toBe(401)
  })
  it('rejects wrong auth', async () => {
    const res = await GET(new NextRequest('https://x.com/api/cron/rss-ingest', { headers: { authorization: 'Bearer nope' } }))
    expect(res.status).toBe(401)
  })
  it('calls morning slot', async () => {
    ingestMock.mockResolvedValue({ ok: true, status: 'published', attemptedSources: [], skippedDuplicates: [], errors: [] })
    const res = await GET(new NextRequest('https://x.com/api/cron/rss-ingest?slot=morning', { headers: { authorization: 'Bearer secret' } }))
    expect((await res.json()).slot).toBe('morning')
  })
  it('calls evening slot', async () => {
    ingestMock.mockResolvedValue({ ok: true, status: 'published', attemptedSources: [], skippedDuplicates: [], errors: [] })
    const res = await GET(new NextRequest('https://x.com/api/cron/rss-ingest?slot=evening', { headers: { authorization: 'Bearer secret' } }))
    expect((await res.json()).slot).toBe('evening')
  })
  it('returns ok true with errors array populated', async () => {
    ingestMock.mockResolvedValue({ ok: true, status: 'published', selectedSource: 'x', selectedTopic: 'ritual', postId: 'p', attemptedSources: ['x'], skippedDuplicates: [], errors: ['warn'], fallbackReason: 'fallback' })
    const res = await GET(new NextRequest('https://x.com/api/cron/rss-ingest?slot=manual', { headers: { authorization: 'Bearer secret' } }))
    expect((await res.json()).errors).toEqual(['warn'])
  })
})
