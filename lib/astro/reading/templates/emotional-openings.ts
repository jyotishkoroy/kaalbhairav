/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { EmotionalTone, UserConcern } from '@/lib/astro/reading/reading-types'

const OPENINGS_BY_TONE: Record<EmotionalTone, string[]> = {
  calm: [
    'The first thing I would look at here is the pattern behind the question, not just a simple yes or no.',
    'Let me read this in a grounded way, without making the answer dramatic.',
  ],
  anxious: [
    'I can understand why this feels heavy right now. You are looking for clarity, not just a prediction.',
    'This question carries pressure, so I would read it carefully rather than give a quick generic answer.',
  ],
  sad: [
    'I can feel the tiredness behind this question. This is not something you are asking casually.',
    'This seems to be coming from a place of emotional exhaustion, so the answer needs to be steady and honest.',
  ],
  angry: [
    'I can sense the frustration behind this. Let us separate the pressure of the moment from the actual pattern.',
    'This does not need a dramatic answer. It needs a clear reading and a practical next step.',
  ],
  confused: [
    'The confusion itself is important here. It shows that your mind is trying to make sense of too many signals at once.',
    'This looks like a phase where clarity has to be built step by step, not forced in one moment.',
  ],
  hopeful: [
    'There is hope in the way you are asking this, but I would still read it with balance and care.',
    'This question has a forward-looking quality, so the useful answer is what can grow and what needs patience.',
  ],
  urgent: [
    'Because this feels urgent, I would be careful not to turn pressure into a rushed decision.',
    'This needs a calm answer first. Urgency can make the situation feel more final than it actually is.',
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
