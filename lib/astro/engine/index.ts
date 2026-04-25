import type { AstroWarning } from '../types'

export function runAstroEngine() {
  const warnings: AstroWarning[] = [
    {
      warning_code: 'ENGINE_STUB_V1',
      severity: 'medium',
      affected_calculations: [
        'planetary_positions',
        'lagna',
        'houses',
        'dashas',
        'transits',
      ],
      explanation:
        'V1 engine is running in stub mode. Real ephemeris calculations are not enabled yet.',
    },
  ]

  return {
    calculation_status: 'stub' as const,
    ephemeris_version: 'stub',
    astronomical_data: {},
    panchang: {},
    planets: {},
    lagna: {},
    houses: {},
    d1_chart: {},
    divisional_charts: {},
    dashas: {},
    doshas: {},
    transits: {},
    aspects: {},
    ashtakavarga: {},
    jaimini: {},
    life_area_signatures: {},
    timing_signatures: {},
    warnings,
  }
}
