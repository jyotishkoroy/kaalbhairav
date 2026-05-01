import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchRss = vi.fn()
const fetchArchive = vi.fn()
const selectQueue = vi.fn()

vi.mock('@/lib/news/fetch-rss', () => ({ fetchRssSource: (...args: unknown[]) => fetchRss(...args), SourceUnavailableError: class extends Error {} }))
vi.mock('@/lib/news/fetch-internet-archive', () => ({ fetchInternetArchiveSource: (...args: unknown[]) => fetchArchive(...args), SourceUnavailableError: class extends Error {} }))
vi.mock('@/lib/news/select-random-source', () => ({ selectSourceQueue: (...args: unknown[]) => selectQueue(...args) }))
vi.mock('@/lib/news/sources', () => ({
  NEWS_SOURCES: [
    { key: 'morning', name: 'Morning', sourceType: 'rss', url: 'https://m', topicHints: ['ritual'], isActive: true },
    { key: 'evening', name: 'Evening', sourceType: 'rss', url: 'https://e', topicHints: ['temple'], isActive: true },
    { key: 'arch', name: 'Archive', sourceType: 'internet_archive', url: 'https://a', archiveQuery: 'x', topicHints: ['archive'], isActive: true },
  ],
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

function makeSupabase(existing: unknown[] = []) {
  return {
    from(table: string) {
      if (table === 'news_posts') {
        return { select: () => ({ data: existing, error: null }), insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'post-1' }, error: null }) }) }) }
      }
      if (table === 'news_ingest_runs') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
          upsert: async () => ({ data: null, error: null }),
          update: () => ({ eq: () => ({ eq: async () => ({ data: null, error: null }) }) }),
        }
      }
      return { select: () => ({ data: [], error: null }) }
    },
  }
}

beforeEach(() => {
  fetchRss.mockReset()
  fetchArchive.mockReset()
  selectQueue.mockReset()
})

describe('ingestion flow', () => {
  it('morning slot publishes one post', async () => {
    selectQueue.mockReturnValue([{ key: 'morning', name: 'Morning', sourceType: 'rss', topicHints: ['ritual'], link: 'https://x.com', description: 'D', externalId: 'g', title: 'T', sourceKey: 'morning', sourceName: 'Morning', raw: {}, isActive: true }])
    fetchRss.mockResolvedValue([{ sourceKey: 'morning', sourceName: 'Morning', sourceType: 'rss', title: 'T', link: 'https://x.com', externalId: 'g', description: 'D', topicHints: ['ritual'], raw: {} }])
    const { ingestNews } = await import('@/lib/news/ingest')
    const result = await ingestNews({ supabase: makeSupabase() as never, slot: 'morning', fetchImpl: fetch as never, rng: () => 0.1 })
    expect(result.ok).toBe(true)
  })
  it('evening avoids morning source', async () => {
    selectQueue.mockReturnValue([{ key: 'evening', name: 'Evening', sourceType: 'rss', topicHints: ['temple'], link: 'https://x.com', description: 'D', externalId: 'g', title: 'T', sourceKey: 'evening', sourceName: 'Evening', raw: {}, isActive: true }])
    fetchRss.mockResolvedValue([{ sourceKey: 'evening', sourceName: 'Evening', sourceType: 'rss', title: 'T', link: 'https://x.com', externalId: 'g', description: 'D', topicHints: ['temple'], raw: {} }])
    const { ingestNews } = await import('@/lib/news/ingest')
    const result = await ingestNews({ supabase: makeSupabase() as never, slot: 'evening', fetchImpl: fetch as never, rng: () => 0.1 })
    expect(result.selectedSource).toBe('evening')
  })
  it('first source unavailable second succeeds', async () => {
    selectQueue.mockReturnValue([{ key: 'morning', name: 'Morning', sourceType: 'rss', topicHints: ['ritual'], link: 'https://x.com', description: 'D', externalId: 'g', title: 'T', sourceKey: 'morning', sourceName: 'Morning', raw: {}, isActive: true }, { key: 'evening', name: 'Evening', sourceType: 'rss', topicHints: ['temple'], link: 'https://y.com', description: 'D', externalId: 'g2', title: 'T2', sourceKey: 'evening', sourceName: 'Evening', raw: {}, isActive: true }])
    fetchRss.mockRejectedValueOnce(new Error('captcha')).mockResolvedValue([{ sourceKey: 'evening', sourceName: 'Evening', sourceType: 'rss', title: 'T', link: 'https://x.com', externalId: 'g', description: 'D', topicHints: ['temple'], raw: {} }])
    const { ingestNews } = await import('@/lib/news/ingest')
    const result = await ingestNews({ supabase: makeSupabase() as never, slot: 'morning', fetchImpl: fetch as never, rng: () => 0.1 })
    expect(result.errors.length).toBeGreaterThan(0)
  })
  it('duplicate candidate is skipped then second inserts', async () => {
    selectQueue.mockReturnValue([{ key: 'morning', name: 'Morning', sourceType: 'rss', topicHints: ['ritual'], link: 'https://x.com', description: 'D', externalId: 'g', title: 'T', sourceKey: 'morning', sourceName: 'Morning', raw: {}, isActive: true }, { key: 'evening', name: 'Evening', sourceType: 'rss', topicHints: ['temple'], link: 'https://y.com', description: 'D', externalId: 'g2', title: 'T2', sourceKey: 'evening', sourceName: 'Evening', raw: {}, isActive: true }])
    fetchRss.mockResolvedValue([{ sourceKey: 'morning', sourceName: 'Morning', sourceType: 'rss', title: 'T', link: 'https://x.com', externalId: 'g', description: 'D', topicHints: ['ritual'], raw: {} }])
    const { ingestNews } = await import('@/lib/news/ingest')
    const result = await ingestNews({ supabase: makeSupabase([{ original_url: 'https://x.com', source_name: 'Morning', title_hash: 'h', content_hash: 'c' }]) as never, slot: 'morning', fetchImpl: fetch as never, rng: () => 0.1 })
    expect(result.skippedDuplicates.length).toBeGreaterThan(0)
  })
})
