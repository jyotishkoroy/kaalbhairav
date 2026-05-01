/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { ReadingTopic } from '@/lib/astro/interpretation/evidence'

const TOPIC_OPENINGS: Record<ReadingTopic, string> = {
  career:
    'Your work may need clearer visibility, stronger ownership, and a more direct ask for recognition.',
  marriage:
    'Marriage timing is best read through readiness, compatibility, and steady communication.',
  relationship:
    'This relationship question calls for consistency, respect, and a clear look at the repeating pattern.',
  money:
    'Money pressure becomes easier to handle when it is turned into a concrete plan.',
  health:
    'If health is part of this, keep the reading safe, practical, and non-diagnostic.',
  family:
    'Family pressure is easier to handle when duty and guilt are separated clearly.',
  education:
    'For study choices, consistency and the right environment matter more than a dramatic promise.',
  spirituality:
    'Spiritual practice should stay calm, simple, and steady.',
  remedy:
    'Remedy questions should stay low-pressure, safe, and practical.',
  foreign:
    'Foreign travel or relocation works best when timing is matched with real preparation.',
  legal:
    'Legal questions should stay focused on documentation, evidence, and qualified advice.',
  death:
    'I would not use astrology to predict death or lifespan. A responsible reading can only discuss wellbeing and caution.',
  general: 'I can help, but the question is broad. Pick one area first: career, relationship, money, family, health, study, or spiritual practice.',
}

export function pickTopicOpening(topic: ReadingTopic): string {
  return TOPIC_OPENINGS[topic] ?? TOPIC_OPENINGS.general
}
