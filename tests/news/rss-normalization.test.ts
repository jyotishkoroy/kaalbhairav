import { describe, expect, it, vi } from 'vitest'
import { fetchRssSource, SourceUnavailableError } from '@/lib/news/fetch-rss'
import { NEWS_SOURCES } from '@/lib/news/sources'

describe('rss normalization', () => {
  const source = NEWS_SOURCES[1]
  it('parses valid rss item', async () => {
    const fetchImpl = vi.fn(async () => new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Feed</title><item><title>T</title><link>https://x.com</link><description>D</description><guid>g</guid><pubDate>Wed, 01 May 2026 00:00:00 GMT</pubDate></item></channel></rss>`, { headers: { 'content-type': 'application/rss+xml' } }))
    const items = await fetchRssSource(source, fetchImpl as never)
    expect(items[0]?.title).toBe('T')
  })
  it('uses link when guid missing', async () => {
    const fetchImpl = vi.fn(async () => new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Feed</title><item><title>T</title><link>https://x.com</link><description>D</description></item></channel></rss>`, { headers: { 'content-type': 'application/rss+xml' } }))
    const items = await fetchRssSource(source, fetchImpl as never)
    expect(items[0]?.externalId).toBe('https://x.com')
  })
  it('sanitizes html description', async () => {
    const fetchImpl = vi.fn(async () => new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Feed</title><item><title>T</title><link>https://x.com</link><description><![CDATA[<script>x</script><b>safe</b>]]></description></item></channel></rss>`, { headers: { 'content-type': 'application/rss+xml' } }))
    const items = await fetchRssSource(source, fetchImpl as never)
    expect(items[0]?.description).toContain('safe')
  })
  it('reports invalid xml as unavailable', async () => {
    const fetchImpl = vi.fn(async () => new Response(`not xml`, { headers: { 'content-type': 'application/rss+xml' } }))
    await expect(fetchRssSource(source, fetchImpl as never)).rejects.toBeInstanceOf(SourceUnavailableError)
  })
  it('reports captcha page as unavailable', async () => {
    const fetchImpl = vi.fn(async () => new Response(`<html>verify you are human</html>`, { headers: { 'content-type': 'text/html' } }))
    await expect(fetchRssSource(source, fetchImpl as never)).rejects.toBeInstanceOf(SourceUnavailableError)
  })
})
