/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import type { ChartJson, AstrologySettings, ConfidenceScore, AstroExpandedSections } from './types.ts'
import type { NormalizedBirthInput } from './normalize.ts'
import type { EngineResult } from './engine/index.ts'
import { getRuntimeEngineVersion, getRuntimeEphemerisVersion, SCHEMA_VERSION } from './engine/version.ts'

export function buildChartJson(args: {
  user_id: string
  profile_id: string
  calculation_id: string
  chart_version_id: string
  chart_version: number
  input_hash: string
  settings_hash: string
  normalized: NormalizedBirthInput
  settings: AstrologySettings
  engine: EngineResult
  expanded_sections?: AstroExpandedSections
}): ChartJson {
  const overallConfidence: ConfidenceScore =
    args.engine.calculation_status === 'stub'
      ? { value: 30, label: 'low', reasons: ['V1 engine is in stub mode'] }
      : { value: 75, label: 'medium', reasons: ['V1 calculations complete'] }

  return {
    metadata: {
      user_id: args.user_id,
      profile_id: args.profile_id,
      calculation_id: args.calculation_id,
      chart_version_id: args.chart_version_id,
      input_hash: args.input_hash,
      settings_hash: args.settings_hash,
      engine_version: getRuntimeEngineVersion(),
      ephemeris_version: getRuntimeEphemerisVersion(),
      schema_version: SCHEMA_VERSION,
      chart_version: args.chart_version,
      computed_at: new Date().toISOString(),
      calculation_status: args.engine.calculation_status,
    },
    normalized_input: {
      birth_date_iso: args.normalized.birth_date_iso,
      birth_time_known: args.normalized.birth_time_known,
      birth_time_precision: args.normalized.birth_time_precision,
      timezone: args.normalized.timezone,
      timezone_status: args.normalized.timezone_status,
      coordinate_confidence: args.normalized.coordinate_confidence,
    },
    calculation_settings: args.settings,
    astronomical_data: args.engine.astronomical_data,
    panchang: args.engine.panchang,
    avkahada: args.engine.avkahada,
    planets: args.engine.planets,
    lagna: args.engine.lagna,
    houses: args.engine.houses,
    d1_chart: args.engine.d1_chart,
    divisional_charts: args.engine.divisional_charts,
    dashas: args.engine.dashas,
    doshas: args.engine.doshas,
    transits: args.engine.transits,
    aspects: args.engine.aspects,
    ashtakavarga: args.engine.ashtakavarga,
    jaimini: args.engine.jaimini,
    life_area_signatures: args.engine.life_area_signatures,
    timing_signatures: args.engine.timing_signatures,
    prediction_ready_summaries: {},
    confidence_and_warnings: {
      confidence: { overall: overallConfidence },
      warnings: args.engine.warnings,
    },
    audit: args.engine.audit,
    expanded_sections: args.expanded_sections,
  }
}
