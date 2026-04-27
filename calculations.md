# MASTER_ASTRO_CALCULATIONS_ONLY.md

## 1. Calculation Scope

### Purpose

Define the calculation-only scope for a Vedic/Jyotish backend engine. The engine must calculate astronomical positions, derived Jyotish fields, rule-based chart structures, rule-based timing periods, rule-based warnings, and validation outputs from the `BirthInput` contract. The engine must not generate interpretation text.

### Required Inputs

```ts
type BirthInput = {
  display_name: string;

  birth_date: string; // YYYY-MM-DD

  birth_time?: string; // optional, HH:MM or HH:MM:SS

  birth_time_known: boolean;

  birth_time_precision:
    | "exact"
    | "minute"
    | "hour"
    | "day_part"
    | "unknown";

  birth_place_name: string;

  latitude: number; // -90 to 90

  longitude: number; // -180 to 180

  timezone: string; // IANA timezone, example: Asia/Kolkata

  gender?: "male" | "female" | "non_binary" | "unknown" | "not_provided";

  calendar_system?: "gregorian";

  data_consent_version: string;
};
```

### Required Reference Source

- Swiss Ephemeris for production astronomical calculations.
- IANA timezone database through an audited library for local civil time to UTC conversion.
- JPL DE ephemerides or JPL Horizons may be used as higher-precision validation references.

### Formula / Method

Calculation scope includes only:

1. Timezone validation and UTC instant conversion.
2. Julian Day UT.
3. Lahiri / Chitrapaksha ayanamsa.
4. Geocentric apparent tropical and sidereal longitudes for Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, and Ketu.
5. Speeds and retrograde flags.
6. Rashi, degrees within sign, nakshatra, pada, and boundary warnings.
7. Tithi, yoga, karana, vara, sunrise, sunset, Moon rashi, and local Panchang-day fields.
8. Lagna / ascendant and whole-sign houses when birth time is reliable enough.
9. D1 / Rashi chart placements.
10. D9 / Navamsa placements.
11. Vimshottari Mahadasha, Antardasha, Pratyantardasha, birth balance, and current period.
12. Rule-based Jyotish aspects / graha drishti.
13. Rule-based yogas, doshas, and strength / weakness indicators.
14. Life-area signatures.
15. Prediction-ready calculation context.
16. Confidence score and warning list.
17. Daily transit calculations.

Production calculation requires Swiss Ephemeris or equivalent validated astronomical engine.

### Output Fields

All final output fields are defined in Section 29. No output field may be populated without either:

- a Swiss Ephemeris call or equivalent validated astronomical method;
- a formula in this specification;
- a rule object with evidence fields; or
- an explicit unavailable / unsupported status.

### Precision Requirement

Use IEEE-754 double precision internally. Never use rounded display values as inputs to downstream calculations.

### Boundary Conditions

Any position within `1 / 60` degree of a sign, nakshatra, pada, tithi, yoga, or karana boundary must emit a boundary warning for that field.

### Failure / Warning Conditions

Reject calculation when:

- Swiss Ephemeris or equivalent validated astronomical engine is unavailable.
- Timezone is invalid.
- Local civil time is nonexistent and no explicit disambiguation policy is selected.
- Required birth date is invalid.
- Coordinates are outside allowed ranges.
- Calendar system is not Gregorian.

Warn, degrade confidence, or mark unavailable when:

- birth time is approximate or unknown;
- local time is ambiguous;
- Lagna is unstable or unavailable;
- high latitude reduces ascendant reliability;
- panchang sunrise/sunset cannot be calculated;
- a tradition-dependent calculation is requested without an explicit setting.

### Validation Test

The engine must pass the validation tolerances in Section 28 before production use.

## 2. Input Fields Used for Calculation

### Purpose

Define which input fields affect astronomical and Jyotish calculations.

### Required Inputs

Only these fields affect astronomical calculation:

```txt
birth_date
birth_time
birth_time_known
birth_time_precision
latitude
longitude
timezone
calendar_system
```

These fields must not affect astronomical calculation:

```txt
display_name
birth_place_name
gender
data_consent_version
```

### Required Reference Source

- Internal input contract in this file.
- IANA timezone database for `timezone` validation.

### Formula / Method

Calculation-affecting fields:

```ts
const calculationInput = {
  birth_date,
  birth_time,
  birth_time_known,
  birth_time_precision,
  latitude,
  longitude,
  timezone,
  calendar_system: calendar_system ?? "gregorian"
};
```

Non-calculation fields may be stored for product, consent, personalization, or audit but must not be included in any mathematical formula.

### Output Fields

```ts
type InputCalculationUse = {
  used_for_astronomical_calculation: string[];
  excluded_from_astronomical_calculation: string[];
};
```

### Precision Requirement

`latitude` and `longitude` must retain full supplied numeric precision. No pre-rounding is allowed.

### Boundary Conditions

- `latitude` must satisfy `-90 <= latitude <= 90`.
- `longitude` must satisfy `-180 <= longitude <= 180`.
- `calendar_system` must be missing or exactly `"gregorian"`.
- `birth_date` must match `YYYY-MM-DD` and be a valid Gregorian date.
- `birth_time`, when supplied, must match `HH:MM` or `HH:MM:SS` and be a valid local wall time before timezone conversion.

### Failure / Warning Conditions

- Reject invalid coordinates.
- Reject invalid date.
- Reject unsupported calendar system.
- If `birth_time_known === false`, set `birth_time_precision = "unknown"` for calculation, do not calculate authoritative Lagna, and mark time-sensitive fields degraded or unavailable.
- If `birth_time_known === true` but `birth_time` is absent, reject or convert to `birth_time_known = false` only under an explicit data-normalization policy.

### Validation Test

Run schema validation against every mandatory test case in Section 28 before any astronomical call.

## 3. Required Constants and Enumerations

### Purpose

Define all required constants, enumerations, maps, and tradition settings used by later calculations.

### Required Inputs

None.

### Required Reference Source

- Swiss Ephemeris constants for astronomical body identifiers and flags.
- Classical Jyotish enumeration conventions for signs, nakshatras, Vimshottari order, and graha names.
- Tradition-dependent constants must be versioned in calculation metadata.

### Formula / Method

#### Numeric Constants

```ts
const FULL_CIRCLE_DEGREES = 360;
const SIGN_SPAN_DEGREES = 30;
const NAKSHATRA_COUNT = 27;
const NAKSHATRA_SPAN = 360 / 27; // 13.333333333333334 degrees
const PADA_COUNT_PER_NAKSHATRA = 4;
const PADA_SPAN = NAKSHATRA_SPAN / 4; // 3.3333333333333335 degrees
const TITHI_COUNT = 30;
const TITHI_SPAN = 12;
const HALF_TITHI_SPAN = 6;
const YOGA_COUNT = 27;
const YOGA_SPAN = 360 / 27;
const BOUNDARY_THRESHOLD_DEGREES = 1 / 60;
const VIMSHOTTARI_TOTAL_YEARS = 120;
```

#### Normalization

```ts
function normalize360(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}
```

#### Rashi / Sign Index Map

| Index | Sanskrit / Jyotish Name | English Name |
|---:|---|---|
| 0 | Mesha | Aries |
| 1 | Vrishabha | Taurus |
| 2 | Mithuna | Gemini |
| 3 | Karka | Cancer |
| 4 | Simha | Leo |
| 5 | Kanya | Virgo |
| 6 | Tula | Libra |
| 7 | Vrishchika | Scorpio |
| 8 | Dhanu | Sagittarius |
| 9 | Makara | Capricorn |
| 10 | Kumbha | Aquarius |
| 11 | Meena | Pisces |

```ts
const RASHI_MAP = [
  { index: 0, jyotish_name: "Mesha", english_name: "Aries" },
  { index: 1, jyotish_name: "Vrishabha", english_name: "Taurus" },
  { index: 2, jyotish_name: "Mithuna", english_name: "Gemini" },
  { index: 3, jyotish_name: "Karka", english_name: "Cancer" },
  { index: 4, jyotish_name: "Simha", english_name: "Leo" },
  { index: 5, jyotish_name: "Kanya", english_name: "Virgo" },
  { index: 6, jyotish_name: "Tula", english_name: "Libra" },
  { index: 7, jyotish_name: "Vrishchika", english_name: "Scorpio" },
  { index: 8, jyotish_name: "Dhanu", english_name: "Sagittarius" },
  { index: 9, jyotish_name: "Makara", english_name: "Capricorn" },
  { index: 10, jyotish_name: "Kumbha", english_name: "Aquarius" },
  { index: 11, jyotish_name: "Meena", english_name: "Pisces" }
] as const;
```

#### Nakshatra Index Map

| Index | Nakshatra | Lord |
|---:|---|---|
| 0 | Ashwini | Ketu |
| 1 | Bharani | Venus |
| 2 | Krittika | Sun |
| 3 | Rohini | Moon |
| 4 | Mrigashira | Mars |
| 5 | Ardra | Rahu |
| 6 | Punarvasu | Jupiter |
| 7 | Pushya | Saturn |
| 8 | Ashlesha | Mercury |
| 9 | Magha | Ketu |
| 10 | Purva Phalguni | Venus |
| 11 | Uttara Phalguni | Sun |
| 12 | Hasta | Moon |
| 13 | Chitra | Mars |
| 14 | Swati | Rahu |
| 15 | Vishakha | Jupiter |
| 16 | Anuradha | Saturn |
| 17 | Jyeshtha | Mercury |
| 18 | Mula | Ketu |
| 19 | Purva Ashadha | Venus |
| 20 | Uttara Ashadha | Sun |
| 21 | Shravana | Moon |
| 22 | Dhanistha | Mars |
| 23 | Shatabhisha | Rahu |
| 24 | Purva Bhadrapada | Jupiter |
| 25 | Uttara Bhadrapada | Saturn |
| 26 | Revati | Mercury |

```ts
const NAKSHATRA_MAP = [
  { index: 0, name: "Ashwini", lord: "Ketu" },
  { index: 1, name: "Bharani", lord: "Venus" },
  { index: 2, name: "Krittika", lord: "Sun" },
  { index: 3, name: "Rohini", lord: "Moon" },
  { index: 4, name: "Mrigashira", lord: "Mars" },
  { index: 5, name: "Ardra", lord: "Rahu" },
  { index: 6, name: "Punarvasu", lord: "Jupiter" },
  { index: 7, name: "Pushya", lord: "Saturn" },
  { index: 8, name: "Ashlesha", lord: "Mercury" },
  { index: 9, name: "Magha", lord: "Ketu" },
  { index: 10, name: "Purva Phalguni", lord: "Venus" },
  { index: 11, name: "Uttara Phalguni", lord: "Sun" },
  { index: 12, name: "Hasta", lord: "Moon" },
  { index: 13, name: "Chitra", lord: "Mars" },
  { index: 14, name: "Swati", lord: "Rahu" },
  { index: 15, name: "Vishakha", lord: "Jupiter" },
  { index: 16, name: "Anuradha", lord: "Saturn" },
  { index: 17, name: "Jyeshtha", lord: "Mercury" },
  { index: 18, name: "Mula", lord: "Ketu" },
  { index: 19, name: "Purva Ashadha", lord: "Venus" },
  { index: 20, name: "Uttara Ashadha", lord: "Sun" },
  { index: 21, name: "Shravana", lord: "Moon" },
  { index: 22, name: "Dhanistha", lord: "Mars" },
  { index: 23, name: "Shatabhisha", lord: "Rahu" },
  { index: 24, name: "Purva Bhadrapada", lord: "Jupiter" },
  { index: 25, name: "Uttara Bhadrapada", lord: "Saturn" },
  { index: 26, name: "Revati", lord: "Mercury" }
] as const;
```

#### Vimshottari Dasha Order and Years

| Lord | Years |
|---|---:|
| Ketu | 7 |
| Venus | 20 |
| Sun | 6 |
| Moon | 10 |
| Mars | 7 |
| Rahu | 18 |
| Jupiter | 16 |
| Saturn | 19 |
| Mercury | 17 |

```ts
const DASHA_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"] as const;

const DASHA_YEARS = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17
} as const;

const VIMSHOTTARI_TOTAL_YEARS = 120;
```

#### Planet / Graha List

```ts
const REQUIRED_GRAHAS = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Rahu",
  "Ketu"
] as const;
```

Optional only, not required for classical Jyotish output:

```ts
const OPTIONAL_OUTER_PLANETS = ["Uranus", "Neptune", "Pluto"] as const;
```

#### Swiss Ephemeris Body Mapping

Wrapper names may vary. The binding must map to these Swiss Ephemeris body identifiers or their exact equivalent:

```ts
const SWISS_BODY = {
  Sun: "SE_SUN",
  Moon: "SE_MOON",
  Mercury: "SE_MERCURY",
  Venus: "SE_VENUS",
  Mars: "SE_MARS",
  Jupiter: "SE_JUPITER",
  Saturn: "SE_SATURN",
  Rahu_mean: "SE_MEAN_NODE",
  Rahu_true: "SE_TRUE_NODE"
} as const;
```

Ketu is derived from Rahu and is not requested as an independent Swiss body.

#### Node Type Setting

```ts
type NodeType = "mean_node" | "true_node";
const DEFAULT_NODE_TYPE: NodeType = "mean_node";
```

The selected node type must be stored in calculation metadata.

#### Sign Lord Map

| Sign | Lord |
|---|---|
| Aries | Mars |
| Taurus | Venus |
| Gemini | Mercury |
| Cancer | Moon |
| Leo | Sun |
| Virgo | Mercury |
| Libra | Venus |
| Scorpio | Mars |
| Sagittarius | Jupiter |
| Capricorn | Saturn |
| Aquarius | Saturn |
| Pisces | Jupiter |

```ts
const SIGN_LORD_BY_SIGN_INDEX = {
  0: "Mars",
  1: "Venus",
  2: "Mercury",
  3: "Moon",
  4: "Sun",
  5: "Mercury",
  6: "Venus",
  7: "Mars",
  8: "Jupiter",
  9: "Saturn",
  10: "Saturn",
  11: "Jupiter"
} as const;
```

Optional tradition variant, not default:

```txt
Aquarius co-lord Rahu and Scorpio co-lord Ketu are optional tradition settings, not default.
```

#### Life-Area Houses

| Life area | House |
|---|---:|
| self | 1 |
| wealth | 2 |
| siblings | 3 |
| home_mother | 4 |
| children_intellect | 5 |
| enemies_health | 6 |
| partner_marriage | 7 |
| longevity_transformation | 8 |
| dharma_fortune | 9 |
| career_status | 10 |
| gains_network | 11 |
| losses_liberation | 12 |

#### Tithi Names

| Number | Paksha | Name |
|---:|---|---|
| 1 | Shukla | Pratipada |
| 2 | Shukla | Dvitiya |
| 3 | Shukla | Tritiya |
| 4 | Shukla | Chaturthi |
| 5 | Shukla | Panchami |
| 6 | Shukla | Shashthi |
| 7 | Shukla | Saptami |
| 8 | Shukla | Ashtami |
| 9 | Shukla | Navami |
| 10 | Shukla | Dashami |
| 11 | Shukla | Ekadashi |
| 12 | Shukla | Dwadashi |
| 13 | Shukla | Trayodashi |
| 14 | Shukla | Chaturdashi |
| 15 | Shukla | Purnima |
| 16 | Krishna | Pratipada |
| 17 | Krishna | Dvitiya |
| 18 | Krishna | Tritiya |
| 19 | Krishna | Chaturthi |
| 20 | Krishna | Panchami |
| 21 | Krishna | Shashthi |
| 22 | Krishna | Saptami |
| 23 | Krishna | Ashtami |
| 24 | Krishna | Navami |
| 25 | Krishna | Dashami |
| 26 | Krishna | Ekadashi |
| 27 | Krishna | Dwadashi |
| 28 | Krishna | Trayodashi |
| 29 | Krishna | Chaturdashi |
| 30 | Krishna | Amavasya |

#### Yoga Names

The engine must store the 27 Panchang yoga names in index order. Required index order:

| Index | Yoga |
|---:|---|
| 0 | Vishkambha |
| 1 | Priti |
| 2 | Ayushman |
| 3 | Saubhagya |
| 4 | Shobhana |
| 5 | Atiganda |
| 6 | Sukarma |
| 7 | Dhriti |
| 8 | Shula |
| 9 | Ganda |
| 10 | Vriddhi |
| 11 | Dhruva |
| 12 | Vyaghata |
| 13 | Harshana |
| 14 | Vajra |
| 15 | Siddhi |
| 16 | Vyatipata |
| 17 | Variyana |
| 18 | Parigha |
| 19 | Shiva |
| 20 | Siddha |
| 21 | Sadhya |
| 22 | Shubha |
| 23 | Shukla |
| 24 | Brahma |
| 25 | Indra |
| 26 | Vaidhriti |

#### Karana Names and Sequence

There are 11 karanas:

```ts
const KARANAS = [
  "Bava",
  "Balava",
  "Kaulava",
  "Taitila",
  "Gara",
  "Vanija",
  "Vishti",
  "Shakuni",
  "Chatushpada",
  "Naga",
  "Kimstughna"
] as const;
```

Default sequence by half-tithi index `karana_index_0_59 = floor(normalize360(moon - sun) / 6)`:

```ts
function karanaNameByHalfTithiIndex(k: number): string {
  if (k === 0) return "Kimstughna";
  if (k >= 1 && k <= 56) {
    const repeating = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"];
    return repeating[(k - 1) % 7];
  }
  if (k === 57) return "Shakuni";
  if (k === 58) return "Chatushpada";
  if (k === 59) return "Naga";
  throw new Error("Invalid karana half-tithi index");
}
```

This sequence must be validated against an authoritative Panchang reference before production.

#### Graha Drishti Aspect Offsets

| Graha | Aspect offsets |
|---|---|
| All planets | 7 |
| Mars | 4, 8 |
| Jupiter | 5, 9 |
| Saturn | 3, 10 |
| Rahu | 5, 9 |
| Ketu | 5, 9 |

Rahu/Ketu aspects are tradition-dependent and must be controlled by a setting.

### Output Fields

```ts
type ConstantSetVersion = {
  constants_version: string;
  rashi_map_version: string;
  nakshatra_map_version: string;
  dasha_order_version: string;
  panchang_sequence_version: string;
  tradition_settings: Record<string, unknown>;
};
```

### Precision Requirement

Constants must be represented as exact rational formulas where possible, not as manually truncated decimals.

### Boundary Conditions

Indexes must be zero-based unless explicitly named `number`, `house_number`, or `tithi_number`.

### Failure / Warning Conditions

Reject if required constant maps are missing, reordered, or version-mismatched.

### Validation Test

Unit tests must assert all array lengths and all map indexes:

- 12 rashi entries.
- 27 nakshatra entries.
- 9 Vimshottari lords with total 120 years.
- 27 yoga entries.
- 11 karana names.
- 12 sign lords.

## 4. Required External Reference Engines

### Purpose

Specify production-grade external calculation engines and prohibited production methods.

### Required Inputs

- UTC instant.
- Julian Day UT.
- Geographic latitude and longitude when calculating Lagna or rise/set.
- Engine configuration metadata.

### Required Reference Source

Required production source:

```txt
Swiss Ephemeris
```

Allowed higher-precision validation source:

```txt
JPL DE ephemerides / JPL Horizons
```

Required timezone source:

```txt
IANA timezone database
```

Required ayanamsa source:

```txt
Swiss Ephemeris Lahiri / Chitrapaksha ayanamsa
```

### Formula / Method

Production engine setup must perform the equivalent of:

```txt
swe_set_ephe_path(valid_ephemeris_path)
swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0)
```

Planet calculations must use the equivalent of:

```txt
swe_calc_ut(jd_ut, planet_id, flags)
```

Required flags for production planetary positions:

```txt
SEFLG_SWIEPH
SEFLG_SPEED
```

For sidereal mode, either:

```txt
SEFLG_SIDEREAL with swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0)
```

or tropical calculation followed by:

```ts
sidereal_longitude = normalize360(tropical_longitude - lahiri_ayanamsa)
```

Do not mix both sidereal methods in one output payload.

Julian Day must use either:

```txt
swe_julday(year, month, day, hour_decimal_utc, SE_GREG_CAL)
```

or the Gregorian formula in Section 6, validated against `swe_julday`.

Ayanamsa must use:

```txt
swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0)
swe_get_ayanamsa_ut(jd_ut)
```

or wrapper-equivalent `swe_get_ayanamsa_ex_ut`.

Lagna / ascendant must use:

```txt
swe_houses_ex(jd_ut, flags, latitude, longitude, house_system)
```

and `ascmc[0]` or wrapper-equivalent ascendant value. For whole-sign houses, use the ascendant longitude only to determine Lagna sign; whole-sign houses are derived by formula in Section 13.

Sunrise/sunset must use:

```txt
swe_rise_trans(...)
```

or a validated solar rise/set algorithm with documented atmospheric/refraction assumptions.

### Output Fields

```ts
type ExternalEngineMetadata = {
  ephemeris_engine: "swiss_ephemeris" | "jpl_horizons_validation" | "equivalent_validated_engine";
  swiss_ephemeris_version?: string;
  ephemeris_files_version?: string;
  timezone_engine: "temporal" | "luxon" | "other_iana_compatible";
  timezone_database_version?: string;
  ayanamsa: "lahiri";
  node_type: "mean_node" | "true_node";
  sidereal_method: "swiss_sidereal_flag" | "tropical_minus_ayanamsa";
};
```

#### Supplemental Engine Scope and Boot Diagnostics

The engine may expose the following implementation diagnostics as supplemental metadata. These fields are diagnostic only and must not change astronomical results.

```ts
type EngineScope = {
  engine_version: string;
  astronomical_basis: "geocentric_apparent";
  zodiac_system: "sidereal";
  house_system: "whole_sign";
  ephemeris_dependency: "swiss_ephemeris";
};

type EngineBootDiagnostics = {
  swiss_ephemeris_library_loaded: boolean;
  swiss_ephemeris_version?: string;
  ephemeris_data_path_loaded: boolean;
  ephemeris_files_loaded: boolean;
  ephemeris_file_hashes?: string[];
  jpl_ephemeris_loaded?: boolean;
  timezone_database_version?: string;
  startup_validation_passed: boolean;
  startup_validation_errors: string[];
};
```

#### Ephemeris Range Validation

The engine must validate that `jd_ut` is inside the date range actually supported by the loaded Swiss Ephemeris or JPL ephemeris files. Do not hard-code a broad documented date range as the only guard when the deployed files or wrapper report a narrower valid range.

```ts
type EphemerisRangeMetadata = {
  supported_start_jd: number;
  supported_end_jd: number;
  supported_start_date?: string;
  supported_end_date?: string;
  source: "loaded_swiss_files" | "loaded_jpl_file" | "wrapper_reported";
};

function assertEphemerisRange(jd_ut: number, range: EphemerisRangeMetadata): void {
  if (jd_ut < range.supported_start_jd || jd_ut > range.supported_end_jd) {
    rejectCalculation("JD_OUTSIDE_LOADED_EPHEMERIS_RANGE");
  }
}
```

#### Startup Validation

Before accepting production calculation requests, the service must run a startup validation routine and fail closed if any required dependency check fails.

Required startup checks:

- Swiss Ephemeris library or audited wrapper loads successfully.
- `swe_set_ephe_path(valid_ephemeris_path)` succeeds or wrapper-equivalent ephemeris path loading succeeds.
- Required ephemeris files are readable by the runtime process.
- Swiss Ephemeris version and ephemeris file version or hashes are captured when available.
- `swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0)` succeeds.
- One fixed-reference `swe_calc_ut` call succeeds for Sun, Moon, and at least one node.
- One fixed-reference `swe_get_ayanamsa_ut` or wrapper-equivalent call succeeds.
- One fixed-reference `swe_houses_ex` call succeeds for a known UTC instant and location.
- One fixed-reference `swe_rise_trans` call succeeds or the configured rise/set algorithm reports validated availability.
- IANA-compatible timezone engine loads and reports a timezone database version when available.
- Ephemeris range metadata is available and checked before every astronomical call.

```ts
type StartupValidationResult = {
  passed: boolean;
  checks: Array<{
    check_id: string;
    passed: boolean;
    evidence: Record<string, unknown>;
    error?: string;
  }>;
};
```


### Precision Requirement

- Planetary longitudes: validate to `<= 0.01°` against Swiss Ephemeris.
- Lahiri ayanamsa: validate to `<= 0.001°` against Swiss Ephemeris.
- Lagna: validate to `<= 0.05°` against Swiss Ephemeris.

### Boundary Conditions

The engine must fail closed when required engine output status is an error code or wrapper error.

### Failure / Warning Conditions

- Reject if Swiss Ephemeris is unavailable in production.
- Reject if Moshier or simplified formula fallback is used for production planetary positions.
- Reject if timezone library is not IANA-compatible.
- Warn if JPL validation and Swiss Ephemeris differ beyond tolerance.

### Validation Test

For a fixed UTC instant and location, compare `swe_calc_ut`, `swe_get_ayanamsa_ut`, `swe_houses_ex`, and `swe_rise_trans` wrapper outputs against a known Swiss Ephemeris CLI or reference binary.

## 5. Timezone and Birth UTC Calculation

### Purpose

Convert local birth date, local birth time, and IANA timezone into a validated UTC instant and uncertainty value.

### Required Inputs

- `birth_date`
- `birth_time`
- `birth_time_known`
- `birth_time_precision`
- `timezone`
- `calendar_system`

### Required Reference Source

- IANA timezone database through Temporal API / `@js-temporal/polyfill`, Luxon, or another audited IANA-compatible timezone library.
- Do not manually infer timezone offsets with `Intl.DateTimeFormat`.

### Formula / Method

Pipeline:

```txt
Input local date + local time + IANA timezone
-> validated local civil time
-> UTC instant
```

If `birth_time_known === true`:

```ts
local_wall_time = `${birth_date}T${birth_time}`;
```

If `birth_time_known === false`:

```ts
local_wall_time = `${birth_date}T12:00:00`;
birth_time_uncertainty_seconds = 86400;
```

Noon is only a computational placeholder for date-level non-Lagna outputs. It must not be treated as actual birth time.

Birth time uncertainty:

| Precision | Uncertainty seconds |
|---|---:|
| exact | 0 |
| minute | 60 |
| hour | 3600 |
| day_part | 21600 |
| unknown | 86400 |

Temporal-compatible disambiguation policy:

```ts
type TimezoneDisambiguation = "not_needed" | "earlier" | "later" | "rejected";
```

Default production policy:

```txt
Reject nonexistent local times.
Reject ambiguous local times unless caller explicitly selects earlier or later.
```

Offset minutes:

```ts
utc_offset_minutes = (local_epoch_milliseconds - utc_epoch_milliseconds) / 60000;
```

Use the library-provided offset if available; do not derive offset from formatted strings.

### Output Fields

```ts
type BirthTimeResult = {
  birth_local_wall_time: string;
  timezone: string;
  birth_utc: string;
  utc_offset_minutes: number;
  timezone_status:
    | "valid"
    | "invalid"
    | "ambiguous"
    | "nonexistent";
  timezone_disambiguation:
    | "not_needed"
    | "earlier"
    | "later"
    | "rejected";
  birth_time_uncertainty_seconds: number;
};
```

### Precision Requirement

UTC output must be ISO 8601 with seconds precision at minimum. Millisecond precision may be stored if supplied.

### Boundary Conditions

- Ambiguous DST fall-back local time must not silently choose an offset.
- Nonexistent DST spring-forward local time must not silently roll forward or backward.
- Historical timezone conversion must use the IANA database version captured in metadata.

### Failure / Warning Conditions

- Invalid timezone: reject.
- Nonexistent local time: reject unless an explicit policy exists; default is reject.
- Ambiguous local time: mark `timezone_status = "ambiguous"`, require `earlier` or `later`, and deduct confidence if accepted.
- Missing birth time with `birth_time_known = true`: reject.

### Validation Test

Mandatory tests:

- India birth, no DST.
- US birth during DST.
- US ambiguous DST fall-back.
- US nonexistent DST spring-forward.
- Europe historical timezone.
- Unknown birth time.

## 6. Julian Day Calculation

### Purpose

Calculate Julian Day UT for astronomical calls.

### Required Inputs

- `birth_utc`
- Gregorian UTC year, month, day, hour, minute, second.

### Required Reference Source

- Swiss Ephemeris `swe_julday` when available through wrapper.
- If formula is used, validate against `swe_julday`.

### Formula / Method

Preferred production call:

```txt
jd_ut = swe_julday(year, month, day, hour_decimal_utc, SE_GREG_CAL)
```

Formula allowed only for Gregorian UTC validation or fallback:

```txt
If month <= 2:
  Y = year - 1
  M = month + 12
else:
  Y = year
  M = month

A = floor(Y / 100)
B = 2 - A + floor(A / 4)

D = day + (hour + minute / 60 + second / 3600) / 24

JD = floor(365.25 x (Y + 4716))
   + floor(30.6001 x (M + 1))
   + D
   + B
   - 1524.5
```

Required:

- Gregorian calendar only.
- UTC time only.
- Validate against Swiss Ephemeris `swe_julday`.

### Output Fields

```ts
type JulianDayResult = {
  jd_ut: number;
  calendar: "gregorian";
  source: "swiss_ephemeris" | "formula_validated_against_swiss_ephemeris";
};
```

### Precision Requirement

Display Julian Day with at least 6 decimals. Store full double precision.

### Boundary Conditions

- Leap day must be valid only for Gregorian leap years.
- Dates before Gregorian adoption are still interpreted as proleptic Gregorian unless a future version explicitly adds another calendar system.

### Failure / Warning Conditions

- Reject non-Gregorian calendar.
- Reject invalid UTC instant.
- Reject if formula and `swe_julday` differ beyond `0.000001` day.

### Validation Test

Compare formula output to Swiss Ephemeris `swe_julday` for all mandatory date/time tests in Section 28.

## 7. Ayanamsa Calculation

### Purpose

Calculate Lahiri / Chitrapaksha ayanamsa for conversion from tropical to sidereal longitude.

### Required Inputs

- `jd_ut`

### Required Reference Source

```txt
Swiss Ephemeris Lahiri / Chitrapaksha ayanamsa
```

### Formula / Method

Production method:

```txt
swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0)
ayanamsa = swe_get_ayanamsa_ut(jd_ut)
```

Wrapper equivalent may use:

```txt
swe_get_ayanamsa_ex_ut(jd_ut, flags)
```

Do not include approximate Lahiri formulas as production method.

### Output Fields

```ts
type AyanamsaResult = {
  name: "lahiri";
  value_degrees: number;
  source: "swiss_ephemeris";
};
```

### Precision Requirement

Validate ayanamsa to `<= 0.001°` against Swiss Ephemeris.

### Boundary Conditions

`value_degrees` must be finite and in a plausible range for the date. No hard-coded modern range may be used for ancient or future dates without reference validation.

### Failure / Warning Conditions

- Reject if Swiss Ephemeris sidereal mode cannot be set.
- Reject if ayanamsa call returns an error.
- Reject if an approximate formula is attempted in production.

### Validation Test

For at least one date in every mandatory timezone/date case, compare stored `value_degrees` against a Swiss Ephemeris reference output.

## 8. Planetary Position Calculations

### Purpose

Calculate geocentric apparent planetary positions, speeds, retrograde status, sidereal longitudes, and derived sign/nakshatra/pada values for required grahas.

### Required Inputs

- `jd_ut`
- `ayanamsa.value_degrees`
- `node_type`
- `sidereal_method`

### Required Reference Source

```txt
Swiss Ephemeris geocentric apparent planetary position
```

Allowed validation:

```txt
JPL DE ephemerides / JPL Horizons
```

### Formula / Method

Production tropical call for each non-node graha:

```txt
swe_calc_ut(jd_ut, planet_id, SEFLG_SWIEPH | SEFLG_SPEED)
```

Expected result vector equivalent:

```txt
xx[0] = ecliptic longitude in degrees
xx[1] = ecliptic latitude in degrees
xx[2] = distance in AU
xx[3] = speed in longitude degrees/day
xx[4] = speed in latitude degrees/day
xx[5] = speed in distance AU/day
```

Required tropical longitude:

```ts
tropical_longitude = normalize360(xx[0]);
speed_longitude = xx[3];
```

Sidereal method A, if using tropical-minus-ayanamsa:

```ts
sidereal_longitude = normalize360(tropical_longitude - lahiri_ayanamsa);
```

Sidereal method B, if using Swiss sidereal flag:

```txt
swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0)
swe_calc_ut(jd_ut, planet_id, SEFLG_SWIEPH | SEFLG_SPEED | SEFLG_SIDEREAL)
```

Do not mix both sidereal methods in one output.

Retrograde:

```ts
is_retrograde = speed_longitude < 0;
```

Rahu:

```txt
Use selected node type: mean_node or true_node.
```

```ts
rahuPlanetId = node_type === "mean_node" ? "SE_MEAN_NODE" : "SE_TRUE_NODE";
```

Ketu:

```ts
ketu_sidereal_longitude = normalize360(rahu_sidereal_longitude + 180);
ketu_tropical_longitude = normalize360(rahu_tropical_longitude + 180);
ketu_speed_longitude = rahu_speed_longitude;
ketu_is_retrograde = ketu_speed_longitude < 0;
```

After longitude calculation, derive sign, nakshatra, and pada using Sections 9 and 10.

### Output Fields

```ts
type PlanetPosition = {
  name: string;
  tropical_longitude: number;
  sidereal_longitude: number;
  speed_longitude: number;
  is_retrograde: boolean;
  sign: string;
  sign_index: number;
  degrees_in_sign: number;
  nakshatra: string;
  nakshatra_index: number;
  pada: number;
  boundary_warnings: string[];
};
```

Required planets:

```txt
Sun
Moon
Mercury
Venus
Mars
Jupiter
Saturn
Rahu
Ketu
```

### Precision Requirement

Planetary longitudes must validate to `<= 0.01°` against Swiss Ephemeris.

### Boundary Conditions

- Normalize all longitudes into `[0, 360)`.
- At exact `360°`, normalize to `0°`.
- Boundary warning if within `1 / 60°` of sign, nakshatra, pada, tithi-relevant, or yoga-relevant boundary.

### Failure / Warning Conditions

- Reject if Swiss Ephemeris returns an error for any required graha.
- Warn if node type is not stored in metadata.
- Warn if a planet is within boundary threshold of sign/nakshatra/pada.
- Production calculation requires Swiss Ephemeris or equivalent validated astronomical engine.

### Validation Test

For each mandatory test case, validate Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Rahu, and Ketu longitudes against Swiss Ephemeris with tolerance `<= 0.01°`.

## 9. Sign / Rashi Calculation

### Purpose

Derive sign/rashi index, sign name, and degrees within sign from sidereal longitude.

### Required Inputs

- `sidereal_longitude`
- `RASHI_MAP`

### Required Reference Source

Derived arithmetic using constants in Section 3.

### Formula / Method

```ts
normalized = normalize360(sidereal_longitude);
sign_index = Math.floor(normalized / 30);
degrees_in_sign = normalized - sign_index * 30;
sign = RASHI_MAP[sign_index];
```

Boundary distance:

```ts
position_in_sign = normalized % 30;
distance_to_previous_sign_boundary = position_in_sign;
distance_to_next_sign_boundary = 30 - position_in_sign;
near_sign_boundary = Math.min(
  distance_to_previous_sign_boundary,
  distance_to_next_sign_boundary === 30 ? 0 : distance_to_next_sign_boundary
) <= BOUNDARY_THRESHOLD_DEGREES;
```

### Output Fields

```ts
type SignPlacement = {
  sign: string;
  sign_index: number;
  degrees_in_sign: number;
  near_sign_boundary: boolean;
};
```

### Precision Requirement

Use full double precision internally. Display degrees to `0.0001°`.

### Boundary Conditions

- `normalized = 0` maps to sign index `0`.
- `normalized` close to `360` must normalize to near `0`, with boundary warning.
- If floating error produces `sign_index = 12`, clamp only after proving `normalized` is within floating epsilon of `360`; otherwise reject.

### Failure / Warning Conditions

Warn if within `1 arcminute` of sign boundary.

### Validation Test

Test exact and near-boundary values:

- `0° -> Aries index 0`.
- `29.999999° -> Aries index 0` with warning if within threshold.
- `30° -> Taurus index 1`.
- `359.999999° -> Pisces index 11` with warning.

## 10. Nakshatra and Pada Calculation

### Purpose

Derive nakshatra index, nakshatra name, lord, pada, and boundary warnings from sidereal longitude.

### Required Inputs

- `sidereal_longitude`
- `NAKSHATRA_MAP`
- `NAKSHATRA_SPAN`
- `PADA_SPAN`

### Required Reference Source

Derived arithmetic using constants in Section 3.

### Formula / Method

Constants:

```ts
NAKSHATRA_SPAN = 360 / 27; // 13.333333333333334 degrees
PADA_SPAN = NAKSHATRA_SPAN / 4; // 3.3333333333333335 degrees
```

Formula:

```ts
normalized = normalize360(sidereal_longitude);
nakshatra_index = Math.floor(normalized / NAKSHATRA_SPAN);
degrees_inside_nakshatra = normalized - nakshatra_index * NAKSHATRA_SPAN;
pada = Math.floor(degrees_inside_nakshatra / PADA_SPAN) + 1;
nakshatra = NAKSHATRA_MAP[nakshatra_index];
```

Boundary distances:

```ts
position_in_nakshatra = normalized % NAKSHATRA_SPAN;
near_nakshatra_boundary = Math.min(
  position_in_nakshatra,
  NAKSHATRA_SPAN - position_in_nakshatra
) <= BOUNDARY_THRESHOLD_DEGREES;

position_in_pada = degrees_inside_nakshatra % PADA_SPAN;
near_pada_boundary = Math.min(
  position_in_pada,
  PADA_SPAN - position_in_pada
) <= BOUNDARY_THRESHOLD_DEGREES;
```

If `pada === 5` due to floating-point error and longitude is within epsilon of the next nakshatra boundary, set `pada = 1` and increment nakshatra through normalized recomputation only. Do not silently clamp ordinary values.

### Output Fields

```ts
type NakshatraPlacement = {
  nakshatra: string;
  nakshatra_index: number;
  nakshatra_lord: string;
  degrees_inside_nakshatra: number;
  pada: number;
  near_nakshatra_boundary: boolean;
  near_pada_boundary: boolean;
};
```

### Precision Requirement

Display longitude-derived values to `0.0001°`; retain double precision internally.

### Boundary Conditions

If within `1 arcminute` of nakshatra or pada boundary, emit warning.

### Failure / Warning Conditions

- Warn: `near_nakshatra_boundary`.
- Warn: `near_pada_boundary`.
- If Moon is near nakshatra boundary, degrade dasha confidence.

### Validation Test

Test exact nakshatra spans and pada boundaries for all 27 nakshatras and all 108 padas.

## 11. Tithi Calculation

### Purpose

Calculate lunar day / tithi from Moon-Sun angular elongation.

### Required Inputs

- `moon_sidereal_longitude`
- `sun_sidereal_longitude`
- selected Panchang convention metadata

### Required Reference Source

- Astronomical Sun/Moon longitudes from Swiss Ephemeris.
- Reference Panchang for validation.

### Formula / Method

Default Vedic Panchang convention in this specification:

```txt
Use sidereal Sun and sidereal Moon longitudes from the same Lahiri ayanamsa pipeline.
```

Because tropical-minus-ayanamsa subtracts the same ayanamsa from both Sun and Moon, Moon-Sun elongation is numerically identical under tropical or sidereal longitudes if both are geocentric ecliptic longitudes from the same epoch. The stored convention must still say `"sidereal_lahiri"` for Panchang consistency and validation.

Formula:

```ts
moon_sun_angle = normalize360(moon_sidereal_longitude - sun_sidereal_longitude);
tithi_index = Math.floor(moon_sun_angle / 12); // 0 to 29
tithi_number = tithi_index + 1; // 1 to 30
tithi_fraction_elapsed = (moon_sun_angle % 12) / 12;
tithi_fraction_remaining = 1 - tithi_fraction_elapsed;
```

Paksha:

```ts
paksha = tithi_number <= 15 ? "Shukla" : "Krishna";
```

Tithi name:

```ts
tithi_name = TITHI_NAME_MAP[tithi_number];
```

Boundary warning:

```ts
position_in_tithi = moon_sun_angle % 12;
near_tithi_boundary = Math.min(position_in_tithi, 12 - position_in_tithi) <= BOUNDARY_THRESHOLD_DEGREES;
```

### Output Fields

```ts
type TithiResult = {
  moon_sun_angle: number;
  tithi_index: number;
  tithi_number: number;
  paksha: "Shukla" | "Krishna";
  tithi_name: string;
  tithi_fraction_elapsed: number;
  tithi_fraction_remaining: number;
  near_tithi_boundary: boolean;
  convention: "sidereal_lahiri";
};
```

### Precision Requirement

Display tithi fraction to 4 decimals. Use full precision for boundary checks.

### Boundary Conditions

- `moon_sun_angle = 0°` maps to Shukla Pratipada, tithi number 1.
- `moon_sun_angle = 180°` maps to Krishna Pratipada, tithi number 16.
- Exact `360°` normalizes to `0°`.

### Failure / Warning Conditions

- Warn if near `12°` multiple.
- Require validation against reference Panchang.
- Mark Panchang tithi unavailable if Sun or Moon longitude unavailable.

### Validation Test

Compare tithi number and paksha against an authoritative Panchang for mandatory test cases; exact except boundary warning.

## 12. Lagna / Ascendant Calculation

### Purpose

Calculate Lagna / ascendant longitude and derived sign/nakshatra/pada, with reliability flags.

### Required Inputs

- `jd_ut`
- `latitude`
- `longitude`
- `birth_time_known`
- `birth_time_precision`
- `birth_time_uncertainty_seconds`
- `ayanamsa.value_degrees`
- `sidereal_method`

### Required Reference Source

```txt
Swiss Ephemeris ascendant calculation or validated equivalent
```

### Formula / Method

If birth time unknown:

```txt
Do not produce authoritative Lagna.
```

Production call:

```txt
swe_houses_ex(jd_ut, flags, latitude, longitude, house_system)
```

Required configuration:

```txt
house_system = a wrapper-supported house system used only to obtain ascendant; whole-sign houses are derived separately.
```

Typical flags:

```txt
SEFLG_SWIEPH
```

If using Swiss sidereal flag for ascendant:

```txt
swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0)
swe_houses_ex(jd_ut, SEFLG_SIDEREAL, latitude, longitude, house_system)
```

If using tropical ascendant then ayanamsa conversion:

```ts
tropical_longitude = normalize360(ascmc[0]);
sidereal_longitude = normalize360(tropical_longitude - lahiri_ayanamsa);
```

Do not mix both methods in one output.

Derived fields use Sections 9 and 10.

Reliability:

```ts
if (!birth_time_known || birth_time_precision === "unknown") reliability = "not_available";
else if (birth_time_precision === "exact" || birth_time_precision === "minute") reliability = "high";
else if (birth_time_precision === "hour") reliability = "medium";
else reliability = "low";
```

Uncertainty flag:

```ts
uncertainty_flag = reliability !== "high" || near_sign_boundary || high_latitude_flag;
```

High latitude flag default:

```ts
high_latitude_flag = Math.abs(latitude) >= 66.0;
```

### Output Fields

```ts
type LagnaResult = {
  sidereal_longitude: number;
  tropical_longitude: number;
  sign: string;
  sign_index: number;
  degrees_in_sign: number;
  nakshatra: string;
  nakshatra_index: number;
  pada: number;
  uncertainty_flag: boolean;
  reliability: "high" | "medium" | "low" | "not_available";
};
```

### Precision Requirement

Validate Lagna longitude to `<= 0.05°` against Swiss Ephemeris.

### Boundary Conditions

- Do not calculate authoritative Lagna for unknown birth time.
- If Lagna is within `1 arcminute` of sign boundary, warn and deduct confidence.
- At high latitude, ascendant may be unstable; warn and deduct confidence.

### Failure / Warning Conditions

- If Swiss Ephemeris house/ascendant call fails, mark Lagna unavailable.
- If birth time precision is `hour`, `day_part`, or `unknown`, degrade reliability.
- Production calculation requires Swiss Ephemeris or equivalent validated astronomical engine.

### Validation Test

For mandatory test cases with known birth time, compare Lagna against Swiss Ephemeris within `<= 0.05°`.

## 13. Whole-Sign House Calculation

### Purpose

Calculate the 12 whole-sign houses from Lagna sign index.

### Required Inputs

- `lagna.sign_index`
- `lagna.reliability`
- `RASHI_MAP`

### Required Reference Source

Derived Jyotish whole-sign arithmetic.

### Formula / Method

```ts
for (house_number = 1; house_number <= 12; house_number++) {
  house_sign_index = (lagna_sign_index + house_number - 1) % 12;
  house_sign = RASHI_MAP[house_sign_index];
}
```

Reliability inherits from Lagna:

```ts
house.reliability = lagna.reliability;
```

If Lagna unavailable:

```txt
All whole-sign houses must be unavailable.
```

### Output Fields

```ts
type WholeSignHouse = {
  house_number: number;
  sign: string;
  sign_index: number;
  reliability: "high" | "medium" | "low" | "not_available";
};
```

### Precision Requirement

House sign indexes are exact integer derivations unless Lagna sign has a boundary warning.

### Boundary Conditions

- House numbers are one-based: 1 through 12.
- Sign indexes are zero-based: 0 through 11.

### Failure / Warning Conditions

- If Lagna reliability is `not_available`, house calculations are unavailable.
- If Lagna near sign boundary, all houses inherit warning.

### Validation Test

For each possible Lagna sign index, assert that 12 houses cover all sign indexes exactly once in zodiacal order.

## 14. D1 / Rashi Chart Calculation

### Purpose

Calculate D1 / Rashi chart sign placements and planet-to-house placements.

### Required Inputs

- `planet_positions[].sign_index`
- `lagna.sign_index`
- `lagna.reliability`
- `RASHI_MAP`

### Required Reference Source

Derived arithmetic using planet sidereal longitudes and whole-sign houses.

### Formula / Method

Planet-to-house placement:

```ts
house_number = ((planet_sign_index - lagna_sign_index + 12) % 12) + 1;
```

Planet-to-sign placement:

```ts
planet_sign = RASHI_MAP[planet_sign_index];
```

If Lagna unavailable:

```txt
Planet-to-house placement must be unavailable.
Planet-to-sign placement remains available.
```

House occupants:

```ts
occupying_planets_by_house[house_number] = planets.filter(p => p.house_number === house_number);
```

### Output Fields

```ts
type D1PlanetPlacement = {
  planet: string;
  sign: string;
  sign_index: number;
  degrees_in_sign: number;
  house_number: number | null;
  house_reliability: "high" | "medium" | "low" | "not_available";
};

type D1Chart = {
  lagna_sign_index: number | null;
  houses: WholeSignHouse[];
  planet_to_sign: Record<string, SignPlacement>;
  planet_to_house: Record<string, number | null>;
  occupying_planets_by_house: Record<number, string[]>;
};
```

### Precision Requirement

House placement is exact if planet sign and Lagna sign are reliable and not boundary-ambiguous.

### Boundary Conditions

- Planet near sign boundary must emit placement warning.
- Lagna near sign boundary must emit house placement warning for all planets.

### Failure / Warning Conditions

- House placement unavailable if Lagna unavailable.
- Warn when planet sign or Lagna sign is boundary-sensitive.

### Validation Test

For all 12 Lagna signs and all 12 planet signs, assert house formula outputs 1 through 12 correctly.

## 15. Navamsa / D9 Calculation

### Purpose

Calculate Navamsa / D9 sign per planet, Navamsa Lagna, and Navamsa house per planet when Navamsa Lagna is available.

### Required Inputs

- planet sidereal longitudes
- Lagna sidereal longitude, if available
- `RASHI_MAP`

### Required Reference Source

Classical Navamsa sign sequence rule. The rule and corrected map below must be validated against authoritative Jyotish references before production.

### Formula / Method

Base calculation:

```ts
sign_index = Math.floor(normalize360(longitude) / 30);
degrees_in_sign = normalize360(longitude) - sign_index * 30;
navamsa_index = Math.floor(degrees_in_sign / (30 / 9));
```

Start-sign rule:

| Rashi type | Sign indexes | Navamsa sequence starts from |
|---|---|---|
| Movable | 0, 3, 6, 9 | Same sign |
| Fixed | 1, 4, 7, 10 | 9th from sign |
| Dual | 2, 5, 8, 11 | 5th from sign |

Rule-derived start map:

```ts
const NAVAMSA_START = {
  0: 0,  // Aries movable -> Aries
  1: 9,  // Taurus fixed -> Capricorn
  2: 6,  // Gemini dual -> Libra
  3: 3,  // Cancer movable -> Cancer
  4: 0,  // Leo fixed -> Aries
  5: 9,  // Virgo dual -> Capricorn
  6: 6,  // Libra movable -> Libra
  7: 3,  // Scorpio fixed -> Cancer
  8: 0,  // Sagittarius dual -> Aries
  9: 9,  // Capricorn movable -> Capricorn
  10: 6, // Aquarius fixed -> Libra
  11: 3  // Pisces dual -> Cancer
} as const;
```

The prompt-provided map conflicts with the stated movable/fixed/dual rule for Sagittarius, Capricorn, Aquarius, and Pisces. This specification uses the rule-derived corrected map above. This correction must be validated against an authoritative Jyotish calculation reference before production.

Navamsa sign:

```ts
navamsa_start_sign_index = NAVAMSA_START[sign_index];
navamsa_sign_index = (navamsa_start_sign_index + navamsa_index) % 12;
```

Navamsa Lagna:

```ts
navamsa_lagna_sign_index = calculateNavamsaSignIndex(lagna_sidereal_longitude);
```

Navamsa house:

```ts
navamsa_house = ((planet_navamsa_sign_index - navamsa_lagna_sign_index + 12) % 12) + 1;
```

If Navamsa Lagna unavailable:

```txt
Navamsa house per planet is unavailable.
```

### Output Fields

```ts
type NavamsaPlacement = {
  body: string;
  d1_sign_index: number;
  d1_degrees_in_sign: number;
  navamsa_index: number;
  navamsa_sign: string;
  navamsa_sign_index: number;
  navamsa_house: number | null;
  boundary_warnings: string[];
};

type NavamsaChart = {
  navamsa_lagna_sign_index: number | null;
  navamsa_lagna_sign: string | null;
  placements: NavamsaPlacement[];
};
```

### Precision Requirement

Use full longitude precision. Navamsa boundaries occur every `30 / 9 = 3.3333333333333335°` within a sign.

### Boundary Conditions

- Boundary warning if within `1 arcminute` of a Navamsa boundary.
- If Lagna unavailable or unreliable, Navamsa Lagna and Navamsa houses inherit that reliability.

### Failure / Warning Conditions

- Warn if Navamsa map has not been validated against authoritative reference.
- Mark Navamsa house unavailable if Navamsa Lagna unavailable.

### Validation Test

Validate all 108 Navamsa segments against an authoritative Jyotish software/reference table. Exact sign index expected unless boundary warning.

## 16. Vimshottari Dasha Calculation

### Purpose

Calculate Vimshottari dasha periods from precise sidereal Moon longitude, including birth dasha lord, birth balance, Mahadasha, Antardasha, Pratyantardasha, and current dasha.

### Required Inputs

- `moon_sidereal_longitude`
- `birth_utc`
- current UTC for current dasha calculation
- `NAKSHATRA_MAP`
- `DASHA_SEQUENCE`
- `DASHA_YEARS`

### Required Reference Source

- Precise sidereal Moon longitude from Swiss Ephemeris.
- Reference Jyotish software for validation.

### Formula / Method

Birth dasha:

```ts
moon_nakshatra_index = Math.floor(moon_sidereal_longitude / (360 / 27));
birth_dasha_lord = NAKSHATRA_MAP[moon_nakshatra_index].lord;

degrees_into_nakshatra =
  moon_sidereal_longitude - moon_nakshatra_index * (360 / 27);

fraction_elapsed =
  degrees_into_nakshatra / (360 / 27);

dasha_total_years = DASHA_YEARS[birth_dasha_lord];

dasha_elapsed_years = fraction_elapsed * dasha_total_years;

dasha_remaining_years = dasha_total_years - dasha_elapsed_years;
```

Mahadasha sequence starts with `birth_dasha_lord`; continue through `DASHA_SEQUENCE` cyclically.

Antardasha duration inside Mahadasha:

```txt
Antardasha duration = Mahadasha years x Antardasha lord years / 120
```

```ts
antardasha_duration_years = mahadasha_years * DASHA_YEARS[antardasha_lord] / 120;
```

Pratyantardasha duration inside Antardasha:

```txt
Pratyantardasha duration = Antardasha duration x Pratyantardasha lord years / 120
```

```ts
pratyantardasha_duration_years = antardasha_duration_years * DASHA_YEARS[pratyantardasha_lord] / 120;
```

Dasha date arithmetic rule:

```txt
Default dasha year basis = sidereal year setting must be explicit.
Production default for this specification: 365.25 civil days per dasha year unless the product selects a validated sidereal-year convention.
```

```ts
const DASHA_YEAR_DAYS = 365.25;
duration_days = duration_years * DASHA_YEAR_DAYS;
period_end_utc = period_start_utc + duration_days;
```

The selected year basis must be stored:

```ts
type DashaYearBasis = "365.25_days" | "sidereal_year_validated";
```

Current dasha:

```ts
current_utc = now();
current_period = deepest period where period.start_utc <= current_utc < period.end_utc;
```

### Output Fields

```ts
type DashaPeriod = {
  level: "mahadasha" | "antardasha" | "pratyantardasha";
  lord: string;
  start_utc: string;
  end_utc: string;
  duration_years: number;
  duration_days: number;
  parent_lords: string[];
};

type VimshottariDashaResult = {
  moon_nakshatra_index: number;
  moon_nakshatra: string;
  birth_dasha_lord: string;
  dasha_total_years: number;
  dasha_elapsed_years: number;
  dasha_remaining_years: number;
  dasha_year_basis: "365.25_days" | "sidereal_year_validated";
  mahadasha_sequence: DashaPeriod[];
  antardasha_sequence: DashaPeriod[];
  pratyantardasha_sequence: DashaPeriod[];
  current_dasha: {
    mahadasha: DashaPeriod | null;
    antardasha: DashaPeriod | null;
    pratyantardasha: DashaPeriod | null;
  };
  boundary_warnings: string[];
};
```

### Precision Requirement

Dasha dates must be ISO 8601. Durations must retain full precision internally.

### Boundary Conditions

- If Moon is exactly on nakshatra boundary, dasha lord is boundary-sensitive and must warn.
- If Moon longitude normalizes to `360°`, use `0°`.

### Failure / Warning Conditions

- Warn and reduce confidence if Moon near nakshatra boundary.
- Reject if Moon sidereal longitude unavailable.
- Warn if dasha year basis differs from reference software.

### Validation Test

Compare birth dasha lord and balance against reference Jyotish software. Dasha lord must match exactly unless Moon boundary warning.

## 17. Panchang Calculation

### Purpose

Calculate daily Panchang values: tithi, nakshatra, yoga, karana, vara, sunrise, sunset, and Moon rashi for a local Panchang day.

### Required Inputs

- local date
- timezone
- latitude
- longitude
- Sun sidereal longitude at required instant
- Moon sidereal longitude at required instant
- local sunrise/sunset

### Required Reference Source

- Swiss Ephemeris for Sun/Moon positions.
- Swiss Ephemeris rise/transit/set or another validated solar rise/set algorithm for sunrise/sunset.
- Reference Panchang for validation.

### Formula / Method

Panchang date convention:

```txt
Default Panchang day is sunrise-to-sunrise at the birth/current location. Vara and daily values should be evaluated at local sunrise unless a different calculation instant is explicitly requested.
```

Tithi:

```txt
Use Section 11 at local sunrise or requested Panchang instant.
```

Nakshatra:

```ts
moon_nakshatra_index = Math.floor(normalize360(moon_sidereal_longitude) / (360 / 27));
moon_nakshatra = NAKSHATRA_MAP[moon_nakshatra_index];
```

Yoga:

```ts
yoga_angle = normalize360(sun_sidereal_longitude + moon_sidereal_longitude);
yoga_index = Math.floor(yoga_angle / (360 / 27));
yoga = YOGA_MAP[yoga_index];
yoga_fraction_elapsed = (yoga_angle % (360 / 27)) / (360 / 27);
```

Karana:

```txt
Karana is based on half-tithi intervals of 6° Moon-Sun elongation.
```

```ts
moon_sun_angle = normalize360(moon_sidereal_longitude - sun_sidereal_longitude);
karana_half_tithi_index = Math.floor(moon_sun_angle / 6); // 0..59
karana = karanaNameByHalfTithiIndex(karana_half_tithi_index);
karana_fraction_elapsed = (moon_sun_angle % 6) / 6;
```

Vara:

```txt
Weekday should follow local Panchang day convention, usually sunrise-to-sunrise.
```

```ts
vara_date = local_time < local_sunrise ? previous_local_date : local_date;
vara_weekday = weekday(vara_date);
```

Sunrise/sunset:

```txt
Use Swiss Ephemeris rise/transit/set or another validated solar rise/set algorithm.
```

Swiss equivalent:

```txt
swe_rise_trans(jd_ut_start, SE_SUN, flags, rsmi, geopos, atpress, attemp)
```

Required rise/set metadata:

```txt
- whether apparent upper limb or center was used
- refraction setting
- pressure and temperature assumptions
- horizon altitude if not default
```

Optional Hindu sunrise convention metadata:

```txt
If the product selects a Hindu sunrise convention, it may use Swiss Ephemeris wrapper support equivalent to SE_BIT_HINDU_RISING when available. This convention must remain explicit, versioned, and validated against the selected Panchang reference. It must not silently replace the default rise/set convention.
```

```ts
type SunriseConvention =
  | "swiss_default_apparent_upper_limb_with_refraction"
  | "hindu_disc_center_no_refraction"
  | "custom_validated";

type SunriseMetadata = {
  convention: SunriseConvention;
  uses_disc_center: boolean;
  uses_refraction: boolean;
  uses_geocentric_ecliptic_latitude_adjustment?: boolean;
  pressure_mbar?: number;
  temperature_celsius?: number;
  horizon_altitude_degrees?: number;
  validation_reference: string;
};
```


Moon rashi:

```ts
moon_rashi = calculateSign(moon_sidereal_longitude);
```

Daily panchang-style values required:

```txt
tithi
nakshatra
rashi
```

### Output Fields

```ts
type PanchangResult = {
  panchang_local_date: string;
  calculation_instant_utc: string;
  sunrise_utc: string | null;
  sunset_utc: string | null;
  sunrise_local: string | null;
  sunset_local: string | null;
  tithi: TithiResult | null;
  nakshatra: NakshatraPlacement | null;
  yoga: {
    yoga_index: number;
    yoga_name: string;
    yoga_fraction_elapsed: number;
    near_yoga_boundary: boolean;
  } | null;
  karana: {
    karana_half_tithi_index: number;
    karana_name: string;
    karana_fraction_elapsed: number;
    near_karana_boundary: boolean;
  } | null;
  vara: string | null;
  moon_rashi: SignPlacement | null;
  warnings: string[];
};
```

### Precision Requirement

Sunrise/sunset must be accurate to the selected rise/set algorithm tolerance and validated against Swiss Ephemeris or a trusted almanac.

### Boundary Conditions

- Near tithi/yoga/karana/nakshatra boundaries, daily values may change within minutes; emit warning.
- At polar or high-latitude locations, sunrise/sunset may be unavailable.

### Failure / Warning Conditions

- If sunrise unavailable, mark Panchang local-day convention degraded and deduct confidence.
- Do not call weekday-only output Panchang.
- Warn if Panchang convention differs from validation reference.

### Validation Test

Compare tithi, nakshatra, yoga, karana, vara, sunrise, sunset, and Moon rashi against a reference Panchang for India/no-DST, high-latitude, and historical timezone cases.

## 18. Daily Transit Calculation

### Purpose

Calculate current planetary transits and relationships to natal chart context.

### Required Inputs

- current UTC
- current location/timezone for Panchang-style values if requested
- natal planet positions
- natal Moon sign
- natal Lagna and houses if reliable
- `jd_ut` for current UTC

### Required Reference Source

Swiss Ephemeris for current planetary positions and speeds.

### Formula / Method

Current UTC:

```ts
current_utc = new Date().toISOString();
current_jd_ut = calculateJulianDay(current_utc);
```

Current planetary positions:

```txt
Use Section 8 for current UTC for all required grahas.
```

Current Moon rashi:

```ts
current_moon_rashi = calculateSign(current_moon_sidereal_longitude);
```

Current Moon nakshatra:

```ts
current_moon_nakshatra = calculateNakshatra(current_moon_sidereal_longitude);
```

Current tithi:

```ts
current_tithi = calculateTithi(current_moon_sidereal_longitude, current_sun_sidereal_longitude);
```

Transit-to-natal sign relationship:

```ts
transit_relative_to_natal_moon_sign = ((transit_planet_sign_index - natal_moon_sign_index + 12) % 12) + 1;
```

Transit-to-natal house relationship, only if Lagna reliable:

```ts
transit_house_from_lagna = ((transit_planet_sign_index - natal_lagna_sign_index + 12) % 12) + 1;
```

Relate transit planets to natal rashi chart:

```ts
for each transit planet:
  record transit sign, transit house from natal Lagna if available, and house from natal Moon sign.
```

### Output Fields

```ts
type DailyTransitResult = {
  current_utc: string;
  transit_planets: PlanetPosition[];
  current_moon_rashi: SignPlacement;
  current_moon_nakshatra: NakshatraPlacement;
  current_tithi: TithiResult;
  transit_relation_to_natal: Array<{
    planet: string;
    transit_sign_index: number;
    house_from_natal_moon: number;
    house_from_natal_lagna: number | null;
    lagna_relation_reliability: "high" | "medium" | "low" | "not_available";
  }>;
  warnings: string[];
};
```

### Precision Requirement

Current planetary longitudes follow Section 8 tolerances.

### Boundary Conditions

- Transit Moon can cross signs/nakshatras quickly; boundary warnings are required.
- Transit-to-Lagna relationships must be unavailable if natal Lagna is unavailable.

### Failure / Warning Conditions

- Mark Daily Transit unavailable if Swiss Ephemeris unavailable.
- Mark Lagna-based transit relations unavailable if Lagna unreliable or absent.

### Validation Test

Validate current transit longitudes against Swiss Ephemeris and derived Moon rashi/nakshatra/tithi against formulas in Sections 9-11.

## 19. Jyotish Aspect / Drishti Calculation

### Purpose

Calculate house-based graha drishti aspects from D1 house placements.

### Required Inputs

- `planet_to_house`
- aspect setting for Rahu/Ketu
- `lagna.reliability`

### Required Reference Source

Rule-based Jyotish graha drishti table in Section 3. Rahu/Ketu aspects are tradition-dependent and must be controlled by a setting.

### Formula / Method

House-based graha drishti formula:

```ts
target_house = ((source_house - 1 + aspect_offset - 1 + 12) % 12) + 1;
```

Required aspects:

| Graha | Aspect offsets |
|---|---|
| All planets | 7 |
| Mars | 4, 8 |
| Jupiter | 5, 9 |
| Saturn | 3, 10 |
| Rahu | 5, 9 |
| Ketu | 5, 9 |

Offsets per planet:

```ts
function aspectOffsets(planet: string, includeNodeSpecialAspects: boolean): number[] {
  const offsets = [7];
  if (planet === "Mars") offsets.push(4, 8);
  if (planet === "Jupiter") offsets.push(5, 9);
  if (planet === "Saturn") offsets.push(3, 10);
  if (includeNodeSpecialAspects && (planet === "Rahu" || planet === "Ketu")) offsets.push(5, 9);
  return offsets;
}
```

### Output Fields

```ts
type GrahaDrishti = {
  source_planet: string;
  source_house: number;
  aspect_offset: number;
  target_house: number;
  target_sign_index: number | null;
  tradition: "classical_default" | "nodes_5_9_enabled";
  reliability: "high" | "medium" | "low" | "not_available";
};
```

### Precision Requirement

House-based aspects are integer exact when house placements are reliable.

### Boundary Conditions

- If source planet house unavailable, its aspects are unavailable.
- If Lagna unavailable, all house-based aspects are unavailable.

### Failure / Warning Conditions

- Warn if Rahu/Ketu special aspects are enabled; store tradition setting.
- Warn if Lagna boundary warning affects house placement.

### Validation Test

For every source house 1-12 and every required offset, assert output target house matches formula.

## 20. Yoga Calculation Rules

### Purpose

Define calculation-only requirements for yogas. No yoga may be output unless a rule object is defined and evidence is produced.

### Required Inputs

- D1 placements
- D9 placements if yoga requires D9
- house lords
- aspects
- strength indicators if yoga requires strength
- tradition settings

### Required Reference Source

Authoritative Jyotish rule source per yoga. Blogs are not primary references. If a rule cannot be verified, mark yoga unavailable or low-confidence and require validation.

### Formula / Method

Every yoga rule must define:

- yoga name
- exact rule
- required planets
- required houses/signs
- required chart
- cancellation conditions, if any
- confidence
- evidence fields

Required schema:

```ts
type YogaCalculationRule = {
  yoga_id: string;
  yoga_name: string;
  rule_formula: string;
  required_inputs: string[];
  cancellation_rules?: string[];
  output_evidence: Record<string, unknown>;
};
```

Evaluation:

```ts
for each yoga_rule:
  if any required_input unavailable:
    output status = "unavailable"
  else if rule_formula evaluates true and no cancellation rule evaluates true:
    output present = true
  else:
    output present = false
```

No vague yoga output is permitted. Phrases like `forms a yoga` are invalid unless backed by exact rule formula and evidence.

### Output Fields

```ts
type YogaResult = {
  yoga_id: string;
  yoga_name: string;
  present: boolean;
  status: "calculated" | "unavailable" | "unsupported";
  confidence: "high" | "medium" | "low";
  rule_formula: string;
  evidence: Record<string, unknown>;
  cancellation_evidence?: Record<string, unknown>;
  warnings: string[];
};
```

### Precision Requirement

Yoga inputs use exact integer sign/house indexes and full-precision longitudes where required.

### Boundary Conditions

If a yoga depends on a planet, Lagna, house, or division boundary within `1 arcminute`, mark confidence no higher than `medium`.

### Failure / Warning Conditions

- Unavailable Yoga warning if required calculation is missing.
- Unsupported Yoga warning if no audited rule exists.
- Low confidence if authoritative rule source is uncertain.

### Validation Test

Each supported yoga must have at least:

- one positive fixture;
- one negative fixture;
- one cancellation fixture if cancellation exists;
- one boundary fixture if sign/house dependence exists.

## 21. Dosha Calculation Rules

### Purpose

Define calculation-only requirements for doshas. No dosha may be output without exact rule, severity rule, cancellation rule, confidence, and evidence.

### Required Inputs

- D1 placements
- house placements
- planet signs
- aspects
- D9 if rule requires it
- tradition settings

### Required Reference Source

Authoritative Jyotish rule source per dosha. Blogs are not primary references. If a rule cannot be verified, mark dosha unavailable or low-confidence and require validation.

### Formula / Method

Each dosha rule must define:

- dosha name
- exact rule
- houses/signs/planets used
- severity rule
- cancellation rule
- confidence
- evidence

Generic evaluation:

```ts
for each dosha_rule:
  required_values = collect(rule.required_inputs)
  if any required value unavailable:
    status = "unavailable"
  else:
    raw_present = evaluate(rule.exact_rule)
    cancellation_present = evaluate(rule.cancellation_rule)
    present = raw_present && !cancellation_present
    severity = present ? evaluate(rule.severity_rule) : "none"
```

### Output Fields

```ts
type DoshaRule = {
  dosha_id: string;
  dosha_name: string;
  exact_rule: string;
  required_inputs: string[];
  severity_rule: string;
  cancellation_rules: string[];
};

type DoshaResult = {
  dosha_id: string;
  dosha_name: string;
  present: boolean;
  severity: "none" | "low" | "medium" | "high";
  status: "calculated" | "unavailable" | "unsupported";
  confidence: "high" | "medium" | "low";
  evidence: Record<string, unknown>;
  cancellation_evidence: Record<string, unknown>;
  warnings: string[];
};
```

### Precision Requirement

Use exact house/sign indexes; do not use rounded longitudes for rules.

### Boundary Conditions

Boundary-sensitive doshas cannot receive `high` confidence when dependent planet or Lagna is within `1 arcminute` of a boundary.

### Failure / Warning Conditions

- Unavailable Dosha warning if required inputs are missing.
- Unsupported Dosha warning if no audited rule exists.
- No dosha may be output without evidence.

### Validation Test

Each supported dosha must have positive, negative, cancellation, severity, and boundary fixtures.

## 22. Strength / Weakness Calculation Rules

### Purpose

Calculate rule-based planetary strength and weakness indicators only.

### Required Inputs

- planet sign and degrees
- D1 house placement
- D9 placement
- aspects
- combustion angular distance
- retrograde status
- dignity tables
- tradition settings

### Required Reference Source

Authoritative Jyotish dignity and combustion tables must be versioned. Any uncertain dignity value must be marked uncertain and require validation.

### Formula / Method

Required indicators:

- Own sign
- Exaltation
- Debilitation
- Moolatrikona
- Friendly sign
- Enemy sign
- Combustion
- Retrogression
- Vargottama
- House placement
- Aspect support/affliction

Output schema:

```ts
type StrengthIndicator = {
  planet: string;
  indicator: string;
  category: "strength" | "weakness" | "mixed";
  rule: string;
  evidence: Record<string, unknown>;
  confidence: "high" | "medium" | "low";
};
```

Generic indicator rule:

```ts
indicator_present = evaluate(indicator.rule, evidence_inputs);
if indicator_present:
  output StrengthIndicator with evidence;
```

Combustion:

```ts
angular_distance_from_sun = Math.min(
  normalize360(planet_sidereal_longitude - sun_sidereal_longitude),
  normalize360(sun_sidereal_longitude - planet_sidereal_longitude)
);
combustion_present = angular_distance_from_sun <= combustion_threshold_by_planet[planet];
```

Combustion thresholds are tradition-dependent and must be supplied by an audited table. Do not invent thresholds.

Vargottama:

```ts
vargottama = d1_sign_index === d9_sign_index;
```

Retrogression:

```ts
retrogression_indicator = planet.is_retrograde === true;
```

Own sign:

```ts
own_sign = SIGN_LORD_BY_SIGN_INDEX[planet.sign_index] === planet.name;
```

Exaltation, debilitation, moolatrikona, friend, and enemy rules require audited static tables with source and version metadata.

#### Unaudited Candidate Rule Tables from File B

The following tables are imported only as unaudited candidate seed data. They must not be used for production output until each entry is verified against an authoritative Jyotish source, assigned a source/version identifier, covered by positive and negative fixtures, and promoted into an audited table.

Candidate deep exaltation points:

| Planet | Candidate exaltation sign | Candidate deep exaltation degree |
|---|---|---:|
| Sun | Aries | 10° |
| Moon | Taurus | 3° |
| Mars | Capricorn | 28° |
| Mercury | Virgo | 15° |
| Jupiter | Cancer | 5° |
| Venus | Pisces | 27° |
| Saturn | Libra | 20° |

Candidate moolatrikona ranges:

| Planet | Candidate sign | Candidate range |
|---|---|---|
| Sun | Leo | 0°-20° |
| Moon | Taurus | 4°-30° |
| Mars | Aries | 0°-12° |
| Mercury | Virgo | 15°-20° |
| Jupiter | Sagittarius | 0°-10° |
| Venus | Libra | 0°-15° |
| Saturn | Aquarius | 0°-20° |

Candidate combustion thresholds:

| Planet | Candidate maximum angular distance from Sun |
|---|---:|
| Moon | 12° |
| Mars | 17° |
| Mercury | 14° |
| Jupiter | 11° |
| Venus | 10° |
| Saturn | 15° |

```ts
type UnauditedCandidateRuleTable<T> = {
  status: "unaudited_candidate_only";
  prohibited_for_production: true;
  source_note: "imported_from_file_b_for_future_audit";
  entries: T[];
};
```


### Output Fields

```ts
type StrengthWeaknessResult = {
  indicators: StrengthIndicator[];
  dignity_table_version: string;
  combustion_table_version: string;
  warnings: string[];
};
```

### Precision Requirement

Use exact longitudes for combustion and exact sign indexes for dignity. Do not use display-rounded degrees.

### Boundary Conditions

- If a planet is near sign boundary, dignity indicators must be boundary-warned.
- If a planet is near combustion threshold, combustion must be threshold-warned.

### Failure / Warning Conditions

- Unsupported strength rule warning if required authoritative table is missing.
- Low confidence if a rule's authoritative basis is uncertain.

### Validation Test

Each indicator must have positive and negative fixtures. Combustion fixtures must include near-threshold cases.

## 23. Life-Area Signature Calculation

### Purpose

Calculate life-area signatures from house signs, house lords, lord placements, occupying planets, aspects, and strength notes.

### Required Inputs

- whole-sign houses
- D1 planet-to-house placements
- D1 planet-to-sign placements
- sign lord map
- aspects
- strength indicators
- Lagna reliability

### Required Reference Source

Derived rule-based Jyotish house/lord arithmetic using constants in Section 3.

### Formula / Method

Life-area houses:

| Life area | House |
|---|---:|
| self | 1 |
| wealth | 2 |
| siblings | 3 |
| home_mother | 4 |
| children_intellect | 5 |
| enemies_health | 6 |
| partner_marriage | 7 |
| longevity_transformation | 8 |
| dharma_fortune | 9 |
| career_status | 10 |
| gains_network | 11 |
| losses_liberation | 12 |

For each life area:

```ts
house_number = LIFE_AREA_HOUSE[life_area];
house_sign_index = houses[house_number].sign_index;
house_sign = RASHI_MAP[house_sign_index];
house_lord = SIGN_LORD_BY_SIGN_INDEX[house_sign_index];
lord_placement_house = planet_to_house[house_lord];
lord_placement_sign = planet_to_sign[house_lord];
occupying_planets = planets.filter(p => p.house_number === house_number);
aspects_to_house = aspects.filter(a => a.target_house === house_number);
strength_note = strength_indicators.filter(i => i.planet === house_lord || occupying_planets.includes(i.planet));
```

Reliability:

```ts
reliability = lagna.reliability;
if lagna.reliability === "not_available": all life-area signatures unavailable;
```

### Output Fields

```ts
type LifeAreaSignature = {
  life_area: string;
  house_number: number;
  house_sign: string | null;
  house_sign_index: number | null;
  house_lord: string | null;
  lord_placement_house: number | null;
  lord_placement_sign: string | null;
  lord_placement_sign_index: number | null;
  occupying_planets: string[];
  aspects_to_house: GrahaDrishti[];
  strength_note: StrengthIndicator[];
  reliability: "high" | "medium" | "low" | "not_available";
  warnings: string[];
};
```

### Precision Requirement

Life-area signatures use exact integer house/sign indexes and evidence arrays.

### Boundary Conditions

- If Lagna sign is boundary-sensitive, all life areas inherit the warning.
- If house lord is near sign boundary, lord placement warning applies.

### Failure / Warning Conditions

- Life-area unavailable if Lagna unavailable.
- Warn if optional co-lord tradition settings are enabled.

### Validation Test

For all 12 Lagna signs, assert each life area maps to correct house, sign, lord, lord placement, occupants, and aspects from fixture charts.

## 24. Prediction-Ready Context Calculation

### Purpose

Construct calculation-only prediction context from derived fields while excluding raw sensitive birth inputs.

### Required Inputs

- planet positions
- Lagna result
- houses
- D1 chart
- D9 chart
- dasha result
- panchang result
- daily transit result
- aspects
- yogas
- doshas
- strength/weakness indicators
- life-area signatures
- warnings
- confidence

### Required Reference Source

Derived output from this specification only.

### Formula / Method

Include only:

- derived placements
- derived dasha
- derived panchang
- derived daily transits
- warnings
- confidence
- unsupported fields
- reliability flags

Exclude:

- raw birth date
- raw birth time
- raw latitude
- raw longitude
- encrypted birth data
- data consent version
- internal IDs

Construction rule:

```ts
prediction_context = {
  calculation_metadata,
  core_natal_summary,
  planet_positions: redactedDerivedPlanetPositions,
  lagna: derivedLagnaWithoutRawBirthInputs,
  houses,
  d1_chart,
  d9_chart,
  dasha,
  panchang,
  daily_transits,
  aspects,
  yogas,
  doshas,
  strength_weakness,
  life_area_signatures,
  warnings,
  confidence,
  unsupported_fields
};
```

Raw birth input exclusion test:

```ts
forbidden_keys = [
  "birth_date",
  "birth_time",
  "latitude",
  "longitude",
  "encrypted_birth_data",
  "data_consent_version",
  "profile_id",
  "user_id"
];
```

### Output Fields

```ts
type PredictionReadyContext = {
  calculation_metadata: ExternalEngineMetadata & ConstantSetVersion;
  core_natal_summary: CoreNatalSummary;
  planet_positions: PlanetPosition[];
  lagna: LagnaResult | null;
  houses: WholeSignHouse[];
  d1_chart: D1Chart;
  d9_chart: NavamsaChart;
  dasha: VimshottariDashaResult | null;
  panchang: PanchangResult | null;
  daily_transits: DailyTransitResult | null;
  aspects: GrahaDrishti[];
  yogas: YogaResult[];
  doshas: DoshaResult[];
  strength_weakness: StrengthWeaknessResult;
  life_area_signatures: LifeAreaSignature[];
  confidence: ConfidenceResult;
  warnings: WarningResult[];
  unsupported_fields: string[];
};
```

### Precision Requirement

Prediction context may include display-rounded fields only if unrounded machine fields are also retained for internal traceability. Downstream calculations must not consume display-rounded values.

### Boundary Conditions

If source field is unavailable, context must include `null`, `[]`, or explicit unavailable status; do not fabricate.

### Failure / Warning Conditions

- Reject context if forbidden raw keys are present.
- Warn if any required output category is unsupported.

### Validation Test

Run structural tests that recursively scan prediction context for forbidden raw birth input keys.

## 25. Confidence Score Calculation

### Purpose

Calculate numeric and labeled confidence based on input precision, timezone status, astronomical boundary sensitivity, and unavailable dependencies.

### Required Inputs

- `birth_time_precision`
- `birth_time_known`
- timezone status
- boundary warnings
- high latitude flag
- Panchang availability
- Swiss Ephemeris availability

### Required Reference Source

Rule table in this section.

### Formula / Method

Start:

```txt
confidence = 100
```

Subtract:

| Condition | Deduction |
|---|---:|
| birth time precision minute | 5 |
| birth time precision hour | 20 |
| birth time precision day_part | 40 |
| birth time unknown | 60 |
| timezone ambiguous | 50 |
| timezone nonexistent | reject |
| timezone invalid | reject |
| Moon near nakshatra boundary | 25 |
| Lagna near sign boundary | 20 |
| any planet near sign boundary | 10 |
| high latitude ascendant instability | 15 |
| panchang sunrise unavailable | 20 |
| Swiss Ephemeris unavailable | reject |

Formula:

```ts
let confidence = 100;

if (birth_time_precision === "minute") confidence -= 5;
if (birth_time_precision === "hour") confidence -= 20;
if (birth_time_precision === "day_part") confidence -= 40;
if (!birth_time_known || birth_time_precision === "unknown") confidence -= 60;
if (timezone_status === "ambiguous") confidence -= 50;
if (moon_near_nakshatra_boundary) confidence -= 25;
if (lagna_near_sign_boundary) confidence -= 20;
if (any_planet_near_sign_boundary) confidence -= 10;
if (high_latitude_ascendant_instability) confidence -= 15;
if (panchang_sunrise_unavailable) confidence -= 20;

confidence = Math.max(0, Math.min(100, confidence));
```

Reject conditions:

```ts
if (timezone_status === "nonexistent") rejectCalculation();
if (timezone_status === "invalid") rejectCalculation();
if (!swiss_ephemeris_available) rejectCalculation();
```

Labels:

| Score | Label |
|---:|---|
| 85-100 | high |
| 60-84 | medium |
| 0-59 | low |

```ts
label = confidence >= 85 ? "high" : confidence >= 60 ? "medium" : "low";
```

### Output Fields

```ts
type ConfidenceResult = {
  score: number;
  label: "high" | "medium" | "low";
  deductions: Array<{
    condition: string;
    deduction: number;
    evidence: Record<string, unknown>;
  }>;
  rejected: boolean;
  rejection_reason?: string;
};
```

### Precision Requirement

Confidence score is integer after deductions unless future weighted rules introduce decimals. Clamp to `[0, 100]`.

### Boundary Conditions

Multiple planet boundary warnings count as one `any planet near sign boundary` deduction unless explicitly versioned otherwise.

### Failure / Warning Conditions

Reject conditions override score labels.

### Validation Test

Unit tests for every deduction condition and combinations that clamp below zero.

## 26. Warning Rules

### Purpose

Define warning codes and emission rules.

### Required Inputs

- input validation results
- timezone conversion results
- planetary boundary checks
- Lagna boundary checks
- Panchang availability
- transit availability
- yoga/dosha support status
- engine availability

### Required Reference Source

Rule table in this section.

### Formula / Method

Warnings required:

- unknown birth time
- approximate birth time
- invalid timezone
- ambiguous timezone
- nonexistent local time
- near sign boundary
- near nakshatra boundary
- near pada boundary
- Moon near nakshatra boundary
- Lagna near sign boundary
- high latitude
- unavailable Panchang
- unavailable Daily Transit
- unavailable Yoga
- unavailable Dosha
- unsupported calculation mode
- unavailable Swiss Ephemeris

Warning schema:

```ts
type WarningResult = {
  code: string;
  severity: "info" | "warning" | "error";
  field: string;
  calculation_section: string;
  evidence: Record<string, unknown>;
};
```

Emission rules:

```ts
if (!birth_time_known || birth_time_precision === "unknown") emit("UNKNOWN_BIRTH_TIME");
if (["minute", "hour", "day_part"].includes(birth_time_precision)) emit("APPROXIMATE_BIRTH_TIME");
if (timezone_status === "invalid") emit("INVALID_TIMEZONE");
if (timezone_status === "ambiguous") emit("AMBIGUOUS_TIMEZONE");
if (timezone_status === "nonexistent") emit("NONEXISTENT_LOCAL_TIME");
if (planet.near_sign_boundary) emit("NEAR_SIGN_BOUNDARY");
if (placement.near_nakshatra_boundary) emit("NEAR_NAKSHATRA_BOUNDARY");
if (placement.near_pada_boundary) emit("NEAR_PADA_BOUNDARY");
if (moon.near_nakshatra_boundary) emit("MOON_NEAR_NAKSHATRA_BOUNDARY");
if (lagna.near_sign_boundary) emit("LAGNA_NEAR_SIGN_BOUNDARY");
if (Math.abs(latitude) >= 66.0) emit("HIGH_LATITUDE_ASCENDANT_INSTABILITY");
if (!panchang) emit("UNAVAILABLE_PANCHANG");
if (!daily_transits) emit("UNAVAILABLE_DAILY_TRANSIT");
if (yoga.status !== "calculated") emit("UNAVAILABLE_YOGA");
if (dosha.status !== "calculated") emit("UNAVAILABLE_DOSHA");
if (unsupported_mode) emit("UNSUPPORTED_CALCULATION_MODE");
if (!swiss_ephemeris_available) emit("UNAVAILABLE_SWISS_EPHEMERIS");
```

Warning de-duplication rule:

```ts
function warningKey(w: WarningResult): string {
  return `${w.code}:${w.field}:${w.calculation_section}`;
}

function deduplicateWarnings(warnings: WarningResult[]): WarningResult[] {
  return Array.from(
    new Map(warnings.map(w => [warningKey(w), w])).values()
  );
}
```

Warning de-duplication must preserve structured evidence. If duplicate warnings have different evidence payloads, the implementation must either merge evidence deterministically or keep the higher-severity warning under a versioned policy.


### Output Fields

```ts
type WarningCode =
  | "UNKNOWN_BIRTH_TIME"
  | "APPROXIMATE_BIRTH_TIME"
  | "INVALID_TIMEZONE"
  | "AMBIGUOUS_TIMEZONE"
  | "NONEXISTENT_LOCAL_TIME"
  | "NEAR_SIGN_BOUNDARY"
  | "NEAR_NAKSHATRA_BOUNDARY"
  | "NEAR_PADA_BOUNDARY"
  | "MOON_NEAR_NAKSHATRA_BOUNDARY"
  | "LAGNA_NEAR_SIGN_BOUNDARY"
  | "HIGH_LATITUDE_ASCENDANT_INSTABILITY"
  | "UNAVAILABLE_PANCHANG"
  | "UNAVAILABLE_DAILY_TRANSIT"
  | "UNAVAILABLE_YOGA"
  | "UNAVAILABLE_DOSHA"
  | "UNSUPPORTED_CALCULATION_MODE"
  | "UNAVAILABLE_SWISS_EPHEMERIS";
```

### Precision Requirement

Warnings must include the unrounded evidence value that triggered the warning.

### Boundary Conditions

Warnings must be deterministic for exact boundary values.

### Failure / Warning Conditions

Error-severity warnings that imply rejection:

- invalid timezone
- nonexistent local time under default policy
- unavailable Swiss Ephemeris
- unsupported production ephemeris mode

### Validation Test

Each warning code must have at least one unit test that triggers it and one fixture that does not trigger it.

## 27. Boundary and Rounding Rules

### Purpose

Define numeric precision, internal storage, display rounding, and boundary behavior.

### Required Inputs

- all calculated longitudes
- all derived angular fractions
- all display fields

### Required Reference Source

Numerical rules in this section.

### Formula / Method

Internal precision:

```txt
Use full double precision internally.
Never use rounded display values for downstream calculations.
```

Display rounding:

| Value | Display |
|---|---:|
| longitude | 0.0001° |
| ayanamsa | 0.000001° |
| Julian Day | 6 decimals minimum |
| tithi fraction | 4 decimals |
| dasha dates | ISO 8601 |

Boundary threshold:

```txt
1 arcminute = 1 / 60 degree
```

Generic boundary function:

```ts
function nearModuloBoundary(value: number, span: number): boolean {
  const x = normalize360(value) % span;
  const distance = Math.min(x, span - x);
  return distance <= (1 / 60);
}
```

For non-360 spans such as degrees inside sign:

```ts
function nearLinearBoundary(valueWithinSpan: number, span: number): boolean {
  const distance = Math.min(valueWithinSpan, span - valueWithinSpan);
  return distance <= (1 / 60);
}
```

### Output Fields

```ts
type RoundingPolicy = {
  internal_precision: "double";
  display_longitude_decimals: 4;
  display_ayanamsa_decimals: 6;
  display_julian_day_min_decimals: 6;
  display_tithi_fraction_decimals: 4;
  dasha_date_format: "ISO_8601";
  boundary_threshold_degrees: number;
};
```

### Precision Requirement

Rounding only occurs at serialization/display boundary. Calculation payloads should keep raw numeric fields.

### Boundary Conditions

- Exact boundary values trigger boundary warnings.
- Values within `1 arcminute` on either side of boundary trigger warnings.
- Normalize negative longitudes before boundary evaluation.

### Failure / Warning Conditions

Warn if any downstream calculation consumes a rounded display value.

### Validation Test

Test boundary detection at:

- exact boundary;
- `boundary - 1/60°`;
- `boundary + 1/60°`;
- outside threshold by floating epsilon.

## 28. Required Validation Tests and Tolerances

### Purpose

Define mandatory validation tests, reference sources, and numerical tolerances.

### Required Inputs

- full calculation engine outputs
- Swiss Ephemeris reference outputs
- reference Panchang outputs
- reference Jyotish dasha outputs

### Required Reference Source

- Swiss Ephemeris for astronomical positions, ayanamsa, and Lagna.
- Reference Panchang for tithi and Panchang values.
- Reference Jyotish software for dasha lord and balance.
- JPL DE ephemerides / JPL Horizons may be used for higher-precision validation.

### Formula / Method

Startup validation must run before production calculation requests are accepted. A failed startup validation blocks the service from returning calculated astronomical output.

Startup validation must verify:

- Swiss Ephemeris library or audited wrapper load status.
- Ephemeris path/file readability.
- Swiss Ephemeris version and ephemeris file hash/version capture where available.
- Lahiri sidereal mode initialization.
- Fixed-reference calls for `swe_calc_ut`, `swe_get_ayanamsa_ut`, `swe_houses_ex`, and `swe_rise_trans` or validated rise/set equivalent.
- IANA timezone engine availability and timezone database version capture when available.
- Ephemeris range metadata availability and enforcement.
- Final JSON Schema or OpenAPI schema validation for the output contract.

```ts
type OpenApiSchemaValidationResult = {
  schema_name: string;
  schema_version: string;
  passed: boolean;
  errors: Array<{
    path: string;
    message: string;
  }>;
};
```

Validation tolerance table:

| Calculation | Reference | Tolerance |
|---|---|---:|
| Sun longitude | Swiss Ephemeris | <= 0.01° |
| Moon longitude | Swiss Ephemeris | <= 0.01° |
| Mercury longitude | Swiss Ephemeris | <= 0.01° |
| Venus longitude | Swiss Ephemeris | <= 0.01° |
| Mars longitude | Swiss Ephemeris | <= 0.01° |
| Jupiter longitude | Swiss Ephemeris | <= 0.01° |
| Saturn longitude | Swiss Ephemeris | <= 0.01° |
| Rahu/Ketu | Swiss Ephemeris | <= 0.01° |
| Lahiri ayanamsa | Swiss Ephemeris | <= 0.001° |
| Lagna | Swiss Ephemeris | <= 0.05° |
| Sign index | Derived | exact unless boundary warning |
| Nakshatra index | Derived | exact unless boundary warning |
| Pada | Derived | exact unless boundary warning |
| Tithi | Reference Panchang | exact unless boundary warning |
| Dasha lord | Reference Jyotish software | exact unless Moon boundary warning |

Mandatory test cases:

| Test case | Required assertion |
|---|---|
| India birth, no DST | timezone, UTC, JD, planets, Lagna, Panchang |
| US birth during DST | timezone offset, UTC, planets, Lagna |
| US ambiguous DST fall-back | ambiguity detected or explicit earlier/later policy |
| US nonexistent DST spring-forward | rejection by default |
| Europe historical timezone | IANA historical offset applied |
| unknown birth time | no authoritative Lagna, reduced confidence |
| exact sign boundary | sign boundary warning |
| exact nakshatra boundary | nakshatra and dasha boundary warning |
| high latitude | ascendant instability warning |
| southern hemisphere | valid Lagna and rise/set validation |
| leap day | valid Gregorian JD |
| old historical birth date | proleptic Gregorian handling and timezone caveat |
| latitude 0 | valid equatorial calculations |
| longitude 0 | valid Greenwich calculations |

Validation difference formula:

```ts
angular_difference = Math.abs(normalize360(calculated - reference));
angular_difference = Math.min(angular_difference, 360 - angular_difference);
passes = angular_difference <= tolerance;
```

### Output Fields

```ts
type ValidationResult = {
  test_case_id: string;
  calculation: string;
  calculated_value: number | string | null;
  reference_value: number | string | null;
  tolerance: number | "exact_unless_boundary";
  difference?: number;
  passed: boolean;
  boundary_warning_present: boolean;
  reference_source: string;
};
```

### Precision Requirement

Validation must compare unrounded values.

### Boundary Conditions

Derived index mismatches may pass only when the relevant boundary warning is present and the angular value is within threshold.

### Failure / Warning Conditions

- Any core astronomical tolerance failure blocks production release.
- Missing validation reference blocks production release for that calculation category.
- Panchang and dasha differences must be investigated for convention mismatch before acceptance.

### Validation Test

The validation suite itself must be deterministic, versioned, and store:

- Swiss Ephemeris version;
- ephemeris file version/path hash where available;
- timezone database version;
- ayanamsa mode;
- node type;
- dasha year basis;
- Panchang convention.

## 29. Final Calculation Output Schema

### Purpose

Define the complete final calculation output schema required for backend implementation.

### Required Inputs

All outputs from Sections 5 through 28.

### Required Reference Source

This master calculation specification and the external engines defined in Section 4.

### Formula / Method

Final output must be assembled only from validated calculation modules. Every field must be traceable to a formula, reference method, explicit rule, warning rule, or unavailable status in this file.

Core natal summary construction:

```ts
type CoreNatalSummary = {
  ascendant: LagnaResult | null;
  sun_sign: SignPlacement;
  moon_sign: SignPlacement;
  moon_nakshatra: NakshatraPlacement;
  birth_tithi: TithiResult;
  dasha_at_birth: {
    lord: string;
    elapsed_years: number;
    remaining_years: number;
  } | null;
  confidence: ConfidenceResult;
  warnings: WarningResult[];
};
```

Final schema:

```ts
type MasterAstroCalculationOutput = {
  schema_version: string;
  calculation_status: "calculated" | "partial" | "rejected";
  rejection_reason?: string;

  input_use: InputCalculationUse;
  birth_time_result: BirthTimeResult;
  julian_day: JulianDayResult;
  ayanamsa: AyanamsaResult;
  external_engine_metadata: ExternalEngineMetadata;
  constants_version: ConstantSetVersion;

  planetary_positions: {
    Sun: PlanetPosition;
    Moon: PlanetPosition;
    Mercury: PlanetPosition;
    Venus: PlanetPosition;
    Mars: PlanetPosition;
    Jupiter: PlanetPosition;
    Saturn: PlanetPosition;
    Rahu: PlanetPosition;
    Ketu: PlanetPosition;
  };

  sun_position: PlanetPosition;
  moon_position: PlanetPosition;
  mercury_position: PlanetPosition;
  venus_position: PlanetPosition;
  mars_position: PlanetPosition;
  jupiter_position: PlanetPosition;
  saturn_position: PlanetPosition;
  rahu_position: PlanetPosition;
  ketu_position: PlanetPosition;

  sun_sign: SignPlacement;
  moon_sign: SignPlacement;
  nakshatra: NakshatraPlacement;
  pada: number;
  tithi: TithiResult;

  lagna: LagnaResult | null;
  whole_sign_houses: WholeSignHouse[];
  d1_rashi_chart: D1Chart;
  navamsa_d9: NavamsaChart;
  vimshottari_dasha: VimshottariDashaResult | null;

  planetary_aspects_drishti: GrahaDrishti[];
  yogas: YogaResult[];
  doshas: DoshaResult[];
  strength_weakness_indicators: StrengthWeaknessResult;
  life_area_signatures: LifeAreaSignature[];

  prediction_ready_context: PredictionReadyContext;
  core_natal_summary: CoreNatalSummary;

  panchang: PanchangResult | null;
  daily_transits: DailyTransitResult | null;

  confidence: ConfidenceResult;
  warnings: WarningResult[];
  validation_results: ValidationResult[];

  engine_boot_diagnostics?: EngineBootDiagnostics;
  ephemeris_range_metadata?: EphemerisRangeMetadata;
  startup_validation_result?: StartupValidationResult;
  openapi_schema_validation?: OpenApiSchemaValidationResult;
};
```

Required detailed field traceability:

| Required output | Source section |
|---|---:|
| Ascendant / Lagna | 12 |
| Sun sign / Surya rashi | 8, 9 |
| Moon sign / Chandra rashi | 8, 9 |
| Nakshatra | 10 |
| Pada | 10 |
| Tithi | 11 |
| Planetary positions | 8 |
| House placements | 13, 14 |
| Rashi chart | 14 |
| Navamsa chart | 15 |
| Dasha periods | 16 |
| Yogas | 20 |
| Doshas | 21 |
| Strength/weakness indicators | 22 |
| Prediction-ready summary/context | 24 |
| Daily panchang-style tithi, nakshatra, rashi | 17 |
| Julian Day | 6 |
| Lahiri ayanamsa value | 7 |
| Birth UTC conversion | 5 |
| Tropical longitudes | 8 |
| Sidereal longitudes | 8 |
| Planet sign/index/degrees | 9 |
| Planet nakshatra/index/pada | 10 |
| Planet retrograde status | 8 |
| Rahu/Ketu | 8 |
| 12 whole-sign houses | 13 |
| Planet-to-house placements | 14 |
| Planet-to-sign placements | 14 |
| Vimshottari current dasha | 16 |
| Basic Jyotish aspects | 19 |
| Life-area signatures | 23 |
| Panchang | 17 |
| Daily transits | 18 |
| Confidence score | 25 |
| Warnings | 26 |

### Output Fields

The complete output fields are defined by `MasterAstroCalculationOutput` above.

### Precision Requirement

Final serialized output must preserve raw calculation values and may additionally include display-rounded values. Downstream systems must use raw values only.

### Boundary Conditions

Unavailable fields must be explicit:

```ts
type UnavailableReason =
  | "unknown_birth_time"
  | "low_birth_time_precision"
  | "timezone_invalid"
  | "timezone_nonexistent"
  | "swiss_ephemeris_unavailable"
  | "panchang_sunrise_unavailable"
  | "unsupported_rule"
  | "tradition_setting_missing"
  | "validation_required";
```

### Failure / Warning Conditions

The final output status must be:

```ts
if rejected: "rejected"
else if any required non-fatal category unavailable: "partial"
else "calculated"
```

### Validation Test

Schema validation must assert:

- all required top-level keys exist;
- no raw birth date/time/coordinates exist inside prediction-ready context;
- every planet has tropical longitude, sidereal longitude, speed, sign, nakshatra, pada, and retrograde status;
- Lagna-dependent outputs are null/unavailable when birth time is unknown;
- validation results are attached for production calculations.
- final output validates against the published JSON Schema or OpenAPI schema.
- JSON Schema or OpenAPI validation asserts array/object cardinality, nullable fields, unavailable statuses, and forbidden prediction-context keys.
- schema validation rejects singular-object substitutions where arrays or keyed maps are required.

This master calculation specification must be treated as the source of truth for backend calculations. Accuracy overrides convenience.
