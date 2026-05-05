/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

export type AyanamshaType = 'lahiri' | 'kp_new';

export type HouseSystem = 'whole_sign' | 'sripati' | 'kp_placidus';

export type CalculationSource =
  | 'deterministic_calculation'
  | 'stored_current_chart_json'
  | 'none';

export type SectionStatus =
  | 'computed'
  | 'partial'
  | 'unavailable'
  | 'error';

export type BirthInputV2 = {
  date_local: string;
  time_local: string | null;
  place_name: string | null;
  latitude_deg: number | null;
  longitude_deg: number | null;
  timezone: string | number;
  war_time_correction_seconds?: number;
  ayanamsha_main?: AyanamshaType;
  ayanamsha_kp?: AyanamshaType;
  house_system?: HouseSystem;
  runtime_clock?: string;
  disambiguation?: 'earlier' | 'later';
};

export type NormalizedBirthInputV2 = {
  dateLocal: string;
  timeLocal: string | null;
  localDateTimeIso: string | null;
  utcDateTimeIso: string | null;
  placeName: string | null;
  latitudeDeg: number | null;
  longitudeDeg: number | null;
  timezoneMode: 'iana' | 'fixed_offset_hours';
  timezone: string | null;
  timezoneHours: number | null;
  warTimeCorrectionSeconds: number;
  standardMeridianDeg: number | null;
  localTimeCorrectionSeconds: number | null;
  localMeanTimeIso: string | null;
  printedJulianDay: number | null;
  jdUtExact: number | null;
  runtimeClockIso: string;
  warnings: string[];
};

export type AstroSectionContract = {
  status: SectionStatus;
  source: CalculationSource;
  engine?: string;
  fields?: Record<string, unknown>;
  reason?: string;
  warnings?: string[];
};

export type AstroUnavailableReason =
  | 'module_not_implemented'
  | 'insufficient_birth_data'
  | 'unsupported_setting'
  | 'fixture_validation_missing'
  | 'ephemeris_unavailable'
  | 'calculation_failed';

export type AstroUnavailableValue = {
  status: 'unavailable';
  value: null;
  reason: AstroUnavailableReason;
  source: 'none';
  requiredModule: string;
  fieldKey: string;
};

export type PlanetNameV2 =
  | 'Asc'
  | 'Sun'
  | 'Moon'
  | 'Mars'
  | 'Mercury'
  | 'Jupiter'
  | 'Venus'
  | 'Saturn'
  | 'Rahu'
  | 'Ketu'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto';

export type PlanetaryPositionV2 = {
  body: PlanetNameV2;
  sign: string;
  signNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  degreeInSign: number;
  absoluteLongitude: number;
  nakshatra: string | null;
  pada: 1 | 2 | 3 | 4 | null;
  retrograde: boolean;
  speedDegPerDay: number | null;
  source: CalculationSource;
};
