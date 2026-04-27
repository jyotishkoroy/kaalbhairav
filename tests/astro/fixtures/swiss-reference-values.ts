/**
 * Swiss Ephemeris regression anchors.
 *
 * These values were computed by sweph@2.10.3-5 with sepl_18.se1 + semo_18.se1
 * (sha256 recorded in swiss.ts: KNOWN_EPHE_FILES).
 *
 * They serve as REGRESSION anchors — if any value changes after a library or
 * constant update, a tolerance test will catch it. They are NOT independent
 * references verified against a separate source.
 *
 * Independent reference validation (Section 28, tolerance table) is tracked in
 * reference-cases.ts — those fixtures are marked TODO until verified.
 */

export type PlanetRegressionAnchor = {
  body: string
  jd_ut: number
  tropical_longitude_deg: number // direct sweph output, no ayanamsa subtracted
  computed_at: string            // ISO date these anchors were recorded
  source: 'sweph_self_regression'
}

export type AyanamsaRegressionAnchor = {
  jd_ut: number
  lahiri_ayanamsa_deg: number
  computed_at: string
  source: 'sweph_self_regression'
}

export type LagnaRegressionAnchor = {
  jd_ut: number
  latitude: number
  longitude: number
  tropical_longitude_deg: number // ascendant tropical from houses_ex Placidus
  computed_at: string
  source: 'sweph_self_regression'
}

// ── J2000 anchors (JD 2451545.0 = 2000-01-01 12:00:00 UTC) ───────────────

export const J2000_JD = 2451545.0

export const J2000_PLANETS: PlanetRegressionAnchor[] = [
  { body: 'Sun',      jd_ut: J2000_JD, tropical_longitude_deg: 280.36891867, computed_at: '2026-04-26', source: 'sweph_self_regression' },
  { body: 'Moon',     jd_ut: J2000_JD, tropical_longitude_deg: 223.32375145, computed_at: '2026-04-26', source: 'sweph_self_regression' },
  { body: 'Mercury',  jd_ut: J2000_JD, tropical_longitude_deg: 271.88927705, computed_at: '2026-04-26', source: 'sweph_self_regression' },
  { body: 'Venus',    jd_ut: J2000_JD, tropical_longitude_deg: 241.56578838, computed_at: '2026-04-26', source: 'sweph_self_regression' },
  { body: 'Mars',     jd_ut: J2000_JD, tropical_longitude_deg: 327.96330253, computed_at: '2026-04-26', source: 'sweph_self_regression' },
  { body: 'Jupiter',  jd_ut: J2000_JD, tropical_longitude_deg:  25.25308718, computed_at: '2026-04-26', source: 'sweph_self_regression' },
  { body: 'Saturn',   jd_ut: J2000_JD, tropical_longitude_deg:  40.39566350, computed_at: '2026-04-26', source: 'sweph_self_regression' },
  { body: 'MeanNode', jd_ut: J2000_JD, tropical_longitude_deg: 125.04064606, computed_at: '2026-04-26', source: 'sweph_self_regression' },
  { body: 'TrueNode', jd_ut: J2000_JD, tropical_longitude_deg: 123.95402284, computed_at: '2026-04-26', source: 'sweph_self_regression' },
]

export const J2000_AYANAMSA: AyanamsaRegressionAnchor = {
  jd_ut: J2000_JD,
  lahiri_ayanamsa_deg: 23.85709235,
  computed_at: '2026-04-26',
  source: 'sweph_self_regression',
}

// Mumbai (19.076°N 72.878°E) at J2000
export const J2000_LAGNA_MUMBAI: LagnaRegressionAnchor = {
  jd_ut: J2000_JD,
  latitude: 19.0760,
  longitude: 72.8777,
  tropical_longitude_deg: 91.790879,
  computed_at: '2026-04-26',
  source: 'sweph_self_regression',
}

// ── Kolkata 1990-06-14 fixture anchors (JD 2448056.686111) ───────────────
// Birth: 1990-06-14 09:58 IST (UTC 04:28), Kolkata 22.567°N 88.367°E

export const KOLKATA_1990_JD = 2448056.686111

export const KOLKATA_1990_PLANETS: PlanetRegressionAnchor[] = [
  { body: 'Sun',      jd_ut: KOLKATA_1990_JD, tropical_longitude_deg:  82.874566, computed_at: '2026-04-26', source: 'sweph_self_regression' },
  { body: 'Moon',     jd_ut: KOLKATA_1990_JD, tropical_longitude_deg: 328.093548, computed_at: '2026-04-26', source: 'sweph_self_regression' },
  { body: 'Mercury',  jd_ut: KOLKATA_1990_JD, tropical_longitude_deg:  63.475875, computed_at: '2026-04-26', source: 'sweph_self_regression' },
  { body: 'Venus',    jd_ut: KOLKATA_1990_JD, tropical_longitude_deg:  47.233277, computed_at: '2026-04-26', source: 'sweph_self_regression' },
  { body: 'Mars',     jd_ut: KOLKATA_1990_JD, tropical_longitude_deg:  10.095735, computed_at: '2026-04-26', source: 'sweph_self_regression' },
  { body: 'Jupiter',  jd_ut: KOLKATA_1990_JD, tropical_longitude_deg: 105.605331, computed_at: '2026-04-26', source: 'sweph_self_regression' },
  { body: 'Saturn',   jd_ut: KOLKATA_1990_JD, tropical_longitude_deg: 294.108085, computed_at: '2026-04-26', source: 'sweph_self_regression' },
  { body: 'MeanNode', jd_ut: KOLKATA_1990_JD, tropical_longitude_deg: 309.767473, computed_at: '2026-04-26', source: 'sweph_self_regression' },
]

export const KOLKATA_1990_AYANAMSA: AyanamsaRegressionAnchor = {
  jd_ut: KOLKATA_1990_JD,
  lahiri_ayanamsa_deg: 23.723686,
  computed_at: '2026-04-26',
  source: 'sweph_self_regression',
}

export const KOLKATA_1990_LAGNA: LagnaRegressionAnchor = {
  jd_ut: KOLKATA_1990_JD,
  latitude: 22.5667,
  longitude: 88.3667,
  tropical_longitude_deg: 150.299564, // sidereal ≈ 126.58° → Leo
  computed_at: '2026-04-26',
  source: 'sweph_self_regression',
}
