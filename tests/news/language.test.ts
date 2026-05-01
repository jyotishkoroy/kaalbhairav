/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from 'vitest'
import { isProbablyEnglishText } from '@/lib/news/language'

describe('news language detection', () => {
  it('accepts plain English text with punctuation', () => expect(isProbablyEnglishText('A shrine was uncovered during excavation.')).toBe(true))
  it('accepts Sanskrit transliteration in Latin script', () => expect(isProbablyEnglishText('Shiva, Kali, and Bhairava appear in the text.')).toBe(true))
  it('rejects Devanagari text', () => expect(isProbablyEnglishText('शिव मंदिर में नया अनुष्ठान')).toBe(false))
  it('rejects Bengali text', () => expect(isProbablyEnglishText('শিব মন্দিরে নতুন অনুষ্ঠান')).toBe(false))
  it('rejects mixed English with heavy non-Latin script', () => expect(isProbablyEnglishText('Ancient shrine and पूजा during festival')).toBe(false))
  it('ignores URL-only strings', () => expect(isProbablyEnglishText('https://example.com/path?q=1')).toBe(true))
})
