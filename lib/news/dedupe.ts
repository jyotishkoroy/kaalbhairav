/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { normalizeTitle, sha256 } from './hash'
import { canonicalizeUrl } from './normalize'

export function titleHash(title: string) {
  return sha256(normalizeTitle(title))
}

export function contentHash(title: string, body: string) {
  return sha256(`${normalizeTitle(title)} ${normalizeTitle(body)}`)
}

export function isDuplicateNewsPost({
  originalUrl,
  canonicalUrl,
  sourceName,
  externalId,
  title,
  body,
  existing,
}: {
  originalUrl: string
  canonicalUrl?: string | null
  sourceName: string
  externalId?: string | null
  title: string
  body: string
  existing: Array<{
    original_url?: string | null
    canonical_url?: string | null
    source_name?: string | null
    external_id?: string | null
    title_hash?: string | null
    content_hash?: string | null
  }>
}) {
  const original = canonicalizeUrl(originalUrl)
  const canonical = canonicalUrl ? canonicalizeUrl(canonicalUrl) : null
  const titleHashValue = titleHash(title)
  const bodyHashValue = contentHash(title, body)

  return existing.some((row) => {
    if (row.original_url && canonicalizeUrl(row.original_url) === original) return true
    if (canonical && row.canonical_url && canonicalizeUrl(row.canonical_url) === canonical) return true
    if (externalId && row.source_name === sourceName && row.external_id === externalId) return true
    if (row.title_hash === titleHashValue) return true
    if (row.content_hash === bodyHashValue) return true
    return false
  })
}
