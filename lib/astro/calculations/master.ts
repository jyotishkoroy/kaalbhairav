/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { masterAstroOutputSchema, type MasterAstroCalculationOutput } from '../schemas/master.ts'
import type { AstrologySettings, BirthProfileInput } from '../types.ts'
import type { NormalizedBirthInput } from '../normalize.ts'
import { ASTRO_CALC_INTEGRATION_ENABLED } from '../config/feature-flags.ts'
import { getSweVersion, isMoshierFallback, isSwissEphemerisAvailable, sweJulday } from '../engine/swiss.ts'
import { getEngineDiagnostics, getEphemerisRangeMetadata, runStartupValidation } from '../engine/diagnostics.ts'
import { CONSTANTS_VERSION, RASHI_MAP_VERSION, NAKSHATRA_MAP_VERSION, DASHA_ORDER_VERSION, PANCHANG_SEQUENCE_VERSION } from './constants.ts'
import { convertBirthTimeToUTC } from './time.ts'
import { calculateJulianDay } from './julian-day.ts'
import { calculateAyanamsa } from './ayanamsa.ts'
import { calculateAllPlanets } from './planets.ts'
import { calculateSign } from './sign.ts'
import { calculateNakshatra } from './nakshatra.ts'
import { calculateLagna } from './lagna.ts'
import { calculateWholeSignHouses } from './houses.ts'
import { buildHousesSectionV2 } from './houses.ts'
import { calculateD1Chart } from './d1.ts'
import { calculateNavamsaChart } from './navamsa.ts'
import { buildD9ChartSectionFromShodashvarga, buildShodashvargaSection } from './shodashvarga.ts'
import { buildShodashvargaBhavSection } from './varga-bhav.ts'
import { calculateVimshottari, calculateVimshottariDashaV2 } from './vimshottari.ts'
import { calculatePanchangResult, DEFAULT_PANCHANG_CONVENTION } from './panchang.ts'
import { calculateGrahaDrishti } from './aspects.ts'
import { calculateYogas } from './yogas.ts'
import { calculateDoshas } from './doshas.ts'
import { calculateStrength } from './strength.ts'
import { calculateLifeAreas } from './life-areas.ts'
import { calculateTransits } from './transits.ts'
import { calculateConfidence } from './confidence.ts'
import { collectWarnings } from './warnings.ts'
import { normalizeRuntimeClock, type AstroRuntimeClock } from './runtime-clock.ts'
import { normalizeBirthTimeForCalculation } from './time.ts'
import { calculatePanchangaV2 } from './panchang.ts'

const FORBIDDEN_PREDICTION_KEYS = new Set([
  'birth_date',
  'birth_time',
  'latitude',
  'longitude',
  'encrypted_birth_data',
  'data_consent_version',
  'profile_id',
  'user_id',
])

function stripForbiddenKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripForbiddenKeys(entry)) as T
  }
  if (!value || typeof value !== 'object') return value
  const result: Record<string, unknown> = {}
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_PREDICTION_KEYS.has(key)) continue
    result[key] = stripForbiddenKeys(nested)
  }
  return result as T
}

function toPanchangaV2Time(
  normalized: NormalizedBirthInput,
  birthTimeResult: { birth_local_wall_time: string; utc_offset_minutes: number; birth_utc: string | null },
  runtimeClockIso: string,
): import('./contracts.ts').NormalizedBirthInputV2 | null {
  if (!normalized.birth_time_known || !normalized.birth_time_iso || !birthTimeResult.birth_utc) {
    return null
  }

  return {
    dateLocal: normalized.birth_date_iso,
    timeLocal: normalized.birth_time_iso,
    localDateTimeIso: birthTimeResult.birth_local_wall_time,
    utcDateTimeIso: birthTimeResult.birth_utc,
    placeName: null,
    latitudeDeg: normalized.latitude_full,
    longitudeDeg: normalized.longitude_full,
    timezoneMode: 'fixed_offset_hours',
    timezone: normalized.timezone,
    timezoneHours: birthTimeResult.utc_offset_minutes / 60,
    warTimeCorrectionSeconds: 0,
    standardMeridianDeg: null,
    localTimeCorrectionSeconds: null,
    localMeanTimeIso: null,
    printedJulianDay: null,
    jdUtExact: null,
    runtimeClockIso,
    warnings: [],
  }
}

function getMoonAbsoluteLongitude(section: import('./contracts.ts').AstroSectionContract): number | null {
  const byBody = section.fields?.byBody
  if (!byBody || typeof byBody !== 'object' || Array.isArray(byBody)) {
    return null
  }

  const moon = (byBody as Record<string, { absoluteLongitude?: unknown }>).Moon
  return typeof moon?.absoluteLongitude === 'number' && Number.isFinite(moon.absoluteLongitude)
    ? moon.absoluteLongitude
    : null
}

function getAyanamshaDeg(section: import('./contracts.ts').AstroSectionContract): number | null {
  const ayanamshaDeg = section.fields?.ayanamshaDeg
  return typeof ayanamshaDeg === 'number' && Number.isFinite(ayanamshaDeg) ? ayanamshaDeg : null
}

function normalizeHouseSystem(value: AstrologySettings['house_system']): 'whole_sign' | 'sripati' | 'kp_placidus' {
  if (value === 'sripati') return 'sripati'
  if (value === 'placidus' || value === 'bhava_chalit') return 'sripati'
  if (value === 'kp') return 'kp_placidus'
  return 'whole_sign'
}

function buildLagnaSectionContract(lagna: import('./lagna.ts').LagnaResult): import('./contracts.ts').AstroSectionContract {
  return {
    status: 'computed',
    source: 'deterministic_calculation',
    fields: {
      ascendant: {
        sign: lagna.sign,
        signNumber: lagna.sign_index + 1,
        degreeInSign: lagna.degrees_in_sign,
        absoluteLongitude: lagna.sidereal_longitude,
        tropicalLongitude: lagna.tropical_longitude,
        source: 'deterministic_calculation',
      },
    },
  }
}

export async function calculateMasterAstroOutput(args: {
  input: BirthProfileInput
  normalized: NormalizedBirthInput
  settings: AstrologySettings
  runtime: { user_id: string; profile_id: string; current_utc: string; production: boolean }
  runtimeClock?: Partial<AstroRuntimeClock>
}): Promise<MasterAstroCalculationOutput> {
  const { normalized, settings, runtime } = args
  const runtimeClock = normalizeRuntimeClock(args.runtimeClock ?? { currentUtc: runtime.current_utc })

  const startupValidation = runStartupValidation()
  if (!isSwissEphemerisAvailable() || isMoshierFallback() || !startupValidation.passed) {
    return buildRejectedOutput('Swiss Ephemeris unavailable or failed startup validation', normalized, settings, runtime, startupValidation)
  }

  const birthTimeValidation = normalizeBirthTimeForCalculation({
    dateOfBirth: normalized.birth_date_iso,
    timeOfBirth: normalized.birth_time_iso,
    timezone: normalized.timezone,
    birthTimeKnown: normalized.birth_time_known,
  })
  if (birthTimeValidation.status !== 'valid' && birthTimeValidation.status !== 'missing_birth_time') {
    return buildRejectedOutput(`Invalid birth time state: ${birthTimeValidation.status}`, normalized, settings, runtime, startupValidation, { birth_time_validation: birthTimeValidation })
  }
  const birthTimeResult = convertBirthTimeToUTC({
    birth_date: normalized.birth_date_iso,
    birth_time: normalized.birth_time_iso ?? undefined,
    birth_time_known: normalized.birth_time_known,
    birth_time_precision: normalized.birth_time_precision,
    timezone: normalized.timezone,
  })
  if (birthTimeResult.timezone_status === 'invalid' || birthTimeResult.timezone_status === 'nonexistent' || !birthTimeResult.birth_utc) {
    return buildRejectedOutput('Invalid or nonexistent timezone conversion', normalized, settings, runtime, startupValidation, { birth_time_result: birthTimeResult })
  }

  const jdResult = calculateJulianDay(birthTimeResult.birth_utc, sweJulday)
  const ayanamsaResult = calculateAyanamsa(jdResult.jd_ut)
  const planets = calculateAllPlanets(jdResult.jd_ut, ayanamsaResult.value_degrees, settings.node_type)
  const sun = planets.Sun
  const moon = planets.Moon
  const mercury = planets.Mercury
  const venus = planets.Venus
  const mars = planets.Mars
  const jupiter = planets.Jupiter
  const saturn = planets.Saturn
  const rahu = planets.Rahu
  const ketu = planets.Ketu

  const lagna = calculateLagna(jdResult.jd_ut, normalized.latitude_full, normalized.longitude_full, ayanamsaResult.value_degrees, normalized.birth_time_known, normalized.birth_time_precision)
  const whole_sign_houses = calculateWholeSignHouses(lagna)
  const d1_rashi_chart = calculateD1Chart(planets, lagna, whole_sign_houses)
  const navamsa_d9 = calculateNavamsaChart(planets, lagna)
  const vimshottari_dasha = moon ? calculateVimshottari(moon.sidereal_longitude, birthTimeResult.birth_utc, runtimeClock) : null
  const panchang = moon && sun ? calculatePanchangResult({
    calculationInstantUtc: birthTimeResult.birth_utc,
    localDate: birthTimeResult.birth_local_wall_time.split('T')[0],
    timezone: normalized.timezone,
    latitude: normalized.latitude_full,
    longitude: normalized.longitude_full,
    convention: DEFAULT_PANCHANG_CONVENTION,
    runtimeClockInput: runtimeClock,
  }) : null
  const planetary_aspects_drishti = calculateGrahaDrishti(d1_rashi_chart, false)
  const yogas = calculateYogas(d1_rashi_chart, planetary_aspects_drishti, navamsa_d9)
  const doshas = calculateDoshas(d1_rashi_chart, planetary_aspects_drishti, planets)
  const strength_weakness_indicators = calculateStrength(planets, d1_rashi_chart, navamsa_d9, planetary_aspects_drishti)
  const life_area_signatures = calculateLifeAreas(d1_rashi_chart, planetary_aspects_drishti, strength_weakness_indicators.indicators, lagna)
  const daily_transits = calculateTransits(moon?.sign_index ?? 0, lagna, runtimeClock)
  const confidence = calculateConfidence({
    birth_time_known: normalized.birth_time_known,
    birth_time_precision: normalized.birth_time_precision,
    timezone_status: birthTimeResult.timezone_status,
    moon_near_nakshatra_boundary: !!moon?.boundary_warnings?.some((w) => w.includes('nakshatra boundary')),
    lagna_near_sign_boundary: !!lagna?.near_sign_boundary,
    any_planet_near_sign_boundary: Object.values(planets).some((p) => p.boundary_warnings.some((w) => w.includes('sign boundary'))),
    high_latitude_ascendant_instability: !!lagna?.high_latitude_flag,
    panchang_sunrise_unavailable: !panchang?.sunrise_utc,
    swiss_ephemeris_available: isSwissEphemerisAvailable(),
  })
  const warnings = collectWarnings({
    birth_time_known: normalized.birth_time_known,
    birth_time_precision: normalized.birth_time_precision,
    timezone_status: birthTimeResult.timezone_status,
    planet_boundary_warnings: Object.values(planets).flatMap((p) => p.boundary_warnings),
    moon_near_nakshatra_boundary: !!moon?.boundary_warnings?.some((w) => w.includes('nakshatra boundary')),
    lagna_near_sign_boundary: !!lagna?.near_sign_boundary,
    latitude: normalized.latitude_full,
    panchang_available: !!panchang?.sunrise_utc,
    daily_transit_available: !!daily_transits,
    yoga_statuses: yogas.map((y) => (y as { status: string }).status),
    dosha_statuses: doshas.map((d) => (d as { status: string }).status),
    swiss_ephemeris_available: isSwissEphemerisAvailable(),
  })
  const validation_results = [
    { name: 'schema', passed: true, details: 'validated structurally in route' },
    { name: 'startup_validation', passed: startupValidation.passed, details: startupValidation.checks.map((check) => ({ check_id: check.check_id, passed: check.passed })) },
  ]

  const panchangaV2Time = toPanchangaV2Time(normalized, birthTimeResult, runtimeClock.currentUtc)
  const vimshottariSection = ASTRO_CALC_INTEGRATION_ENABLED && moon && panchangaV2Time
    ? calculateVimshottariDashaV2({
        moonLongitudeDeg: getMoonAbsoluteLongitude({
          status: 'computed',
          source: 'deterministic_calculation',
          fields: { byBody: planets },
        }) ?? moon.sidereal_longitude,
        birthUtcIso: panchangaV2Time.utcDateTimeIso,
        runtimeClockIso: panchangaV2Time.runtimeClockIso,
      })
    : undefined

  const lagnaSection = lagna ? buildLagnaSectionContract(lagna) : null

  const housesSection = ASTRO_CALC_INTEGRATION_ENABLED && lagnaSection && planets
    ? await buildHousesSectionV2({
        lagna: lagnaSection,
        planetaryPositions: {
          status: 'computed',
          source: 'deterministic_calculation',
          engine: 'swiss_ephemeris',
          fields: { byBody: planets, ayanamshaDeg: ayanamsaResult.value_degrees },
        },
        houseSystem: normalizeHouseSystem(settings.house_system),
        ephemerisProvider: {
          engineId: 'swiss-ephemeris',
          engineVersion: getSweVersion(),
          ephemerisVersion: 'unknown',
          async calculateTropicalPositions() {
            return [];
          },
          async calculateAscendantMc() {
            return undefined as never;
          },
        },
        jdUtExact: jdResult.jd_ut,
        latitudeDeg: normalized.latitude_full,
        longitudeDeg: normalized.longitude_full,
        ayanamshaDeg: getAyanamshaDeg({
          status: 'computed',
          source: 'deterministic_calculation',
          fields: { ayanamshaDeg: ayanamsaResult.value_degrees },
        }),
      })
    : undefined

  const sections = ASTRO_CALC_INTEGRATION_ENABLED && sun && moon && panchangaV2Time
    ? {
        panchang: await calculatePanchangaV2({
          sunLongitudeDeg: sun.sidereal_longitude,
          moonLongitudeDeg: moon.sidereal_longitude,
          normalizedTime: panchangaV2Time,
        }),
        vimshottari: vimshottariSection,
        houses: housesSection,
      }
    : undefined

  if (ASTRO_CALC_INTEGRATION_ENABLED && sections && lagnaSection) {
    const shodashvarga = buildShodashvargaSection({
      planetaryPositions: {
        status: 'computed',
        source: 'deterministic_calculation',
        fields: { byBody: planets },
      },
      lagna: lagnaSection,
    })

    ;(sections as Record<string, unknown>).shodashvarga = shodashvarga
    ;(sections as Record<string, unknown>).shodashvargaBhav = buildShodashvargaBhavSection({
      shodashvarga,
    })
    ;(sections as Record<string, unknown>).d9Chart = buildD9ChartSectionFromShodashvarga(shodashvarga)
  } else if (ASTRO_CALC_INTEGRATION_ENABLED && sections) {
    ;(sections as Record<string, unknown>).shodashvarga = {
      status: 'unavailable',
      source: 'none',
      reason: 'planetary_positions_unavailable',
      fields: {},
    }
    ;(sections as Record<string, unknown>).shodashvargaBhav = {
      status: 'unavailable',
      source: 'none',
      reason: 'shodashvarga_unavailable',
      fields: {},
    }
    ;(sections as Record<string, unknown>).d9Chart = {
      status: 'unavailable',
      source: 'none',
      reason: 'shodashvarga_unavailable',
      fields: {},
    }
  }

  const output = {
    schema_version: '29.0.0',
    calculation_status: confidence.rejected ? 'rejected' : (birthTimeResult.timezone_status !== 'valid' || !normalized.birth_time_known ? 'partial' : 'calculated'),
    rejection_reason: confidence.rejected ? confidence.rejection_reason : undefined,
    input_use: {
      used_for_astronomical_calculation: ['birth_date', 'birth_time', 'birth_time_known', 'birth_time_precision', 'latitude', 'longitude', 'timezone', 'calendar_system'],
      excluded_from_astronomical_calculation: ['display_name', 'birth_place_name', 'gender', 'data_consent_version'],
    },
    birth_time_result: birthTimeResult,
    julian_day: jdResult,
    ayanamsa: ayanamsaResult,
    external_engine_metadata: {
      ephemeris_engine: 'swiss_ephemeris',
      swiss_ephemeris_version: getSweVersion(),
      timezone_engine: 'luxon',
      ayanamsa: 'lahiri',
      node_type: settings.node_type,
      sidereal_method: 'tropical_minus_ayanamsa',
      moshier_fallback: isMoshierFallback(),
    },
    runtime_clock: {
      current_utc: runtimeClock.currentUtc,
      as_of_date: runtimeClock.asOfDate,
    },
    constants_version: { constants_version: CONSTANTS_VERSION, rashi_map_version: RASHI_MAP_VERSION, nakshatra_map_version: NAKSHATRA_MAP_VERSION, dasha_order_version: DASHA_ORDER_VERSION, panchang_sequence_version: PANCHANG_SEQUENCE_VERSION, tradition_settings: { node_type: settings.node_type, ayanamsa: 'lahiri' } },
    planetary_positions: planets,
    sun_position: sun,
    moon_position: moon,
    mercury_position: mercury,
    venus_position: venus,
    mars_position: mars,
    jupiter_position: jupiter,
    saturn_position: saturn,
    rahu_position: rahu,
    ketu_position: ketu,
    sun_sign: calculateSign(sun?.sidereal_longitude ?? 0),
    moon_sign: calculateSign(moon?.sidereal_longitude ?? 0),
    nakshatra: calculateNakshatra(moon?.sidereal_longitude ?? 0),
    pada: calculateNakshatra(moon?.sidereal_longitude ?? 0).pada,
    tithi: panchang?.tithi ?? null,
    lagna,
    whole_sign_houses,
    d1_rashi_chart,
    navamsa_d9,
    vimshottari_dasha,
    planetary_aspects_drishti,
    yogas,
    doshas,
    strength_weakness_indicators,
    life_area_signatures,
    prediction_ready_context: stripForbiddenKeys({
      calculation_metadata: { ephemeris_engine: 'swiss_ephemeris', swiss_ephemeris_version: getSweVersion(), timezone_engine: 'luxon', ayanamsa: 'lahiri', node_type: settings.node_type, sidereal_method: 'tropical_minus_ayanamsa', moshier_fallback: isMoshierFallback(), constants_version: CONSTANTS_VERSION, rashi_map_version: RASHI_MAP_VERSION, nakshatra_map_version: NAKSHATRA_MAP_VERSION, dasha_order_version: DASHA_ORDER_VERSION, panchang_sequence_version: PANCHANG_SEQUENCE_VERSION, runtime_clock: { current_utc: runtimeClock.currentUtc, as_of_date: runtimeClock.asOfDate } },
      core_natal_summary: { ascendant: lagna, sun_sign: calculateSign(sun?.sidereal_longitude ?? 0), moon_sign: calculateSign(moon?.sidereal_longitude ?? 0), moon_nakshatra: calculateNakshatra(moon?.sidereal_longitude ?? 0), birth_tithi: panchang?.tithi ?? null, dasha_at_birth: vimshottari_dasha ? { lord: vimshottari_dasha.birth_dasha_lord, elapsed_years: vimshottari_dasha.dasha_elapsed_years, remaining_years: vimshottari_dasha.dasha_remaining_years } : null, confidence, warnings },
      planet_positions: Object.values(planets),
      lagna,
      houses: whole_sign_houses,
      d1_chart: d1_rashi_chart,
      d9_chart: navamsa_d9,
      dasha: vimshottari_dasha,
      panchang,
      daily_transits,
      aspects: planetary_aspects_drishti,
      yogas,
      doshas,
      strength_weakness: strength_weakness_indicators,
      life_area_signatures,
      confidence,
      warnings,
      unsupported_fields: [],
    }),
    core_natal_summary: { ascendant: lagna, sun_sign: calculateSign(sun?.sidereal_longitude ?? 0), moon_sign: calculateSign(moon?.sidereal_longitude ?? 0), moon_nakshatra: calculateNakshatra(moon?.sidereal_longitude ?? 0), birth_tithi: panchang?.tithi ?? null, dasha_at_birth: vimshottari_dasha ? { lord: vimshottari_dasha.birth_dasha_lord, elapsed_years: vimshottari_dasha.dasha_elapsed_years, remaining_years: vimshottari_dasha.dasha_remaining_years } : null, confidence, warnings },
    panchang,
    sections,
    daily_transits,
    confidence,
    warnings,
    validation_results,
    engine_boot_diagnostics: getEngineDiagnostics(),
    ephemeris_range_metadata: getEphemerisRangeMetadata(),
    startup_validation_result: startupValidation,
    openapi_schema_validation: { passed: true },
  }

  return masterAstroOutputSchema.parse(output) as MasterAstroCalculationOutput
}

function buildRejectedOutput(reason: string, normalized: NormalizedBirthInput, settings: AstrologySettings, runtime: { user_id: string; profile_id: string; current_utc: string; production: boolean }, startupValidation?: { passed: boolean; checks: Array<{ check_id: string; passed: boolean }> }, extras: Record<string, unknown> = {}): MasterAstroCalculationOutput {
  return {
    schema_version: '29.0.0',
    calculation_status: 'rejected',
    rejection_reason: reason,
    input_use: {
      used_for_astronomical_calculation: ['birth_date', 'birth_time', 'birth_time_known', 'birth_time_precision', 'latitude', 'longitude', 'timezone', 'calendar_system'],
      excluded_from_astronomical_calculation: ['display_name', 'birth_place_name', 'gender', 'data_consent_version'],
    },
    external_engine_metadata: { ephemeris_engine: 'swiss_ephemeris', swiss_ephemeris_version: '', timezone_engine: 'luxon', ayanamsa: 'lahiri', node_type: settings.node_type, sidereal_method: 'tropical_minus_ayanamsa', moshier_fallback: isMoshierFallback() },
    constants_version: { constants_version: CONSTANTS_VERSION, rashi_map_version: RASHI_MAP_VERSION, nakshatra_map_version: NAKSHATRA_MAP_VERSION, dasha_order_version: DASHA_ORDER_VERSION, panchang_sequence_version: PANCHANG_SEQUENCE_VERSION, tradition_settings: { node_type: settings.node_type, ayanamsa: 'lahiri' } },
    validation_results: [{ name: 'startup_validation', passed: !!startupValidation?.passed, details: startupValidation?.checks ?? null }],
    prediction_ready_context: stripForbiddenKeys({ do_not_recalculate: true, chart_identity: { chart_version_id: '', schema_version: '29.0.0', engine_version: '', ephemeris_version: '', calculation_status: 'rejected' }, confidence: {}, warnings: [], core_natal_summary: {}, life_area_signatures: {}, current_timing: {}, dashas: {}, doshas: {}, allowed_astro_terms: [], unsupported_fields: [], llm_instructions: { do_not_calculate_astrology: true, do_not_modify_chart_values: true, do_not_invent_missing_data: true, do_not_infer_missing_data: true, explain_only_from_supplied_context: true, mention_warnings_where_relevant: true, refuse_deterministic_medical_legal_financial_death_or_guaranteed_event_predictions: true } }),
    core_natal_summary: {},
    warnings: [{ warning_code: 'CALCULATION_REJECTED', severity: 'critical', affected_calculations: ['all'], explanation: reason }],
    ...extras,
  } as MasterAstroCalculationOutput
}
