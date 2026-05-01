/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { titleHash, contentHash } from './dedupe'
import { isProbablyEnglishText } from './language'
import { classifyTopic } from './topics'
import { createSlug } from './slug'
import { getKolkataDate } from './kolkata'

export type SeedPost = {
  title: string
  slug: string
  topic: string
  source_name: string
  source_type: string
  original_url: string
  external_id: string
  excerpt: string
  body: string
}

export const TEST_NEWS_POSTS: SeedPost[] = [
  {
    title: 'Rare Occult Text Added to the Internet Archive',
    slug: 'rare-occult-text-added-to-the-internet-archive',
    topic: 'archive',
    source_name: 'Internet Archive',
    source_type: 'internet_archive',
    original_url: 'https://archive.org/details/test-rare-occult-text-tarayai',
    external_id: 'test-rare-occult-text-tarayai',
    excerpt: 'A rare occult text has been added as a test archive discovery for Tarayai readers.',
    body: 'A rare occult text has been added as a test archive discovery for Tarayai readers.\n\nThis post is useful for testing the archive discovery flow. It represents the kind of rare text, manuscript, or esoteric source that the automated news system can surface from public archives.\n\nRead the original source for full context.',
  },
  {
    title: 'New Esotericism Journal Issue Highlights Ritual and Ecology',
    slug: 'new-esotericism-journal-issue-highlights-ritual-and-ecology',
    topic: 'esotericism',
    source_name: 'Correspondences Journal',
    source_type: 'rss',
    original_url: 'https://correspondencesjournal.com/test-esotericism-ritual-ecology',
    external_id: 'test-correspondences-ritual-ecology',
    excerpt: 'A test journal update highlights esoteric research connecting ritual, ecology, and modern occult studies.',
    body: 'A test journal update highlights esoteric research connecting ritual, ecology, and modern occult studies.\n\nThis post is useful for testing scholarly esotericism content on Tarayai. It represents the type of academic and research-oriented material that should appear alongside daily discovery posts.\n\nRead the original source for full context.',
  },
  {
    title: 'Temple Festival Announcement Draws Pilgrims and Devotees',
    slug: 'temple-festival-announcement-draws-pilgrims-and-devotees',
    topic: 'religion',
    source_name: 'EIN Religion News',
    source_type: 'rss',
    original_url: 'https://religion.einnews.com/test-temple-festival-announcement',
    external_id: 'test-ein-temple-festival',
    excerpt: 'A test religion news item reports a major temple festival attracting pilgrims and devotees.',
    body: 'A test religion news item reports a major temple festival attracting pilgrims and devotees.\n\nThis post is useful for testing religion and temple-related updates on Tarayai. It represents the kind of public religious development that can be curated without copying full articles.\n\nRead the original source for full context.',
  },
  {
    title: 'Ancient Temple Shrine Uncovered During Excavation',
    slug: 'ancient-temple-shrine-uncovered-during-excavation',
    topic: 'temple',
    source_name: 'Archaeology Magazine',
    source_type: 'rss',
    original_url: 'https://archaeology.org/test-ancient-temple-shrine',
    external_id: 'test-archaeology-temple-shrine',
    excerpt: 'A test archaeology report describes an ancient temple shrine uncovered during excavation.',
    body: 'A test archaeology report describes an ancient temple shrine uncovered during excavation.\n\nThis post is useful for testing ancient discovery coverage on Tarayai. It represents the type of temple, shrine, and sacred-site discovery that should appear in the news feed.\n\nRead the original source for full context.',
  },
  {
    title: 'Cuneiform Curse Tablet Reveals Ancient Ritual Practice',
    slug: 'cuneiform-curse-tablet-reveals-ancient-ritual-practice',
    topic: 'ritual',
    source_name: 'Arkeonews',
    source_type: 'rss',
    original_url: 'https://arkeonews.net/test-cuneiform-curse-tablet',
    external_id: 'test-arkeonews-curse-tablet',
    excerpt: 'A test archaeology item describes a cuneiform curse tablet connected with ancient ritual practice.',
    body: 'A test archaeology item describes a cuneiform curse tablet connected with ancient ritual practice.\n\nThis post is useful for testing ritual and manuscript-related discovery coverage. It represents the kind of ancient religious or magical object that Tarayai can classify and display.\n\nRead the original source for full context.',
  },
  {
    title: 'Tomb Discovery Suggests Unknown Ancient Burial Ritual',
    slug: 'tomb-discovery-suggests-unknown-ancient-burial-ritual',
    topic: 'archaeology',
    source_name: 'Live Science Archaeology',
    source_type: 'rss',
    original_url: 'https://www.livescience.com/test-ancient-burial-ritual',
    external_id: 'test-live-science-burial-ritual',
    excerpt: 'A test science news item describes a tomb discovery that may suggest an unknown ancient burial ritual.',
    body: 'A test science news item describes a tomb discovery that may suggest an unknown ancient burial ritual.\n\nThis post is useful for testing archaeology and ancient-world coverage on Tarayai. It represents the type of discovery-focused article that should appear in the automated news feed.\n\nRead the original source for full context.',
  },
]

export function buildSeedNewsRow(post: SeedPost, now: Date) {
  const topic = classifyTopic(post.title, post.excerpt, [post.topic])
  return {
    slug: createSlug(post.slug || post.title),
    title: post.title,
    body: post.body.trim(),
    excerpt: post.excerpt,
    status: 'published',
    topic,
    source_name: post.source_name,
    source_type: post.source_type,
    original_url: post.original_url,
    external_id: post.external_id,
    title_hash: titleHash(post.title),
    content_hash: contentHash(post.title, post.body),
    published_at: now.toISOString(),
    kolkata_date: getKolkataDate(now),
    scheduled_slot: 'manual',
    raw: { seed: true, language: 'en', phase: 'phase-1-news-page-fix' },
  }
}

export function assertEnglishSeedPost(post: SeedPost) {
  if (![post.title, post.excerpt, post.body].every(isProbablyEnglishText)) {
    throw new Error(`Seed post failed English-only check: ${post.slug}`)
  }
}
