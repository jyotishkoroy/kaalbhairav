/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { ReadingTopic } from '@/lib/astro/interpretation/evidence'

const TOPIC_OPENINGS: Record<ReadingTopic, string> = {
  career:
    'Career questions work best when the answer stays practical: visibility, responsibility, and steady effort matter more than a dramatic promise.',
  marriage:
    'Marriage questions are best handled without fear or pressure. Readiness, timing, and emotional maturity all matter.',
  relationship:
    'Relationship questions should stay grounded in consistency, respect, and emotional steadiness.',
  money:
    'Money questions usually need a grounded answer, not fear. Discipline, planning, and timing all matter.',
  health:
    'Health questions should stay safe, practical, and non-diagnostic.',
  family:
    'Family questions often point to patience, communication, and healthy boundaries.',
  education:
    'Education questions are usually about consistency, concentration, and the learning environment that supports follow-through.',
  spirituality:
    'Spiritual questions should reduce fear and keep the practice simple and steady.',
  remedy:
    'Remedy questions should stay safe, practical, and not fear-based.',
  foreign:
    'Foreign travel or relocation questions need both timing awareness and practical planning.',
  legal:
    'Legal questions should stay focused on documentation, evidence, and professional advice.',
  death:
    'I would not use astrology to predict death or lifespan. A responsible reading can only discuss wellbeing and caution.',
  general: 'The overall pattern matters more than one isolated prediction.',
}

export function pickTopicOpening(topic: ReadingTopic): string {
  return TOPIC_OPENINGS[topic] ?? TOPIC_OPENINGS.general
}
