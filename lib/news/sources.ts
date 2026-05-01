/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { NewsSourceConfig } from './types'

export const NEWS_SOURCES: NewsSourceConfig[] = [
  {
    key: 'internet-archive-occult',
    name: 'Internet Archive',
    sourceType: 'internet_archive',
    url: 'https://archive.org/advancedsearch.php',
    archiveQuery: 'subject:(occult) OR subject:(tantra) OR subject:(shaivism) OR subject:(hinduism) OR subject:(mythology) OR subject:(esotericism) OR subject:(alchemy) OR subject:(hermeticism)',
    topicHints: ['archive', 'occult', 'tantra', 'manuscript'],
    isActive: true,
  },
  { key: 'correspondences-journal', name: 'Correspondences Journal', sourceType: 'rss', url: 'https://correspondencesjournal.com/feed/', topicHints: ['esotericism', 'occult', 'research'], isActive: true },
  { key: 'ein-religion-news', name: 'EIN Religion News', sourceType: 'rss', url: 'https://religion.einnews.com/all_rss', topicHints: ['religion', 'deity', 'temple'], isActive: true },
  { key: 'archaeology-magazine', name: 'Archaeology Magazine', sourceType: 'rss', url: 'https://archaeology.org/feed/', topicHints: ['archaeology', 'temple', 'ritual'], isActive: true },
  { key: 'arkeonews', name: 'Arkeonews', sourceType: 'rss', url: 'https://arkeonews.net/feed/', topicHints: ['archaeology', 'mythology', 'ancient religion'], isActive: true },
  { key: 'live-science-archaeology', name: 'Live Science Archaeology', sourceType: 'rss', url: 'https://www.livescience.com/feeds/tag/archaeology', topicHints: ['archaeology', 'ancient history', 'ritual'], isActive: true },
]
