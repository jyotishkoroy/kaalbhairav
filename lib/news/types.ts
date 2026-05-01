/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

export type NewsSourceType = 'internet_archive' | 'rss'

export type NewsSourceConfig = {
  key: string
  name: string
  sourceType: NewsSourceType
  url?: string
  archiveQuery?: string
  topicHints: string[]
  isActive: boolean
}

export type NewsTopic =
  | 'occult'
  | 'deity'
  | 'temple'
  | 'ritual'
  | 'tantra'
  | 'manuscript'
  | 'archaeology'
  | 'mythology'
  | 'religion'
  | 'esotericism'
  | 'archive'
  | 'other'

export type NewsSourceItem = {
  sourceKey: string
  sourceName: string
  sourceType: NewsSourceType
  title: string
  link: string
  externalId: string | null
  description: string
  topicHints: string[]
  raw: Record<string, unknown>
}

export type NewsSourceCandidate = {
  sourceKey: string
  sourceName: string
  sourceType: NewsSourceType
  title: string
  link: string
  externalId: string | null
  description: string
  topicHints: string[]
  raw: Record<string, unknown>
  canonicalUrl?: string
}

export type NewsIngestCandidate = {
  sourceKey: string
  sourceName: string
  sourceType: NewsSourceType
  title: string
  body: string
  excerpt: string
  topic: NewsTopic
  originalUrl: string
  canonicalUrl?: string | null
  externalId?: string | null
  publishedAt?: string | null
  raw: Record<string, unknown>
}

export type NewsIngestRunStatus = 'started' | 'published' | 'failed' | 'duplicate' | 'skipped'

export type NewsIngestRunResult = {
  ok: boolean
  status: NewsIngestRunStatus
  slot: 'morning' | 'evening' | 'manual'
  kolkataDate: string
  selectedSource?: string | null
  selectedTopic?: string | null
  postId?: string | null
  attemptedSources: string[]
  skippedDuplicates: unknown[]
  errors: unknown[]
  fallbackReason?: string | null
}
