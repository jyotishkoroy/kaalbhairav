import type { AstroEvidence } from '@/lib/astro/interpretation/evidence'

export function renderGuidance(evidence: AstroEvidence[]): string {
  const guidance = evidence
    .filter((item) => item.visibleToUser)
    .map((item) => item.guidance)
    .filter(Boolean)

  if (guidance.length === 0) {
    return 'The best step is to pause, observe the situation clearly, and avoid making decisions only from fear.'
  }

  const unique = Array.from(new Set(guidance)).slice(0, 3)

  return `My practical guidance is this: ${unique.join(' ')}`
}

export function renderCaution(evidence: AstroEvidence[]): string {
  const cautions = evidence
    .filter((item) => item.visibleToUser && item.caution)
    .map((item) => item.caution)
    .filter((caution): caution is string => Boolean(caution))

  if (cautions.length === 0) {
    return ''
  }

  const unique = Array.from(new Set(cautions)).slice(0, 2)

  return `I would be careful about one thing: ${unique.join(' ')}`
}
