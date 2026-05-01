/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { NewsSourceConfig } from './types'

export function shuffleSources<T>(sources: T[], rng: () => number = Math.random) {
  const copy = [...sources]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function selectSourceQueue({
  sources,
  excludeSourceKeys = [],
  rng = Math.random,
  allowExcludedFallback = true,
}: {
  sources: NewsSourceConfig[]
  excludeSourceKeys?: string[]
  rng?: () => number
  allowExcludedFallback?: boolean
}) {
  const active = sources.filter((source) => source.isActive)
  const preferred = active.filter((source) => !excludeSourceKeys.includes(source.key))
  const fallback = allowExcludedFallback ? active.filter((source) => excludeSourceKeys.includes(source.key)) : []
  return [...shuffleSources(preferred, rng), ...shuffleSources(fallback, rng)]
}
