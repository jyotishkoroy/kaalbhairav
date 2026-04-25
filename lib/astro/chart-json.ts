import type { AstrologySettings, ChartJson } from './types'

type BuildChartJsonInput = {
  user_id: string
  profile_id: string
  calculation_id: string
  chart_version_id: string
  chart_version: number
  input_hash: string
  settings_hash: string
  settings: AstrologySettings
  normalized_input: Record<string, unknown>
  engine_result: Record<string, unknown>
}

export function buildChartJson(input: BuildChartJsonInput): ChartJson {
  return {
    metadata: {
      user_id: input.user_id,
      profile_id: input.profile_id,
      calculation_id: input.calculation_id,
      chart_version_id: input.chart_version_id,
      input_hash: input.input_hash,
      settings_hash: input.settings_hash,
      engine_version: 'v1.0.0',
      ephemeris_version: 'stub',
      schema_version: '1.0.0',
      chart_version: input.chart_version,
      computed_at: new Date().toISOString(),
      calculation_status: 'stub',
    },
    normalized_input: input.normalized_input,
    calculation_settings: input.settings,
    astronomical_data: (input.engine_result.astronomical_data as Record<string, unknown>) ?? {},
    panchang: (input.engine_result.panchang as Record<string, unknown>) ?? {},
    avkahada: {},
    planets: (input.engine_result.planets as Record<string, unknown>) ?? {},
    lagna: (input.engine_result.lagna as Record<string, unknown>) ?? {},
    houses: (input.engine_result.houses as Record<string, unknown>) ?? {},
    d1_chart: (input.engine_result.d1_chart as Record<string, unknown>) ?? {},
    divisional_charts: (input.engine_result.divisional_charts as Record<string, unknown>) ?? {},
    dashas: (input.engine_result.dashas as Record<string, unknown>) ?? {},
    doshas: (input.engine_result.doshas as Record<string, unknown>) ?? {},
    transits: (input.engine_result.transits as Record<string, unknown>) ?? {},
    aspects: (input.engine_result.aspects as Record<string, unknown>) ?? {},
    ashtakavarga: (input.engine_result.ashtakavarga as Record<string, unknown>) ?? {},
    jaimini: (input.engine_result.jaimini as Record<string, unknown>) ?? {},
    life_area_signatures: (input.engine_result.life_area_signatures as Record<string, unknown>) ?? {},
    timing_signatures: (input.engine_result.timing_signatures as Record<string, unknown>) ?? {},
    prediction_ready_summaries: {},
    confidence_and_warnings: {
      confidence: {
        overall: {
          value: 40,
          label: 'low',
          reasons: ['V1 engine is stubbed.'],
        },
      },
      warnings: [],
    },
    audit: {
      sources: ['backend_stub_v1'],
      engine_modules: ['stub'],
      notes: ['No real ephemeris calculation has been performed in V1.'],
    },
  }
}
