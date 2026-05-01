/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { sha256, normalizeText } from './hash'

export function createSlug(title: string, existingSlugs: Set<string> = new Set()) {
  const base = normalizeText(title)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  let slug = base || sha256(title).slice(0, 12)
  if (!existingSlugs.has(slug)) return slug

  const suffix = sha256(title).slice(0, 8)
  slug = `${base.slice(0, Math.max(1, 80 - suffix.length - 1))}-${suffix}`.replace(/-+/g, '-').slice(0, 80)
  return slug
}
