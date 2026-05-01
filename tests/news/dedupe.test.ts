import { describe, expect, it } from 'vitest'
import { isDuplicateNewsPost, contentHash } from '@/lib/news/dedupe'

describe('news dedupe', () => {
  const row = { original_url: 'https://a.com/x', canonical_url: 'https://a.com/x', source_name: 'A', external_id: '1', title_hash: 't', content_hash: 'c' }
  it('detects same original_url', () => expect(isDuplicateNewsPost({ originalUrl: 'https://a.com/x', sourceName: 'A', title: 'T', body: 'B', existing: [row] })).toBe(true))
  it('detects same source_name + external_id', () => expect(isDuplicateNewsPost({ originalUrl: 'https://b.com/y', sourceName: 'A', externalId: '1', title: 'T', body: 'B', existing: [row] })).toBe(true))
  it('normalizes title punctuation case', () => expect(isDuplicateNewsPost({ originalUrl: 'https://b.com/y', sourceName: 'A', title: 'Hello, World!', body: 'B', existing: [{ original_url: 'https://c.com/z', source_name: 'A', title_hash: 'dummy', content_hash: contentHash('hello world', 'B') }] })).toBe(true))
  it('same title and summary produce same hash', () => expect(contentHash('Hello World', 'Summary')).toBe(contentHash('hello world', 'Summary!')))
  it('different data is not duplicate', () => expect(isDuplicateNewsPost({ originalUrl: 'https://b.com/y', sourceName: 'A', title: 'X', body: 'Y', existing: [] })).toBe(false))
})
