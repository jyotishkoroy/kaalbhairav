/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import Parser from 'rss-parser'
import { buildExcerpt, canonicalizeUrl } from './normalize'
import type { NewsSourceCandidate, NewsSourceConfig } from './types'

export class SourceUnavailableError extends Error {}

const parser = new Parser()

function looksLikeBlocked(body: string, contentType: string | null) {
  const lower = body.toLowerCase()
  return (
    (contentType?.includes('text/html') ?? false) ||
    /<html/i.test(body) ||
    lower.includes('verify you are human') ||
    lower.includes('captcha') ||
    lower.includes('access denied')
  )
}

export async function fetchRssSource(source: NewsSourceConfig, fetchImpl: typeof fetch = fetch) {
  if (!source.url) throw new SourceUnavailableError('Missing RSS URL')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetchImpl(source.url, {
      headers: { 'user-agent': 'TarayaiNewsBot/1.0; contact: jyotishko.roy@supershakti.in' },
      signal: controller.signal,
    })
    const body = await response.text()
    if (!response.ok) throw new SourceUnavailableError(`HTTP ${response.status}`)
    if (looksLikeBlocked(body, response.headers.get('content-type'))) throw new SourceUnavailableError('Blocked or human verification page')

    const feed = await parser.parseString(body)
    const items = (feed.items ?? []).map((item) => {
      const title = String(item.title || '').trim()
      const link = String(item.link || '').trim()
      const description = buildExcerpt(String(item.contentSnippet || item.content || item.summary || item.contentEncoded || item.description || ''))
      if (!title || !link) return null
      return {
        sourceKey: source.key,
        sourceName: source.name,
        sourceType: source.sourceType,
        title,
        link: canonicalizeUrl(link),
        externalId: String(item.guid || item.id || link).trim(),
        description,
        topicHints: source.topicHints,
        raw: item as never,
      } satisfies NewsSourceCandidate
    }).filter(Boolean) as NewsSourceCandidate[]
    return items
  } catch (error) {
    if (error instanceof SourceUnavailableError) throw error
    throw new SourceUnavailableError(error instanceof Error ? error.message : 'RSS fetch failed')
  } finally {
    clearTimeout(timeout)
  }
}
