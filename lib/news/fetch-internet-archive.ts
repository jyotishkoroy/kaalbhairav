/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { buildExcerpt, canonicalizeUrl } from './normalize'
import type { NewsSourceCandidate, NewsSourceConfig } from './types'

export class SourceUnavailableError extends Error {}

const archiveQueries = ['occult', 'tantra', 'shaivism', 'hinduism', 'mythology', 'esotericism', 'alchemy', 'hermeticism']

export async function fetchInternetArchiveSource(source: NewsSourceConfig, fetchImpl: typeof fetch = fetch, rng: () => number = Math.random) {
  if (!source.url || !source.archiveQuery) throw new SourceUnavailableError('Missing archive config')
  const query = archiveQueries[Math.floor(rng() * archiveQueries.length)] || archiveQueries[0]
  const params = new URLSearchParams({
    q: `subject:(${query})`,
    fl: 'identifier,title,date,creator,description,subject,addeddate,publicdate',
    sort: 'addeddate desc',
    rows: '20',
    output: 'json',
  })
  const response = await fetchImpl(`${source.url}?${params.toString()}`, {
    headers: { 'user-agent': 'TarayaiNewsBot/1.0; contact: jyotishko.roy@supershakti.in' },
  })
  if (!response.ok) throw new SourceUnavailableError(`HTTP ${response.status}`)
  const data = await response.json().catch(() => null)
  const docs = data?.response?.docs
  if (!Array.isArray(docs)) return []
  return docs.flatMap((doc: Record<string, unknown>) => {
    const identifier = String(doc.identifier || '').trim()
    const title = String(doc.title || identifier || '').trim()
    if (!identifier && !title) return []
    const excerpt = buildExcerpt(String(doc.description || ''))
    return [{
      sourceKey: source.key,
      sourceName: source.name,
      sourceType: source.sourceType,
      title: title || identifier,
      link: canonicalizeUrl(`https://archive.org/details/${identifier}`),
      externalId: identifier || null,
      description: excerpt,
      topicHints: source.topicHints,
      raw: doc,
    } satisfies NewsSourceCandidate]
  })
}
