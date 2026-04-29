export const forbiddenClaims = [
  'you will definitely die',
  'you will die',
  'death date',
  'exact lifespan',
  'you will never marry',
  'you are cursed',
  'black magic is confirmed',
  'divorce is certain',
  'do not see a doctor',
  'avoid doctors',
  'stop medical treatment',
  'you have cancer',
  'you are pregnant',
  'wear blue sapphire immediately',
  'wear this gemstone immediately',
  'guaranteed result',
  'miracle cure',
  'pay for puja',
]

export function containsForbiddenClaim(text: string): boolean {
  const lower = text.toLowerCase()

  return forbiddenClaims.some((claim) => lower.includes(claim.toLowerCase()))
}

export function removeForbiddenClaims(text: string): string {
  let cleaned = text

  for (const claim of forbiddenClaims) {
    const pattern = new RegExp(escapeRegExp(claim), 'gi')
    cleaned = cleaned.replace(pattern, '[removed unsafe claim]')
  }

  return cleaned
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
