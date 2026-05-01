/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { createHash } from 'crypto'

const htmlEntityMap: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  quot: '"',
}

export function decodeHtmlEntities(input: string) {
  return input.replace(/&(#?\w+);/g, (_, entity: string) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16))
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10))
    return htmlEntityMap[entity] ?? `&${entity};`
  })
}

export function normalizeText(input: string) {
  return decodeHtmlEntities(input)
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeTitle(input: string) {
  return normalizeText(input)
}

export function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex')
}
