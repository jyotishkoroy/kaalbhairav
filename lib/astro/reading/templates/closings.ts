import type { UserConcern } from '@/lib/astro/reading/reading-types'

export function renderClosing(concern: UserConcern): string {
  if (concern.topic === 'death') {
    return 'So my honest reading is: do not use astrology for fear around lifespan. Use it only to support better care, steadier decisions, and wellbeing.'
  }

  if (concern.topic === 'health') {
    return 'So my honest reading is: take the concern seriously in practical life, and use astrology only as supportive reflection, not diagnosis.'
  }

  if (concern.questionType === 'timing') {
    return 'So my honest reading is: this is better treated as a supportive period to prepare for, not a fixed promise that removes your own action.'
  }

  if (concern.questionType === 'decision') {
    return 'So my honest reading is: do not decide from panic. Decide from repeated patterns, clear facts, and what gives long-term stability.'
  }

  if (concern.questionType === 'remedy') {
    return 'So my honest reading is: the safest remedy is the one that makes your life more disciplined, calm, honest, and steady.'
  }

  return 'So my honest reading is: this is not about forcing certainty. It is about understanding the pattern and taking the next right step calmly.'
}
