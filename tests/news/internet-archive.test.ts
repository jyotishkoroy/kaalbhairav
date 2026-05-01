import { describe, expect, it, vi } from 'vitest'
import { fetchInternetArchiveSource } from '@/lib/news/fetch-internet-archive'
import { NEWS_SOURCES } from '@/lib/news/sources'

describe('internet archive', () => {
  const source = NEWS_SOURCES[0]
  it('maps identifier to archive details url', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ response: { docs: [{ identifier: 'id1', title: 'Title' }] } }), { headers: { 'content-type': 'application/json' } }))
    const items = await fetchInternetArchiveSource(source, fetchImpl as never, () => 0.1)
    expect(items[0]?.link).toBe('https://archive.org/details/id1')
  })
  it('normalizes creator and subject arrays', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ response: { docs: [{ identifier: 'id1', title: 'Title', creator: ['A'], subject: ['B'] }] } }), { headers: { 'content-type': 'application/json' } }))
    await expect(fetchInternetArchiveSource(source, fetchImpl as never, () => 0.1)).resolves.not.toThrow()
  })
  it('handles missing description', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ response: { docs: [{ identifier: 'id1', title: 'Title' }] } }), { headers: { 'content-type': 'application/json' } }))
    await expect(fetchInternetArchiveSource(source, fetchImpl as never, () => 0.1)).resolves.toHaveLength(1)
  })
  it('uses identifier when missing title', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ response: { docs: [{ identifier: 'id1' }] } }), { headers: { 'content-type': 'application/json' } }))
    const items = await fetchInternetArchiveSource(source, fetchImpl as never, () => 0.1)
    expect(items[0]?.title).toBe('id1')
  })
  it('returns empty array for empty docs', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ response: { docs: [] } }), { headers: { 'content-type': 'application/json' } }))
    await expect(fetchInternetArchiveSource(source, fetchImpl as never, () => 0.1)).resolves.toEqual([])
  })
})
