/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { decodeHtmlEntities, normalizeText } from './hash.ts'

export function stripHtml(input: string) {
  return decodeHtmlEntities(
    input
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<\/?[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildExcerpt(input: string, maxLength = 280) {
  const text = stripHtml(input)
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text
}

export function normalizeBodyParts(title: string, excerpt: string, topic: string) {
  const intro = `${title.trim()}. ${excerpt.trim()}`
  const middle = `For Tarayai readers, this is most relevant as a ${topic} item tied to sacred history, research, or belief practice.`
  const closing = 'Read the original source for full context and attribution.'
  return [intro, middle, closing].join('\n\n')
}

export function canonicalizeUrl(input: string) {
  try {
    const url = new URL(input)
    url.hash = ''
    return url.toString()
  } catch {
    return input.trim()
  }
}

export function stableTitleForId(title: string, fallback: string) {
  const normalized = normalizeText(title)
  return normalized || fallback
}
