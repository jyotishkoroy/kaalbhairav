/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { EmotionalTone, UserConcern } from '@/lib/astro/reading/reading-types'

const OPENINGS_BY_TONE: Record<EmotionalTone, string[]> = {
  calm: [
    'I am reading this in a grounded way, starting with the actual question rather than a canned prediction.',
    'This can be answered directly, without turning it into a dramatic story.',
  ],
  anxious: [
    'I can understand why this feels heavy right now. The useful answer is the one that reduces confusion.',
    'Because there is pressure here, I am keeping the answer direct and specific.',
  ],
  sad: [
    'I can feel the tiredness behind this question, so I will keep the answer steady and honest.',
    'This deserves a careful answer that does not add more pressure.',
  ],
  angry: [
    'I can sense the frustration behind this. I will separate the pressure of the moment from the actual issue.',
    'This needs a clear reading and one practical next step.',
  ],
  confused: [
    'The confusion itself matters here, so I will keep the answer simple and structured.',
    'Clarity here needs a few clean points, not a long speech.',
  ],
  hopeful: [
    'There is hope in the way you are asking this, and I will still keep the answer balanced.',
    'The useful part is what can grow next and what needs patience now.',
  ],
  urgent: [
    'Because this feels urgent, I am keeping the answer calm and specific.',
    'Urgency can distort the picture, so I will stay with what is actually known.',
  ],
}

function pickFirst(items: string[]): string {
  return items[0] ?? ''
}

export function pickOpening(concern: UserConcern): string {
  return pickFirst(OPENINGS_BY_TONE[concern.emotionalTone] ?? OPENINGS_BY_TONE.calm)
}

export function getOpeningsForTone(tone: EmotionalTone): string[] {
  return OPENINGS_BY_TONE[tone] ?? OPENINGS_BY_TONE.calm
}
