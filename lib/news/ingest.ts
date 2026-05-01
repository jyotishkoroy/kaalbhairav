/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { revalidatePath } from 'next/cache'
import { createSlug } from './slug'
import { classifyTopic } from './topics'
import { NEWS_SOURCES } from './sources'
import { fetchRssSource, SourceUnavailableError as RssUnavailable } from './fetch-rss'
import { fetchInternetArchiveSource, SourceUnavailableError as ArchiveUnavailable } from './fetch-internet-archive'
import { buildExcerpt, canonicalizeUrl, normalizeBodyParts } from './normalize'
import { contentHash, titleHash, isDuplicateNewsPost } from './dedupe'
import { getKolkataDate } from './kolkata'
import { selectSourceQueue } from './select-random-source'
import { isProbablyEnglishText } from './language'
import type { NewsIngestRunResult, NewsSourceCandidate, NewsSourceConfig } from './types'

type SupabaseLike = {
  from(table: string): {
    select(columns: string): SelectLike
    insert(payload: Record<string, unknown>): InsertLike
    update(payload: Record<string, unknown>): ChainLike
    upsert(payload: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>
  }
}

type ChainLike = {
  eq(column: string, value: string): ChainLike
  maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
  single?(): Promise<{ data: { id: string } | null; error: { message: string } | null }>
  order?(column: string, options: { ascending: boolean }): ChainLike
  limit?(count: number): Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }>
}

type SelectLike = ChainLike

type InsertLike = {
  select(columns: string): {
    single(): Promise<{ data: { id: string }; error: { message: string } | null }>
  }
}

function sourceFetcher(source: NewsSourceConfig, fetchImpl: typeof fetch, rng: () => number) {
  return source.sourceType === 'internet_archive'
    ? fetchInternetArchiveSource(source, fetchImpl, rng)
    : fetchRssSource(source, fetchImpl)
}

export async function ingestNews({
  supabase,
  slot,
  now = new Date(),
  rng = Math.random,
  fetchImpl = fetch,
}: {
  supabase: SupabaseLike
  slot: 'morning' | 'evening' | 'manual'
  now?: Date
  rng?: () => number
  fetchImpl?: typeof fetch
}): Promise<NewsIngestRunResult> {
  const kolkataDate = getKolkataDate(now)
  const runBase = { slot, kolkataDate, attemptedSources: [] as string[], skippedDuplicates: [] as unknown[], errors: [] as unknown[] }

  const existingRunResult = await supabase.from('news_ingest_runs').select('*').eq('kolkata_date', kolkataDate).eq('slot', slot).maybeSingle()
  const existingRun = existingRunResult.data as { selected_post_id?: string; selected_source_key?: string | null; selected_topic?: string | null; fallback_reason?: string | null } | null
  if (existingRun?.selected_post_id) {
    return { ok: true, status: 'duplicate', ...runBase, selectedSource: existingRun.selected_source_key, selectedTopic: existingRun.selected_topic, postId: existingRun.selected_post_id, fallbackReason: existingRun.fallback_reason ?? null }
  }

  await supabase.from('news_ingest_runs').upsert({ slot, kolkata_date: kolkataDate, status: 'started', started_at: now.toISOString(), attempted_sources: [], skipped_duplicates: [], errors: [] }, { onConflict: 'kolkata_date,slot' })

  const sources = NEWS_SOURCES.filter((source) => source.isActive)
  const excludes = slot === 'evening' ? ['arkeonews'] : []
  const queue = selectSourceQueue({ sources, excludeSourceKeys: excludes, rng, allowExcludedFallback: true })
  const allAttempts: string[] = []
  const errors: unknown[] = []
  const duplicates: unknown[] = []
  let fallbackReason: string | null = null

  for (const source of queue) {
    allAttempts.push(source.key)
    try {
      const candidates = (await sourceFetcher(source, fetchImpl, rng)) as NewsSourceCandidate[]
      if (!candidates.length) {
        errors.push({ source: source.key, error: 'empty usable items' })
        continue
      }

      const candidate = candidates[0]
      const existing = await supabase
        .from('news_posts')
        .select('original_url, canonical_url, source_name, external_id, title_hash, content_hash')
      const existingRows = ((existing as { data?: Array<Record<string, unknown>> }).data ?? []) as Array<{
        original_url?: string | null
        canonical_url?: string | null
        source_name?: string | null
        external_id?: string | null
        title_hash?: string | null
        content_hash?: string | null
      }>

      const topic = classifyTopic(candidate.title, candidate.description, source.topicHints)
      const normalizedBody = normalizeBodyParts(candidate.title, candidate.description, topic)
      if (![candidate.title, candidate.description, normalizedBody].every(isProbablyEnglishText)) {
        errors.push({ source: source.key, error: 'rejected_non_english_content' })
        continue
      }
      const tHash = titleHash(candidate.title)
      const cHash = contentHash(candidate.title, normalizedBody)
      const duplicate = isDuplicateNewsPost({
        originalUrl: candidate.link,
        canonicalUrl: candidate.canonicalUrl,
        sourceName: candidate.sourceName,
        externalId: candidate.externalId,
        title: candidate.title,
        body: normalizedBody,
        existing: existingRows,
      })
      if (duplicate) {
        duplicates.push({ source: source.key, title: candidate.title })
        continue
      }

      const slug = createSlug(candidate.title)
      const { data: inserted, error } = await supabase.from('news_posts').insert({
        slug,
        title: candidate.title,
        body: normalizedBody,
        excerpt: buildExcerpt(candidate.description),
        status: 'published',
        topic,
        source_id: null,
        source_name: candidate.sourceName,
        source_type: candidate.sourceType,
        original_url: canonicalizeUrl(candidate.link),
        external_id: candidate.externalId,
        canonical_url: candidate.canonicalUrl ?? canonicalizeUrl(candidate.link),
        title_hash: tHash,
        content_hash: cHash,
        published_at: now.toISOString(),
        scheduled_slot: slot,
        kolkata_date: kolkataDate,
        raw: candidate.raw,
      }).select('id').single()

      if (error) {
        if (/duplicate|unique/i.test(error.message)) {
          duplicates.push({ source: source.key, title: candidate.title, reason: error.message })
          continue
        }
        errors.push({ source: source.key, error: error.message })
        continue
      }

      await supabase.from('news_ingest_runs').update({ selected_source_key: source.key, selected_source_name: source.name, selected_topic: topic, selected_post_id: inserted.id, status: 'published', finished_at: now.toISOString(), attempted_sources: allAttempts, skipped_duplicates: duplicates, errors, fallback_reason: fallbackReason }).eq('kolkata_date', kolkataDate).eq('slot', slot)
      revalidatePath('/news')
      revalidatePath(`/news/${slug}`)
      return { ok: true, status: 'published', slot, kolkataDate, selectedSource: source.key, selectedTopic: topic, postId: inserted.id, attemptedSources: allAttempts, skippedDuplicates: duplicates, errors, fallbackReason }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error'
      errors.push({ source: source.key, error: message })
      if (error instanceof ArchiveUnavailable || error instanceof RssUnavailable || /captcha|html|verification|denied|timeout|403|429/i.test(message)) {
        fallbackReason = fallbackReason ?? `source_failed:${source.key}`
      }
    }
  }

  await supabase.from('news_ingest_runs').update({ status: 'failed', finished_at: now.toISOString(), attempted_sources: allAttempts, skipped_duplicates: duplicates, errors, fallback_reason: fallbackReason }).eq('kolkata_date', kolkataDate).eq('slot', slot)
  return { ok: false, status: 'failed', slot, kolkataDate, attemptedSources: allAttempts, skippedDuplicates: duplicates, errors, fallbackReason }
}
