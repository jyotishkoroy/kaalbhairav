/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { BirthInputV2 } from './calculations/contracts.ts'
import { assertCanonicalChartJsonV2 } from './chart-json-v2.ts'
import { buildProfileChartJsonFromMasterOutput } from './profile-chart-json-adapter.ts'

type CalculateRequestBody = Record<string, unknown>

const CLIENT_SUPPLIED_CONTEXT_KEYS_TO_IGNORE = [
  'chart',
  'context',
  'dasha',
  'transits',
  'publicFacts',
  'profileId',
  'userId',
  'chartVersionId',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function pickNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function hasIgnoredClientContext(body: CalculateRequestBody): boolean {
  return CLIENT_SUPPLIED_CONTEXT_KEYS_TO_IGNORE.some((key) => key in body)
}

export function sanitizeCalculateBodyForDeterministicInput(body: CalculateRequestBody): BirthInputV2 {
  const dateLocal =
    pickString(body.date_local) ??
    pickString(body.dateLocal) ??
    pickString(body.birthDate) ??
    pickString(body.date)

  const timeLocal =
    pickString(body.time_local) ??
    pickString(body.timeLocal) ??
    pickString(body.birthTime) ??
    pickString(body.time)

  const placeName =
    pickString(body.place_name) ??
    pickString(body.placeName) ??
    pickString(body.birthPlace) ??
    pickString(body.place) ??
    null

  const latitudeDeg =
    pickNumber(body.latitude_deg) ??
    pickNumber(body.latitudeDeg) ??
    pickNumber(body.latitude) ??
    null

  const longitudeDeg =
    pickNumber(body.longitude_deg) ??
    pickNumber(body.longitudeDeg) ??
    pickNumber(body.longitude) ??
    null

  const timezone =
    body.timezone ??
    body.timezoneHours ??
    body.timezone_hours ??
    body.utcOffsetHours ??
    body.utc_offset_hours

  return {
    date_local: dateLocal ?? '',
    time_local: timeLocal,
    place_name: placeName,
    latitude_deg: latitudeDeg,
    longitude_deg: longitudeDeg,
    timezone: typeof timezone === 'number' || typeof timezone === 'string' ? timezone : '',
    war_time_correction_seconds: pickNumber(body.war_time_correction_seconds) ?? 0,
    ayanamsha_main: body.ayanamsha_main === 'kp_new' ? 'kp_new' : 'lahiri',
    ayanamsha_kp: 'kp_new',
    house_system:
      body.house_system === 'sripati' || body.house_system === 'kp_placidus'
        ? body.house_system
        : 'whole_sign',
    runtime_clock: pickString(body.runtime_clock) ?? pickString(body.runtimeClock) ?? new Date(0).toISOString(),
    disambiguation:
      body.disambiguation === 'earlier' || body.disambiguation === 'later'
        ? body.disambiguation
        : undefined,
  }
}

function isChartJsonV2Candidate(value: unknown): value is Record<string, unknown> {
  return isRecord(value)
}

export async function calculateRouteV2ResponsePayload(args: {
  birthInput: BirthInputV2
  ignoredClientContext: boolean
}): Promise<Record<string, unknown>> {
  const { calculateMasterAstroOutput } = await import('./calculations/master.ts')
  const masterOutput = await calculateMasterAstroOutput({
    input: {
      birth_date: args.birthInput.date_local,
      birth_time: args.birthInput.time_local ?? undefined,
      birth_time_known: args.birthInput.time_local != null,
      birth_time_precision: args.birthInput.time_local ? 'exact' : 'unknown',
      birth_place_name: args.birthInput.place_name ?? undefined,
      latitude: args.birthInput.latitude_deg ?? undefined,
      longitude: args.birthInput.longitude_deg ?? undefined,
      timezone: args.birthInput.timezone,
    } as never,
    normalized: {
      birth_date_iso: args.birthInput.date_local,
      birth_time_known: args.birthInput.time_local != null,
      birth_time_precision: args.birthInput.time_local ? 'exact' : 'unknown',
      timezone: typeof args.birthInput.timezone === 'string' ? args.birthInput.timezone : 'UTC',
      timezone_status: 'valid',
      coordinate_confidence: 1,
      latitude_full: args.birthInput.latitude_deg ?? 0,
      longitude_full: args.birthInput.longitude_deg ?? 0,
      latitude_rounded: args.birthInput.latitude_deg ?? 0,
      longitude_rounded: args.birthInput.longitude_deg ?? 0,
      input_hash_material_version: '2.0.0',
    } as never,
    settings: {
      astrology_system: 'parashari',
      zodiac_type: 'sidereal',
      ayanamsa: args.birthInput.ayanamsha_main ?? 'lahiri',
      house_system: args.birthInput.house_system ?? 'whole_sign',
      node_type: 'mean_node',
      dasha_year_basis: 'civil_365.2425',
    } as never,
    runtime: {
      user_id: 'integration',
      profile_id: 'integration',
      current_utc: args.birthInput.runtime_clock ?? new Date(0).toISOString(),
      production: false,
    },
    runtimeClock: {
      currentUtc: args.birthInput.runtime_clock ?? new Date(0).toISOString(),
    },
  })

  if ((masterOutput as { calculation_status?: unknown }).calculation_status === 'rejected') {
    throw new Error((masterOutput as { rejection_reason?: string }).rejection_reason ?? 'ephemeris_unavailable')
  }

  const profileChart = buildProfileChartJsonFromMasterOutput({
    output: masterOutput,
    userId: 'integration',
    profileId: 'integration',
    calculationId: 'integration',
    chartVersionId: 'integration',
    chartVersion: 1,
    inputHash: 'integration',
    settingsHash: 'integration',
    settingsForHash: {
      astrology_system: 'parashari',
      zodiac_type: 'sidereal',
      ayanamsa: args.birthInput.ayanamsha_main ?? 'lahiri',
      house_system: args.birthInput.house_system ?? 'whole_sign',
      node_type: 'mean_node',
      dasha_year_basis: 'civil_365.2425',
    } as never,
    normalized: {
      birth_date_iso: args.birthInput.date_local,
      birth_time_known: args.birthInput.time_local != null,
      birth_time_precision: args.birthInput.time_local ? 'exact' : 'unknown',
      timezone: args.birthInput.timezone,
      timezone_status: 'valid',
      coordinate_confidence: 1,
      latitude_full: args.birthInput.latitude_deg ?? 0,
      longitude_full: args.birthInput.longitude_deg ?? 0,
      latitude_rounded: args.birthInput.latitude_deg ?? 0,
      longitude_rounded: args.birthInput.longitude_deg ?? 0,
      input_hash_material_version: '2.0.0',
    } as never,
    engineVersion: 'integration',
    ephemerisVersion: 'integration',
    schemaVersion: 'integration',
  })

  const chartJsonV2 = isChartJsonV2Candidate(profileChart)
    ? (profileChart.chart_json_v2 ?? profileChart.chartJsonV2)
    : undefined
  const canonical = assertCanonicalChartJsonV2(chartJsonV2)

  const meta = isRecord((profileChart as Record<string, unknown>).meta)
    ? (profileChart as Record<string, unknown>).meta as Record<string, unknown>
    : {}

  return {
    ok: true,
    success: true,
    ...profileChart,
    chart_json_v2: canonical,
    chartJsonV2: canonical,
    meta: {
      ...meta,
      calcIntegrationEnabled: true,
      ignoredClientContext: args.ignoredClientContext,
      persisted: false,
      currentChartPromoted: false,
    },
  }
}
