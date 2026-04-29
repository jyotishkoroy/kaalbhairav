/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { ReadingTopic } from '@/lib/astro/interpretation/evidence'

const TOPIC_OPENINGS: Record<ReadingTopic, string> = {
  career:
    'For career, the chart should be read through effort, timing, responsibility, and practical choices.',
  marriage:
    'For marriage, I would not reduce this to only a yes or no. Readiness, timing, and emotional maturity all matter.',
  relationship:
    'For relationships, the most important thing is whether the connection brings consistency, respect, and peace.',
  money:
    'For money, the useful reading is not fear. It is where discipline, planning, and timing need to come together.',
  health:
    'For health, astrology can only give general wellbeing reflection. It should never replace medical advice.',
  family:
    'For family matters, the chart often shows where patience, communication, and boundaries are needed.',
  education:
    'For education, the reading should focus on effort, concentration, timing, and the right learning environment.',
  spirituality:
    'For spiritual questions, the answer should stay simple, grounded, and free from fear.',
  remedy:
    'For remedies, I would keep the guidance safe, practical, and not fear-based.',
  death:
    'I would not use astrology to predict death or lifespan. A responsible reading can only discuss wellbeing and caution.',
  general: 'The overall pattern matters more than one isolated prediction.',
}

export function pickTopicOpening(topic: ReadingTopic): string {
  return TOPIC_OPENINGS[topic] ?? TOPIC_OPENINGS.general
}
