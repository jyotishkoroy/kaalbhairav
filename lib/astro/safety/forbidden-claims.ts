/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

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

  const claims = [...forbiddenClaims].sort((a, b) => b.length - a.length)

  for (const claim of claims) {
    const pattern = new RegExp(`\\b${escapeRegExp(claim)}\\b`, 'gi')
    cleaned = cleaned.replace(pattern, 'unsupported claim')
  }

  return cleaned
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
