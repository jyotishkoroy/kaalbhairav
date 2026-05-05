/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { buildProfileExpandedSectionsFromStoredChartJson } from '@/lib/astro/profile-chart-json-adapter'
import { assertCanonicalChartJsonV2, type CanonicalChartJsonV2 } from '@/lib/astro/chart-json-v2'
import {
  ASTRO_DETERMINISTIC_ENGINE_VERSION,
  ASTRO_DETERMINISTIC_EPHEMERIS_VERSION,
} from '@/lib/astro/engine/version'

export type PersistCanonicalChartJsonArgs = {
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
  }
  userId: string
  profileId: string
  calculationId?: string | null
  chartJson: CanonicalChartJsonV2
  predictionSummary?: Record<string, unknown> | null
  inputHash: string
  settingsHash: string
  engineVersion: string
  auditPayload?: Record<string, unknown>
}

export type PersistCanonicalChartJsonResult = {
  chartVersionId: string
  chartVersion: number
}

type RequiredChartVersionMetadata = {
  engineVersion: string
  ephemerisVersion: string
  ayanamsha: string
  houseSystem: string
}

function requireChartVersionMetadata(chartJson: CanonicalChartJsonV2): RequiredChartVersionMetadata {
  const metadata = chartJson.metadata ?? {}

  const engineVersion =
    typeof metadata.engineVersion === 'string' && metadata.engineVersion.trim()
      ? metadata.engineVersion.trim()
      : ASTRO_DETERMINISTIC_ENGINE_VERSION

  const ephemerisVersion =
    typeof metadata.ephemerisVersion === 'string' && metadata.ephemerisVersion.trim()
      ? metadata.ephemerisVersion.trim()
      : ASTRO_DETERMINISTIC_EPHEMERIS_VERSION

  const ayanamsha =
    typeof metadata.ayanamsha === 'string' && metadata.ayanamsha.trim()
      ? metadata.ayanamsha.trim()
      : 'lahiri'

  const houseSystem =
    typeof metadata.houseSystem === 'string' && metadata.houseSystem.trim()
      ? metadata.houseSystem.trim()
      : 'whole_sign'

  const missing = [
    ['engineVersion', engineVersion],
    ['ephemerisVersion', ephemerisVersion],
    ['ayanamsha', ayanamsha],
    ['houseSystem', houseSystem],
  ].filter(([, value]) => !value)

  if (missing.length > 0) {
    throw new Error(`missing_chart_metadata:${missing.map(([key]) => key).join(',')}`)
  }

  return { engineVersion, ephemerisVersion, ayanamsha, houseSystem }
}

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

export async function persistCanonicalChartJsonV2(
  args: PersistCanonicalChartJsonArgs,
): Promise<PersistCanonicalChartJsonResult> {
  if (!args.userId) {
    throw new Error('userId is required.')
  }

  if (!args.profileId) {
    throw new Error('profileId is required.')
  }

  const chartJson = assertCanonicalChartJsonV2(args.chartJson)
  const requiredMetadata = requireChartVersionMetadata(chartJson)
  const chartJsonForPersistence: CanonicalChartJsonV2 = {
    ...chartJson,
    metadata: {
      ...chartJson.metadata,
      engineVersion: requiredMetadata.engineVersion,
      ephemerisVersion: requiredMetadata.ephemerisVersion,
      ayanamsha: requiredMetadata.ayanamsha,
      houseSystem: requiredMetadata.houseSystem,
    },
  }

  if (chartJson.metadata.chartVersionId || chartJson.metadata.chartVersion) {
    throw new Error('chartVersionId/chartVersion must be assigned by persistence RPC, not prefilled.')
  }

  const { data, error } = await args.supabase.rpc('persist_and_promote_current_chart_version', {
    p_user_id: args.userId,
    p_profile_id: args.profileId,
    p_calculation_id: args.calculationId ?? null,
    p_chart_json: chartJsonForPersistence,
    p_prediction_summary: args.predictionSummary ?? null,
    p_input_hash: args.inputHash,
    p_settings_hash: args.settingsHash,
    p_engine_version: args.engineVersion,
    p_ephemeris_version: requiredMetadata.ephemerisVersion,
    p_ayanamsha: requiredMetadata.ayanamsha,
    p_house_system: requiredMetadata.houseSystem,
    p_schema_version: 'chart_json_v2',
    p_audit_payload: args.auditPayload ?? {},
  })

  if (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Failed to persist canonical chart JSON.',
    )
  }

  const row = Array.isArray(data) ? data[0] : data

  if (!row || typeof row !== 'object') {
    throw new Error('Persistence RPC returned no result.')
  }

  const persisted = row as {
    chart_version_id?: unknown
    chartVersionId?: unknown
    chart_version?: unknown
    chartVersion?: unknown
  }
  const chartVersionId = persisted.chart_version_id ?? persisted.chartVersionId
  const chartVersion = persisted.chart_version ?? persisted.chartVersion

  if (typeof chartVersionId !== 'string' || chartVersionId.length === 0) {
    throw new Error('Persistence RPC did not return chart_version_id.')
  }

  if (typeof chartVersion !== 'number' || !Number.isInteger(chartVersion) || chartVersion <= 0) {
    throw new Error('Persistence RPC did not return a positive chart_version.')
  }

  return {
    chartVersionId,
    chartVersion,
  }
}
