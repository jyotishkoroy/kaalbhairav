/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { buildProfileExpandedSectionsFromStoredChartJson } from '@/lib/astro/profile-chart-json-adapter'

export function isAvailableDisplaySection(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const section = value as {
    status?: unknown
    rows?: unknown
    items?: unknown
    data?: unknown
  }

  if (section.status !== 'available' && section.status !== 'real') return false
  if (Array.isArray(section.rows) && section.rows.length > 0) return true
  if (Array.isArray(section.items) && section.items.length > 0) return true

  if (section.data && typeof section.data === 'object') {
    const data = section.data as {
      rows?: unknown
      items?: unknown
      placements?: unknown
      mahadasha_sequence?: unknown
      current_dasha?: unknown
    }
    if (Array.isArray(data.rows) && data.rows.length > 0) return true
    if (Array.isArray(data.items) && data.items.length > 0) return true
    if (Array.isArray(data.placements) && data.placements.length > 0) return true
    if (Array.isArray(data.mahadasha_sequence) && data.mahadasha_sequence.length > 0) return true
    if (data.current_dasha && typeof data.current_dasha === 'object') return true
  }

  return false
}

export function mergeAvailableJyotishSectionsIntoChartJson(
  chartJson: Record<string, unknown>,
  engineOutput: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    ...chartJson,
  }

  const sectionKeys = [
    'panchang',
    'vimshottari_dasha',
    'navamsa_d9',
    'ashtakvarga',
    'sade_sati',
    'kalsarpa_dosh',
    'manglik_dosha',
    'avkahada_chakra',
    'favourable_points',
    'ghatak',
    'shadbala',
  ]

  for (const key of sectionKeys) {
    const value = engineOutput[key]
    if (isAvailableDisplaySection(value)) {
      merged[key] = value
    }
  }

  const astronomicalData =
    merged.astronomical_data && typeof merged.astronomical_data === 'object'
      ? { ...(merged.astronomical_data as Record<string, unknown>) }
      : {}

  for (const key of sectionKeys) {
    const value = merged[key]
    if (isAvailableDisplaySection(value)) {
      astronomicalData[key] = value
    }
  }

  merged.astronomical_data = astronomicalData

  const repairedExpandedSections = buildProfileExpandedSectionsFromStoredChartJson(merged)
  if (repairedExpandedSections) {
    merged.expanded_sections = repairedExpandedSections
  }

  return merged
}
