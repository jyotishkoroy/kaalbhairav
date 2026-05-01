/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { normalizeText } from './hash.ts'
import type { NewsTopic } from './types.ts'

const topicWeights: Array<{ topic: NewsTopic; keywords: string[]; weight: number }> = [
  { topic: 'tantra', keywords: ['tantra', 'tantric', 'shaiva', 'shakta', 'agama'], weight: 10 },
  { topic: 'ritual', keywords: ['ritual', 'sacrifice', 'offering', 'oracle', 'amulet', 'curse', 'burial'], weight: 8 },
  { topic: 'temple', keywords: ['temple', 'shrine', 'sanctuary', 'pilgrimage', 'sacred site'], weight: 8 },
  { topic: 'deity', keywords: ['deity', 'god', 'goddess', 'shiva', 'kali', 'durga', 'vishnu', 'bhairava', 'hathor', 'ishtar', 'amun'], weight: 7 },
  { topic: 'esotericism', keywords: ['esotericism', 'theosophy', 'spiritualism', 'rosicrucian', 'gnostic'], weight: 7 },
  { topic: 'occult', keywords: ['occult', 'magic', 'esoteric', 'witchcraft', 'hermetic', 'alchemy', 'divination'], weight: 6 },
  { topic: 'manuscript', keywords: ['manuscript', 'papyrus', 'inscription', 'cuneiform', 'codex', 'tablet'], weight: 6 },
  { topic: 'mythology', keywords: ['myth', 'mythology', 'legend', 'epic'], weight: 5 },
  { topic: 'religion', keywords: ['religion', 'faith', 'hindu', 'buddhist', 'christian', 'islamic', 'sacred'], weight: 4 },
  { topic: 'archaeology', keywords: ['archaeology', 'archaeologist', 'excavation', 'tomb', 'ancient'], weight: 3 },
  { topic: 'archive', keywords: ['archive', 'rare text', 'book', 'digitized'], weight: 2 },
]

export function classifyTopic(title: string, summary: string, sourceHints: string[] = []) {
  const text = normalizeText(`${title} ${summary}`)
  const hintText = normalizeText(sourceHints.join(' '))
  let best: { topic: NewsTopic; score: number } = { topic: 'other', score: 0 }

  for (const candidate of topicWeights) {
    let score = 0
    for (const keyword of candidate.keywords) {
      if (text.includes(keyword)) score += candidate.weight
    }
    if (score > best.score) best = { topic: candidate.topic, score }
  }

  if (best.topic === 'archaeology' && /temple|shrine|ritual|burial/.test(text)) {
    if (text.includes('temple') || text.includes('shrine')) return 'temple'
    if (text.includes('ritual') || text.includes('burial')) return 'ritual'
  }

  if (best.topic === 'manuscript' && /tantra|shaiva|shakta/.test(text)) return 'tantra'
  if (best.topic === 'archive' && /tantra|manuscript|esotericism/.test(text)) return 'archive'

  if (best.score > 0) return best.topic

  for (const hint of sourceHints) {
    const normalized = normalizeText(hint)
    if (text.includes(normalized)) {
      if (normalized.includes('archaeology')) return 'archaeology'
      if (normalized.includes('occult')) return 'occult'
    }
  }

  if (hintText.includes('archaeology') && /temple|ritual/.test(text)) return /temple/.test(text) ? 'temple' : 'ritual'
  return 'other'
}
