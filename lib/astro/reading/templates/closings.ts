/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { UserConcern } from '@/lib/astro/reading/reading-types'

export function renderClosing(concern: UserConcern): string {
  if (concern.topic === 'death') {
    return 'I would not use astrology for lifespan fear. Keep it focused on wellbeing and steadier choices.'
  }

  if (concern.topic === 'health') {
    return 'Take the concern seriously in practical life, and keep astrology in a supportive role only.'
  }

  if (concern.questionType === 'timing') {
    return 'Treat the timing as preparation, not a fixed promise.'
  }

  if (concern.questionType === 'decision') {
    return 'Do not decide from panic. Use repeated patterns, clear facts, and long-term stability.'
  }

  if (concern.questionType === 'remedy') {
    return 'The safest remedy is the one that stays calm, simple, and steady.'
  }

  return 'This is not about forcing certainty. It is about understanding the situation and taking the next right step calmly.'
}
