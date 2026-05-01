/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

const NON_LATIN_SCRIPT_RE = /[\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Malayalam}\p{Script=Kannada}\p{Script=Gujarati}\p{Script=Gurmukhi}\p{Script=Arabic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu
const LATIN_LETTER_RE = /[\p{Script=Latin}]/gu

export function isProbablyEnglishText(input: string) {
  const text = input.trim()
  if (!text) return true

  const nonLatinMatches = text.match(NON_LATIN_SCRIPT_RE)?.length ?? 0
  const letterMatches = text.match(/\p{L}/gu)?.length ?? 0
  if (letterMatches === 0) return true

  const latinMatches = text.match(LATIN_LETTER_RE)?.length ?? 0
  if (nonLatinMatches === 0) return true
  return nonLatinMatches / letterMatches < 0.08 && latinMatches >= nonLatinMatches
}

export function assertEnglishText(input: string, label: string) {
  if (!isProbablyEnglishText(input)) {
    throw new Error(`${label} must be English-only for test seeding.`)
  }
}
