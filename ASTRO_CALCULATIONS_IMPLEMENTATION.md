# ASTRO_CALCULATIONS_IMPLEMENTATION.md

## 1. Executive Summary

`calculations.md` is the absolute source of truth for this implementation. The existing app codebase, graphify output, current route behavior, legacy adapters, and any previous calculation modules are secondary references only. If any implementation detail conflicts with `calculations.md`, implement `calculations.md`.

### Current implementation goal

Complete the existing Next.js / TypeScript astrology backend so that `app/api/astro/v1/calculate/route.ts` produces, validates, persists, and returns a complete `MasterAstroCalculationOutput` exactly matching `calculations.md` Section 29.

The engine must calculate only deterministic astronomical and rule-based Jyotish fields. It must not produce interpretive text, prediction prose, spiritual commentary, generated explanations, or user-facing analysis strings beyond structured warnings, evidence, confidence, validation metadata, calculation metadata, and explicit unavailable/unsupported statuses.

### Final target architecture

The final engine must use this calculation pipeline:

```txt
BirthInput
  -> strict input validation
  -> timezone validation and UTC conversion
  -> Julian Day UT
  -> Swiss Ephemeris startup/range validation
  -> Lahiri ayanamsa
  -> planetary positions
  -> sign/rashi
  -> nakshatra/pada
  -> tithi
  -> lagna
  -> whole-sign houses
  -> D1/Rashi chart
  -> D9/Navamsa
  -> Vimshottari dasha
  -> Panchang
  -> daily transits
  -> graha drishti
  -> yogas
  -> doshas
  -> strength/weakness indicators
  -> life-area signatures
  -> prediction-ready context
  -> confidence
  -> warnings
  -> validation results
  -> OpenAPI/JSON Schema validation
  -> MasterAstroCalculationOutput
```

### Production-readiness standard

Production mode must be fail-closed:

- Swiss Ephemeris must be available.
- Swiss Ephemeris files must be readable.
- Swiss Ephemeris must actually use Swiss ephemeris files.
- Moshier fallback must not be used for production planetary positions.
- Ephemeris file range must be known and checked before every astronomical call.
- Lahiri / Chitrapaksha ayanamsa must come from Swiss Ephemeris.
- Timezone conversion must use an audited IANA-compatible timezone engine.
- All final outputs must be traceable to:
  - a Swiss Ephemeris call;
  - an explicitly validated equivalent method;
  - a formula from `calculations.md`;
  - an audited rule object;
  - a warning rule;
  - a confidence rule;
  - a validation rule; or
  - an explicit unavailable/unsupported status.
- JSON Schema/OpenAPI validation must run against the final output.
- No legacy/stub calculation path may be used in production mode.

### Absolute source-of-truth rule

When implementing, keep this invariant:

```txt
calculations.md > this implementation plan > current code > graphify output > legacy behavior
```

Do not invent formulas. Do not add convenience fallbacks. Do not silently normalize invalid input unless this file and `calculations.md` explicitly allow it.

---

## 2. Current Codebase Assessment

### 2.1 Existing relevant modules

The app already contains a partial calculation layer. Inspect and modify these files first:

```txt
app/api/astro/v1/calculate/route.ts
app/api/astro/calculate/route.ts

lib/astro/engine/index.ts
lib/astro/engine/real.ts
lib/astro/engine/swiss.ts
lib/astro/engine/diagnostics.ts
lib/astro/engine/types.ts

lib/astro/calculations/constants.ts
lib/astro/calculations/time.ts
lib/astro/calculations/julian-day.ts
lib/astro/calculations/ayanamsa.ts
lib/astro/calculations/planets.ts
lib/astro/calculations/sign.ts
lib/astro/calculations/nakshatra.ts
lib/astro/calculations/lagna.ts
lib/astro/calculations/houses.ts
lib/astro/calculations/d1.ts
lib/astro/calculations/navamsa.ts
lib/astro/calculations/vimshottari.ts
lib/astro/calculations/panchang.ts
lib/astro/calculations/transits.ts
lib/astro/calculations/aspects.ts
lib/astro/calculations/yogas.ts
lib/astro/calculations/doshas.ts
lib/astro/calculations/strength.ts
lib/astro/calculations/life-areas.ts
lib/astro/calculations/confidence.ts
lib/astro/calculations/warnings.ts

lib/astro/types.ts
lib/astro/chart-json.ts
lib/astro/prediction-context.ts
lib/astro-engine.ts

tests/astro/*
```

Graphify output is useful to understand current dependencies, but it is not authoritative. Use it only to locate modules and call flow.

### 2.2 Current route-level problem

`app/api/astro/v1/calculate/route.ts` currently performs too much legacy orchestration.

It appears to:

1. Authenticate the user.
2. Decrypt profile birth data.
3. Normalize legacy input.
4. Call `runEngine(...)`.
5. Extract old `engineResult` structures.
6. Run route-level legacy adapters such as Panchang/transits/navamsa/aspects/life-area calculation.
7. Persist a legacy chart JSON shape.
8. Return IDs/status instead of the complete calculation output.

This must be replaced with one canonical engine call:

```ts
const output = await calculateMasterAstroOutput({
  input: birthInput,
  settings: settingsForHash,
  runtime: {
    user_id: user.id,
    profile_id,
    current_utc: new Date().toISOString(),
    production: process.env.NODE_ENV === "production"
  }
});
```

Then return `output` directly.

### 2.3 Planet key casing mismatch

The current codebase contains mixed planet key casing.

Problem pattern:

```ts
const PLANET_KEY_MAP = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  rahu: "Rahu",
  ketu: "Ketu"
};
```

But the real engine produces:

```ts
planets["Sun"]
planets["Moon"]
planets["Mercury"]
planets["Venus"]
planets["Mars"]
planets["Jupiter"]
planets["Saturn"]
planets["Rahu"]
planets["Ketu"]
```

Any code like this is wrong:

```ts
Object.entries(planetsRaw)
  .filter(([k, v]) => PLANET_KEY_MAP[k] && v)
```

because `k` is already uppercase and `PLANET_KEY_MAP[k]` will be undefined.

Required canonical key type:

```ts
export type GrahaKey =
  | "Sun"
  | "Moon"
  | "Mercury"
  | "Venus"
  | "Mars"
  | "Jupiter"
  | "Saturn"
  | "Rahu"
  | "Ketu";
```

Use uppercase keys internally everywhere. Only accept lowercase aliases at API boundary if explicitly normalized.

### 2.4 Duplicate, legacy, stub, and conflicting paths

Disable, delete, or deprecate these production paths:

```txt
lib/astro-engine.ts
app/api/astro/calculate/route.ts
lib/astro/engine/index.ts stub branch
legacy route-level adapters:
  calculatePanchang()
  calculateDailyTransits()
  calculateCurrentTiming()
  calculateNavamsa()
  calculateAspects()
  calculateLifeAreaSignatures()
legacy chart-json-only shape
legacy prediction-context summary generation
```

No production calculation may return:

```txt
status: "stub"
status: "real"
status: "not_available"
```

The final `calculation_status` must be only:

```txt
"calculated" | "partial" | "rejected"
```

---

## 3. File Classification

| File | Classification | Required action |
|---|---:|---|
| `app/api/astro/v1/calculate/route.ts` | Modify heavily | Return/persist `MasterAstroCalculationOutput`; remove legacy adapters; fix planet casing. |
| `app/api/astro/calculate/route.ts` | Delete/deprecate | Redirect to v1 or return 410/404. Must not calculate. |
| `lib/astro/engine/index.ts` | Modify heavily | Remove production stub path. Export canonical engine. |
| `lib/astro/engine/real.ts` | Modify heavily | Make canonical master-output assembler. |
| `lib/astro/engine/swiss.ts` | Modify | Add checked wrappers, fail-closed production, range validation before every call. |
| `lib/astro/engine/diagnostics.ts` | Modify | Add full startup validation and boot diagnostics. |
| `lib/astro/calculations/constants.ts` | Modify | Ensure constants exactly match `calculations.md`; mark unaudited tables as prohibited for production. |
| `lib/astro/calculations/time.ts` | Replace/modify | Use Temporal or robust IANA handling; reject ambiguous/nonexistent times. |
| `lib/astro/calculations/julian-day.ts` | Modify | Validate against Swiss; reject mismatch. |
| `lib/astro/calculations/ayanamsa.ts` | Modify | Swiss-only Lahiri ayanamsa with range validation. |
| `lib/astro/calculations/planets.ts` | Modify | Required grahas only; Ketu from Rahu; no Moshier fallback. |
| `lib/astro/calculations/sign.ts` | Modify | Boundary-safe sign calculation. |
| `lib/astro/calculations/nakshatra.ts` | Modify | Boundary-safe nakshatra/pada calculation. |
| `lib/astro/calculations/tithi.ts` | Add new | Canonical Section 11 tithi calculation. |
| `lib/astro/calculations/lagna.ts` | Modify | Swiss ascendant; unknown time unavailable; high-latitude warnings. |
| `lib/astro/calculations/houses.ts` | Modify | Whole-sign houses only. |
| `lib/astro/calculations/rashi-chart.ts` | Add new | Canonical D1/Rashi chart module. |
| `lib/astro/calculations/d1.ts` | Keep as compatibility or replace | Re-export from `rashi-chart.ts` or remove imports. |
| `lib/astro/calculations/navamsa.ts` | Modify | Fix Navamsa boundary detection. |
| `lib/astro/calculations/dasha.ts` | Add new | Canonical Vimshottari module entry point. |
| `lib/astro/calculations/vimshottari.ts` | Modify | Keep implementation or migrate to `dasha.ts`; inject current time. |
| `lib/astro/calculations/panchang.ts` | Replace/modify heavily | Sunrise-to-sunrise Panchang evaluated at local sunrise. |
| `lib/astro/calculations/transits.ts` | Modify | Inject current UTC; Section 18 shape. |
| `lib/astro/calculations/aspects.ts` | Modify | Graha drishti with reliability and tradition settings. |
| `lib/astro/calculations/yogas.ts` | Replace/limit | Audited rule registry only. Unsupported/unavailable otherwise. |
| `lib/astro/calculations/doshas.ts` | Replace/limit | Audited dosha registry only. |
| `lib/astro/calculations/strength.ts` | Replace/limit | No unaudited dignity/combustion production output. |
| `lib/astro/calculations/life-areas.ts` | Modify | Structured `LifeAreaSignature[]`; no prose summaries. |
| `lib/astro/calculations/prediction-context.ts` | Add new | Derived-only Section 24 context. |
| `lib/astro/calculations/confidence.ts` | Modify | Exact Section 25 deductions. |
| `lib/astro/calculations/warnings.ts` | Modify | Exact Section 26 warning codes and evidence. |
| `lib/astro/types/*` | Add new | Split canonical master-output types. |
| `lib/astro/types.ts` | Modify | Compatibility barrel only. |
| `lib/astro/chart-json.ts` | Modify | Persist master output; avoid derived context forbidden keys. |
| `lib/astro/prediction-context.ts` | Deprecate for calculation | Keep downstream-only if needed; do not use for master calculation context. |
| `tests/astro/*` | Replace/expand | Add complete unit/integration/schema/reference/security tests. |

---

## 4. Required Final Architecture

### 4.1 Canonical engine entry point

Add or modify:

```txt
lib/astro/engine/real.ts
```

to export:

```ts
export async function calculateMasterAstroOutput(args: {
  input: BirthInput;
  settings?: AstroCalculationSettings;
  runtime: {
    current_utc: string;
    production: boolean;
    user_id?: string;
    profile_id?: string;
  };
}): Promise<MasterAstroCalculationOutput>;
```

Do not expose raw `user_id`, `profile_id`, raw birth date/time, or coordinates inside `prediction_ready_context`.

### 4.2 Canonical dependency graph

```txt
BirthInput
 ├─ validateBirthInput()
 ├─ buildInputUse()
 ├─ convertBirthTimeToUTC()
 │   └─ BirthTimeResult
 ├─ calculateJulianDay()
 │   └─ JulianDayResult
 ├─ runStartupValidation()
 │   ├─ EngineBootDiagnostics
 │   ├─ StartupValidationResult
 │   └─ EphemerisRangeMetadata
 ├─ calculateAyanamsa()
 ├─ calculateAllPlanets()
 │   ├─ calculateSign()
 │   ├─ calculateNakshatra()
 │   └─ boundary warnings
 ├─ calculateTithi()
 ├─ calculateLagna()
 │   ├─ calculateSign()
 │   └─ calculateNakshatra()
 ├─ calculateWholeSignHouses()
 ├─ calculateRashiChart()
 ├─ calculateNavamsaChart()
 ├─ calculateVimshottariDasha()
 ├─ calculatePanchang()
 ├─ calculateDailyTransits()
 ├─ calculateGrahaDrishti()
 ├─ calculateYogas()
 ├─ calculateDoshas()
 ├─ calculateStrengthWeakness()
 ├─ calculateLifeAreaSignatures()
 ├─ collectWarnings()
 ├─ calculateConfidence()
 ├─ buildPredictionReadyContext()
 ├─ runValidationSuite()
 ├─ validateMasterOutputSchema()
 └─ assembleMasterAstroCalculationOutput()
```

### 4.3 Exact execution order

Implement in this order:

1. Input validation.
2. Timezone validation and UTC conversion.
3. Julian Day UT.
4. Swiss Ephemeris startup/range validation.
5. Lahiri ayanamsa.
6. Planetary positions.
7. Sign/rashi.
8. Nakshatra/pada.
9. Tithi.
10. Lagna.
11. Whole-sign houses.
12. D1/Rashi chart.
13. D9/Navamsa.
14. Vimshottari dasha.
15. Panchang.
16. Daily transits.
17. Graha drishti.
18. Yogas.
19. Doshas.
20. Strength/weakness indicators.
21. Life-area signatures.
22. Prediction-ready context.
23. Confidence.
24. Warnings.
25. Validation results.
26. Final schema assembly.

---

## 5. Required Types

Create these files:

```txt
lib/astro/types/birth-input.ts
lib/astro/types/constants.ts
lib/astro/types/engine.ts
lib/astro/types/placements.ts
lib/astro/types/charts.ts
lib/astro/types/panchang.ts
lib/astro/types/dasha.ts
lib/astro/types/rules.ts
lib/astro/types/validation.ts
lib/astro/types/master-output.ts
lib/astro/types/index.ts
```

### 5.1 `birth-input.ts`

```ts
export type BirthInput = {
  display_name: string;
  birth_date: string;
  birth_time?: string;
  birth_time_known: boolean;
  birth_time_precision:
    | "exact"
    | "minute"
    | "hour"
    | "day_part"
    | "unknown";
  birth_place_name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  gender?: "male" | "female" | "non_binary" | "unknown" | "not_provided";
  calendar_system?: "gregorian";
  data_consent_version: string;
};

export type InputCalculationUse = {
  used_for_astronomical_calculation: string[];
  excluded_from_astronomical_calculation: string[];
};

export type BirthTimeResult = {
  birth_local_wall_time: string;
  timezone: string;
  birth_utc: string;
  utc_offset_minutes: number;
  timezone_status: "valid" | "invalid" | "ambiguous" | "nonexistent";
  timezone_disambiguation: "not_needed" | "earlier" | "later" | "rejected";
  birth_time_uncertainty_seconds: number;
};
```

### 5.2 `placements.ts`

```ts
export type GrahaKey =
  | "Sun"
  | "Moon"
  | "Mercury"
  | "Venus"
  | "Mars"
  | "Jupiter"
  | "Saturn"
  | "Rahu"
  | "Ketu";

export type SignPlacement = {
  sign: string;
  sign_index: number;
  degrees_in_sign: number;
  near_sign_boundary: boolean;
};

export type NakshatraPlacement = {
  nakshatra: string;
  nakshatra_index: number;
  nakshatra_lord: string;
  degrees_inside_nakshatra: number;
  pada: number;
  near_nakshatra_boundary: boolean;
  near_pada_boundary: boolean;
};

export type PlanetPosition = {
  name: GrahaKey;
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

export type TithiResult = {
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

export type LagnaResult = {
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

### 5.3 `charts.ts`

```ts
import type { GrahaKey, SignPlacement, PlanetPosition, LagnaResult } from "./placements";

export type WholeSignHouse = {
  house_number: number;
  sign: string;
  sign_index: number;
  reliability: "high" | "medium" | "low" | "not_available";
};

export type D1PlanetPlacement = {
  planet: GrahaKey;
  sign: string;
  sign_index: number;
  degrees_in_sign: number;
  house_number: number | null;
  house_reliability: "high" | "medium" | "low" | "not_available";
};

export type D1Chart = {
  lagna_sign_index: number | null;
  houses: WholeSignHouse[];
  planet_to_sign: Record<GrahaKey, SignPlacement>;
  planet_to_house: Record<GrahaKey, number | null>;
  occupying_planets_by_house: Record<number, GrahaKey[]>;
};

export type NavamsaPlacement = {
  body: GrahaKey | "Lagna";
  d1_sign_index: number;
  d1_degrees_in_sign: number;
  navamsa_index: number;
  navamsa_sign: string;
  navamsa_sign_index: number;
  navamsa_house: number | null;
  boundary_warnings: string[];
};

export type NavamsaChart = {
  navamsa_lagna_sign_index: number | null;
  navamsa_lagna_sign: string | null;
  placements: NavamsaPlacement[];
};
```

### 5.4 `engine.ts`

```ts
export type JulianDayResult = {
  jd_ut: number;
  calendar: "gregorian";
  source: "swiss_ephemeris" | "formula_validated_against_swiss_ephemeris";
};

export type AyanamsaResult = {
  name: "lahiri";
  value_degrees: number;
  source: "swiss_ephemeris";
};

export type ExternalEngineMetadata = {
  ephemeris_engine:
    | "swiss_ephemeris"
    | "jpl_horizons_validation"
    | "equivalent_validated_engine";
  swiss_ephemeris_version?: string;
  ephemeris_files_version?: string;
  timezone_engine: "temporal" | "luxon" | "other_iana_compatible";
  timezone_database_version?: string;
  ayanamsa: "lahiri";
  node_type: "mean_node" | "true_node";
  sidereal_method: "swiss_sidereal_flag" | "tropical_minus_ayanamsa";
};

export type EngineScope = {
  engine_version: string;
  astronomical_basis: "geocentric_apparent";
  zodiac_system: "sidereal";
  house_system: "whole_sign";
  ephemeris_dependency: "swiss_ephemeris";
};

export type EngineBootDiagnostics = {
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

export type EphemerisRangeMetadata = {
  supported_start_jd: number;
  supported_end_jd: number;
  supported_start_date?: string;
  supported_end_date?: string;
  source: "loaded_swiss_files" | "loaded_jpl_file" | "wrapper_reported";
};

export type StartupValidationResult = {
  passed: boolean;
  checks: Array<{
    check_id: string;
    passed: boolean;
    evidence: Record<string, unknown>;
    error?: string;
  }>;
};
```

### 5.5 `dasha.ts`

```ts
export type DashaPeriod = {
  level: "mahadasha" | "antardasha" | "pratyantardasha";
  lord: string;
  start_utc: string;
  end_utc: string;
  duration_years: number;
  duration_days: number;
  parent_lords: string[];
};

export type VimshottariDashaResult = {
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

### 5.6 `panchang.ts`

```ts
import type { SignPlacement, NakshatraPlacement, TithiResult, PlanetPosition } from "./placements";
import type { LagnaResult } from "./placements";

export type SunriseConvention =
  | "swiss_default_apparent_upper_limb_with_refraction"
  | "hindu_disc_center_no_refraction"
  | "custom_validated";

export type SunriseMetadata = {
  convention: SunriseConvention;
  uses_disc_center: boolean;
  uses_refraction: boolean;
  uses_geocentric_ecliptic_latitude_adjustment?: boolean;
  pressure_mbar?: number;
  temperature_celsius?: number;
  horizon_altitude_degrees?: number;
  validation_reference: string;
};

export type PanchangResult = {
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
  sunrise_metadata: SunriseMetadata | null;
  warnings: string[];
};

export type DailyTransitResult = {
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

### 5.7 `rules.ts`

```ts
import type { GrahaKey } from "./placements";
import type { WholeSignHouse } from "./charts";

export type GrahaDrishti = {
  source_planet: GrahaKey;
  source_house: number;
  aspect_offset: number;
  target_house: number;
  target_sign_index: number | null;
  tradition: "classical_default" | "nodes_5_9_enabled";
  reliability: "high" | "medium" | "low" | "not_available";
};

export type YogaCalculationRule = {
  yoga_id: string;
  yoga_name: string;
  rule_formula: string;
  required_inputs: string[];
  cancellation_rules?: string[];
  output_evidence: Record<string, unknown>;
};

export type YogaResult = {
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

export type DoshaRule = {
  dosha_id: string;
  dosha_name: string;
  exact_rule: string;
  required_inputs: string[];
  severity_rule: string;
  cancellation_rules: string[];
};

export type DoshaResult = {
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

export type StrengthIndicator = {
  planet: GrahaKey;
  indicator: string;
  category: "strength" | "weakness" | "mixed";
  rule: string;
  evidence: Record<string, unknown>;
  confidence: "high" | "medium" | "low";
};

export type StrengthWeaknessResult = {
  indicators: StrengthIndicator[];
  dignity_table_version: string;
  combustion_table_version: string;
  warnings: string[];
};

export type LifeAreaSignature = {
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

### 5.8 `validation.ts`

```ts
export type ConfidenceResult = {
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

export type WarningResult = {
  code: string;
  severity: "info" | "warning" | "error";
  field: string;
  calculation_section: string;
  evidence: Record<string, unknown>;
};

export type ValidationResult = {
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

export type OpenApiSchemaValidationResult = {
  schema_name: string;
  schema_version: string;
  passed: boolean;
  errors: Array<{
    path: string;
    message: string;
  }>;
};

export type RoundingPolicy = {
  internal_precision: "double";
  display_longitude_decimals: 4;
  display_ayanamsa_decimals: 6;
  display_julian_day_min_decimals: 6;
  display_tithi_fraction_decimals: 4;
  dasha_date_format: "ISO_8601";
  boundary_threshold_degrees: number;
};
```

### 5.9 `master-output.ts`

```ts
import type { BirthTimeResult, InputCalculationUse } from "./birth-input";
import type {
  AyanamsaResult,
  EngineBootDiagnostics,
  EphemerisRangeMetadata,
  ExternalEngineMetadata,
  JulianDayResult,
  StartupValidationResult
} from "./engine";
import type {
  GrahaKey,
  LagnaResult,
  NakshatraPlacement,
  PlanetPosition,
  SignPlacement,
  TithiResult
} from "./placements";
import type {
  D1Chart,
  NavamsaChart,
  WholeSignHouse
} from "./charts";
import type { VimshottariDashaResult } from "./dasha";
import type { DailyTransitResult, PanchangResult } from "./panchang";
import type {
  DoshaResult,
  GrahaDrishti,
  LifeAreaSignature,
  StrengthWeaknessResult,
  YogaResult
} from "./rules";
import type {
  ConfidenceResult,
  OpenApiSchemaValidationResult,
  ValidationResult,
  WarningResult
} from "./validation";

export type ConstantSetVersion = {
  constants_version: string;
  rashi_map_version: string;
  nakshatra_map_version: string;
  dasha_order_version: string;
  panchang_sequence_version: string;
  tradition_settings: Record<string, unknown>;
};

export type CoreNatalSummary = {
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

export type PredictionReadyContext = {
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

export type MasterAstroCalculationOutput = {
  schema_version: string;
  calculation_status: "calculated" | "partial" | "rejected";
  rejection_reason?: string;

  input_use: InputCalculationUse;
  birth_time_result: BirthTimeResult;
  julian_day: JulianDayResult;
  ayanamsa: AyanamsaResult;
  external_engine_metadata: ExternalEngineMetadata;
  constants_version: ConstantSetVersion;

  planetary_positions: Record<GrahaKey, PlanetPosition>;

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

---

## 6. Constants

Modify `lib/astro/calculations/constants.ts`.

### 6.1 Required numeric constants

```ts
export const FULL_CIRCLE_DEGREES = 360;
export const SIGN_SPAN_DEGREES = 30;
export const NAKSHATRA_COUNT = 27;
export const NAKSHATRA_SPAN = 360 / 27;
export const PADA_COUNT_PER_NAKSHATRA = 4;
export const PADA_SPAN = NAKSHATRA_SPAN / 4;
export const TITHI_COUNT = 30;
export const TITHI_SPAN = 12;
export const HALF_TITHI_SPAN = 6;
export const YOGA_COUNT = 27;
export const YOGA_SPAN = 360 / 27;
export const BOUNDARY_THRESHOLD_DEGREES = 1 / 60;
export const VIMSHOTTARI_TOTAL_YEARS = 120;
export const DASHA_YEAR_DAYS = 365.25;
```

### 6.2 Required normalizer

```ts
export function normalize360(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}
```

### 6.3 Required rashi map

```ts
export const RASHI_MAP = [
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

### 6.4 Required nakshatra map

```ts
export const NAKSHATRA_MAP = [
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

### 6.5 Required dasha constants

```ts
export const DASHA_SEQUENCE = [
  "Ketu",
  "Venus",
  "Sun",
  "Moon",
  "Mars",
  "Rahu",
  "Jupiter",
  "Saturn",
  "Mercury"
] as const;

export const DASHA_YEARS = {
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
```

### 6.6 Required graha list

```ts
export const REQUIRED_GRAHAS = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Rahu",
  "Ketu"
] as const;
```

### 6.7 Required sign lord map

```ts
export const SIGN_LORD_BY_SIGN_INDEX = {
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

### 6.8 Required tithi names

Add exact tithi name map from Section 3:

```ts
export const TITHI_NAME_BY_NUMBER = {
  1: "Pratipada",
  2: "Dvitiya",
  3: "Tritiya",
  4: "Chaturthi",
  5: "Panchami",
  6: "Shashthi",
  7: "Saptami",
  8: "Ashtami",
  9: "Navami",
  10: "Dashami",
  11: "Ekadashi",
  12: "Dwadashi",
  13: "Trayodashi",
  14: "Chaturdashi",
  15: "Purnima",
  16: "Pratipada",
  17: "Dvitiya",
  18: "Tritiya",
  19: "Chaturthi",
  20: "Panchami",
  21: "Shashthi",
  22: "Saptami",
  23: "Ashtami",
  24: "Navami",
  25: "Dashami",
  26: "Ekadashi",
  27: "Dwadashi",
  28: "Trayodashi",
  29: "Chaturdashi",
  30: "Amavasya"
} as const;
```

### 6.9 Required yoga names

```ts
export const YOGA_NAMES = [
  "Vishkambha",
  "Priti",
  "Ayushman",
  "Saubhagya",
  "Shobhana",
  "Atiganda",
  "Sukarma",
  "Dhriti",
  "Shula",
  "Ganda",
  "Vriddhi",
  "Dhruva",
  "Vyaghata",
  "Harshana",
  "Vajra",
  "Siddhi",
  "Vyatipata",
  "Variyana",
  "Parigha",
  "Shiva",
  "Siddha",
  "Sadhya",
  "Shubha",
  "Shukla",
  "Brahma",
  "Indra",
  "Vaidhriti"
] as const;
```

### 6.10 Required karana sequence

```ts
export const KARANAS = [
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

export function karanaNameByHalfTithiIndex(k: number): string {
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

### 6.11 Required Navamsa start map

Use the corrected rule-derived map from `calculations.md` Section 15:

```ts
export const NAVAMSA_START = {
  0: 0,
  1: 9,
  2: 6,
  3: 3,
  4: 0,
  5: 9,
  6: 6,
  7: 3,
  8: 0,
  9: 9,
  10: 6,
  11: 3
} as const;
```

### 6.12 Unaudited candidate tables

If any dignity, exaltation, moolatrikona, friend/enemy, or combustion tables exist, convert them to:

```ts
export type UnauditedCandidateRuleTable<T> = {
  status: "unaudited_candidate_only";
  prohibited_for_production: true;
  source_note: "imported_from_file_b_for_future_audit";
  entries: T[];
};
```

Do not use these tables for production high-confidence output.

---

## 7. Timezone and BirthInput Validation

Modify or replace `lib/astro/calculations/time.ts`.

### 7.1 Dependency

Prefer adding:

```bash
npm install @js-temporal/polyfill
```

If this project already avoids adding dependencies, Luxon may remain only if ambiguity and nonexistent time detection are proven by tests.

### 7.2 Input validation function

Add:

```ts
export function validateBirthInput(input: unknown): BirthInput
```

Rules:

```txt
birth_date:
  required
  string
  YYYY-MM-DD
  valid Gregorian date

birth_time:
  if supplied, HH:MM or HH:MM:SS
  valid wall clock time
  required when birth_time_known=true

birth_time_known:
  required boolean

birth_time_precision:
  exact | minute | hour | day_part | unknown

latitude:
  finite number
  -90 <= latitude <= 90

longitude:
  finite number
  -180 <= longitude <= 180

timezone:
  valid IANA timezone

calendar_system:
  missing or exactly "gregorian"

data_consent_version:
  required string
```

### 7.3 Calculation-affecting fields

Add:

```ts
export function buildInputUse(): InputCalculationUse {
  return {
    used_for_astronomical_calculation: [
      "birth_date",
      "birth_time",
      "birth_time_known",
      "birth_time_precision",
      "latitude",
      "longitude",
      "timezone",
      "calendar_system"
    ],
    excluded_from_astronomical_calculation: [
      "display_name",
      "birth_place_name",
      "gender",
      "data_consent_version"
    ]
  };
}
```

### 7.4 UTC conversion behavior

Add:

```ts
export function convertBirthTimeToUTC(args: {
  input: BirthInput;
  disambiguation?: "earlier" | "later";
}): BirthTimeResult
```

Rules:

- If `birth_time_known === true` and `birth_time` is missing, reject.
- If `birth_time_known === false`, use local noon as placeholder:
  - `birth_local_wall_time = birth_date + "T12:00:00"`
  - `birth_time_uncertainty_seconds = 86400`
  - `timezone_status = "valid"` if timezone valid.
- Reject invalid timezone.
- Reject nonexistent local time by default.
- Reject ambiguous local time unless `earlier` or `later` disambiguation is explicitly supplied.
- Do not silently roll spring-forward nonexistent times forward.
- Do not silently choose the earlier/later instant for fall-back ambiguous times.

### 7.5 Birth time uncertainty

```ts
export function getBirthTimeUncertaintySeconds(
  precision: BirthInput["birth_time_precision"],
  known: boolean
): number {
  if (!known || precision === "unknown") return 86400;
  if (precision === "exact") return 0;
  if (precision === "minute") return 60;
  if (precision === "hour") return 3600;
  if (precision === "day_part") return 21600;
  return 86400;
}
```

---

## 8. Julian Day Calculation

Modify `lib/astro/calculations/julian-day.ts`.

### 8.1 Required function

```ts
export function calculateJulianDay(args: {
  birth_utc: string;
  swiss?: SwissEphemerisRuntime;
  production: boolean;
}): JulianDayResult
```

### 8.2 Formula

Use Swiss `swe_julday` when available. Formula may be used only if validated against Swiss.

Gregorian formula:

```ts
export function julianDayFormula(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds() + date.getUTCMilliseconds() / 1000;

  let Y = year;
  let M = month;
  if (M <= 2) {
    Y -= 1;
    M += 12;
  }

  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const D = day + (hour + minute / 60 + second / 3600) / 24;

  return (
    Math.floor(365.25 * (Y + 4716)) +
    Math.floor(30.6001 * (M + 1)) +
    D +
    B -
    1524.5
  );
}
```

### 8.3 Required rejection

If formula and Swiss differ by more than:

```txt
0.000001 day
```

reject in production.

Do not merely `console.warn`.

---

## 9. Swiss Ephemeris Runtime

Modify `lib/astro/engine/swiss.ts`.

### 9.1 Required production behavior

Production mode must fail closed if Swiss Ephemeris is unavailable.

No code path in production may do this:

```ts
// bad
if (swissUnavailable) return approximatePlanetPositions();
```

No code path in production may allow Moshier fallback.

### 9.2 Required checked wrappers

Create checked wrappers:

```ts
export function initSwissEphemeris(): SwissEphemerisRuntime;

export function assertSwissAvailableForProduction(): void;

export function assertEphemerisRange(
  jd_ut: number,
  range: EphemerisRangeMetadata
): void;

export function sweJuldayChecked(
  year: number,
  month: number,
  day: number,
  hourDecimal: number
): number;

export function calcPlanetChecked(args: {
  jd_ut: number;
  planet_id: number;
  flags: number;
}): {
  longitude: number;
  latitude: number;
  distance_au: number;
  speed_longitude: number;
  speed_latitude: number;
  speed_distance: number;
  raw_flag: number;
};

export function getLahiriAyanamsaChecked(jd_ut: number): number;

export function getAscendantChecked(args: {
  jd_ut: number;
  latitude: number;
  longitude: number;
  ayanamsa: number;
  sidereal_method: "tropical_minus_ayanamsa" | "swiss_sidereal_flag";
}): {
  tropical_longitude: number;
  sidereal_longitude: number;
};

export function getSunriseOrSetChecked(args: {
  jd_ut_start: number;
  latitude: number;
  longitude: number;
  kind: "sunrise" | "sunset";
}): {
  instant_utc: string | null;
  jd_ut: number | null;
  metadata: SunriseMetadata;
  warnings: string[];
};
```

### 9.3 Moshier rejection

Every `swe_calc_ut` wrapper must verify Swiss ephemeris was used.

Required logic:

```ts
const result = swe.calc_ut(jd_ut, planet_id, flags);

if (result.error) {
  throw new AstroFatalError("SWISS_CALC_ERROR", result.error);
}

if ((result.flag & SEFLG_SWIEPH) === 0) {
  throw new AstroFatalError("MOSHIER_FALLBACK_NOT_ALLOWED");
}
```

If the current wrapper exposes flags differently, inspect the result object and enforce equivalent behavior.

### 9.4 Required startup validation

Modify `lib/astro/engine/diagnostics.ts`.

Add:

```ts
export async function runStartupValidation(): Promise<StartupValidationResult>
```

It must check:

```txt
swiss_ephemeris_library_loaded
ephemeris_data_path_loaded
ephemeris_files_loaded
ephemeris_file_hashes_captured
swiss_ephemeris_version_captured
lahiri_mode_set
fixed_sun_call_succeeds
fixed_moon_call_succeeds
fixed_node_call_succeeds
ayanamsa_call_succeeds
houses_ascendant_call_succeeds
rise_set_call_succeeds_or_validated_equivalent
timezone_engine_available
ephemeris_range_metadata_available
```

### 9.5 Required boot diagnostics

Add:

```ts
export function getEngineBootDiagnostics(): EngineBootDiagnostics
```

Must return:

```txt
swiss_ephemeris_library_loaded
swiss_ephemeris_version
ephemeris_data_path_loaded
ephemeris_files_loaded
ephemeris_file_hashes
jpl_ephemeris_loaded optional
timezone_database_version optional
startup_validation_passed
startup_validation_errors
```

### 9.6 Ephemeris file hashes

Use Node `crypto`:

```ts
import { createHash } from "crypto";
import { readFileSync } from "fs";

export function sha256File(path: string): string {
  const data = readFileSync(path);
  return createHash("sha256").update(data).digest("hex");
}
```

Capture hashes for all loaded `.se1` files that are required.

---

## 10. Ayanamsa Calculation

Modify `lib/astro/calculations/ayanamsa.ts`.

### 10.1 Required function

```ts
export function calculateAyanamsa(args: {
  jd_ut: number;
}): AyanamsaResult
```

### 10.2 Required behavior

Use:

```txt
swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0)
swe_get_ayanamsa_ut(jd_ut)
```

or wrapper equivalent.

Never use an approximate Lahiri formula in production.

### 10.3 Required output

```ts
{
  name: "lahiri",
  value_degrees,
  source: "swiss_ephemeris"
}
```

---

## 11. Planetary Positions

Modify `lib/astro/calculations/planets.ts`.

### 11.1 Required function signatures

```ts
export function calculatePlanetPosition(args: {
  name: GrahaKey;
  jd_ut: number;
  ayanamsa_degrees: number;
  node_type: "mean_node" | "true_node";
  sidereal_method: "tropical_minus_ayanamsa";
}): PlanetPosition;

export function calculateAllPlanets(args: {
  jd_ut: number;
  ayanamsa_degrees: number;
  node_type: "mean_node" | "true_node";
  sidereal_method: "tropical_minus_ayanamsa";
}): Record<GrahaKey, PlanetPosition>;
```

### 11.2 Required Swiss bodies

Map exactly:

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

Ketu is not an independent Swiss body.

### 11.3 Required planetary method

For each non-node graha:

```txt
swe_calc_ut(jd_ut, planet_id, SEFLG_SWIEPH | SEFLG_SPEED)
```

Then:

```ts
const tropical_longitude = normalize360(xx[0]);
const speed_longitude = xx[3];
const sidereal_longitude = normalize360(tropical_longitude - ayanamsa_degrees);
const is_retrograde = speed_longitude < 0;
```

### 11.4 Required Ketu derivation

```ts
function deriveKetuFromRahu(rahu: PlanetPosition): PlanetPosition {
  const tropical_longitude = normalize360(rahu.tropical_longitude + 180);
  const sidereal_longitude = normalize360(rahu.sidereal_longitude + 180);
  const speed_longitude = rahu.speed_longitude;

  const sign = calculateSign(sidereal_longitude);
  const nakshatra = calculateNakshatra(sidereal_longitude);

  return {
    name: "Ketu",
    tropical_longitude,
    sidereal_longitude,
    speed_longitude,
    is_retrograde: speed_longitude < 0,
    sign: sign.sign,
    sign_index: sign.sign_index,
    degrees_in_sign: sign.degrees_in_sign,
    nakshatra: nakshatra.nakshatra,
    nakshatra_index: nakshatra.nakshatra_index,
    pada: nakshatra.pada,
    boundary_warnings: buildPlanetBoundaryWarnings("Ketu", sign, nakshatra)
  };
}
```

### 11.5 Required boundary warnings

Add warnings for:

```txt
near sign boundary
near nakshatra boundary
near pada boundary
```

Each warning string should be deterministic, for example:

```txt
"Ketu near sign boundary"
"Ketu near nakshatra boundary"
"Ketu near pada boundary"
```

Structured warnings are later generated by `warnings.ts`.

---

## 12. Sign Calculation

Modify `lib/astro/calculations/sign.ts`.

### 12.1 Required function

```ts
export function calculateSign(sidereal_longitude: number): SignPlacement
```

### 12.2 Required formula

```ts
const normalized = normalize360(sidereal_longitude);
const sign_index = Math.floor(normalized / 30);
const degrees_in_sign = normalized - sign_index * 30;
const sign = RASHI_MAP[sign_index].english_name;
```

### 12.3 Boundary logic

```ts
export function nearLinearBoundary(valueWithinSpan: number, span: number): boolean {
  const distance = Math.min(valueWithinSpan, span - valueWithinSpan);
  return distance <= BOUNDARY_THRESHOLD_DEGREES;
}
```

For sign:

```ts
const position_in_sign = normalized % 30;
const near_sign_boundary = nearLinearBoundary(position_in_sign, 30);
```

### 12.4 Clamp rule

If `sign_index === 12`, only clamp to `0` if `normalized` is within floating epsilon of `360`.

Otherwise reject.

---

## 13. Nakshatra and Pada Calculation

Modify `lib/astro/calculations/nakshatra.ts`.

### 13.1 Required function

```ts
export function calculateNakshatra(sidereal_longitude: number): NakshatraPlacement
```

### 13.2 Required formula

```ts
const normalized = normalize360(sidereal_longitude);
const nakshatra_index = Math.floor(normalized / NAKSHATRA_SPAN);
const degrees_inside_nakshatra =
  normalized - nakshatra_index * NAKSHATRA_SPAN;
const pada = Math.floor(degrees_inside_nakshatra / PADA_SPAN) + 1;
```

### 13.3 Boundary logic

```ts
const position_in_nakshatra = normalized % NAKSHATRA_SPAN;
const near_nakshatra_boundary =
  nearLinearBoundary(position_in_nakshatra, NAKSHATRA_SPAN);

const position_in_pada = degrees_inside_nakshatra % PADA_SPAN;
const near_pada_boundary =
  nearLinearBoundary(position_in_pada, PADA_SPAN);
```

### 13.4 No silent clamp

If `pada === 5`, recompute around exact boundary only if within floating epsilon of the next nakshatra boundary. Otherwise throw.

---

## 14. Tithi Calculation

Add `lib/astro/calculations/tithi.ts`.

### 14.1 Required function

```ts
export function calculateTithi(args: {
  moon_sidereal_longitude: number;
  sun_sidereal_longitude: number;
}): TithiResult
```

### 14.2 Required formula

```ts
const moon_sun_angle = normalize360(
  moon_sidereal_longitude - sun_sidereal_longitude
);

const tithi_index = Math.floor(moon_sun_angle / 12);
const tithi_number = tithi_index + 1;
const tithi_fraction_elapsed = (moon_sun_angle % 12) / 12;
const tithi_fraction_remaining = 1 - tithi_fraction_elapsed;
const paksha = tithi_number <= 15 ? "Shukla" : "Krishna";
const tithi_name = TITHI_NAME_BY_NUMBER[tithi_number];

const position_in_tithi = moon_sun_angle % 12;
const near_tithi_boundary = nearLinearBoundary(position_in_tithi, 12);
```

### 14.3 Required output

```ts
{
  moon_sun_angle,
  tithi_index,
  tithi_number,
  paksha,
  tithi_name,
  tithi_fraction_elapsed,
  tithi_fraction_remaining,
  near_tithi_boundary,
  convention: "sidereal_lahiri"
}
```

---

## 15. Lagna Calculation

Modify `lib/astro/calculations/lagna.ts`.

### 15.1 Required function

```ts
export function calculateLagna(args: {
  jd_ut: number;
  latitude: number;
  longitude: number;
  birth_time_known: boolean;
  birth_time_precision: BirthInput["birth_time_precision"];
  birth_time_uncertainty_seconds: number;
  ayanamsa_degrees: number;
  sidereal_method: "tropical_minus_ayanamsa";
}): LagnaResult | null
```

### 15.2 Unknown time behavior

If `birth_time_known === false` or precision is `unknown`:

```ts
return null;
```

Do not calculate authoritative Lagna using noon placeholder.

### 15.3 Reliability

```ts
let reliability: LagnaResult["reliability"];

if (!birth_time_known || birth_time_precision === "unknown") {
  reliability = "not_available";
} else if (birth_time_precision === "exact" || birth_time_precision === "minute") {
  reliability = "high";
} else if (birth_time_precision === "hour") {
  reliability = "medium";
} else {
  reliability = "low";
}
```

### 15.4 High latitude

```ts
const high_latitude_flag = Math.abs(latitude) >= 66.0;
```

If high latitude, set `uncertainty_flag = true`.

---

## 16. Whole-Sign Houses

Modify `lib/astro/calculations/houses.ts`.

### 16.1 Required function

```ts
export function calculateWholeSignHouses(
  lagna: LagnaResult | null
): WholeSignHouse[]
```

### 16.2 Required formula

If `lagna === null`, return `[]`.

Otherwise:

```ts
for (let house_number = 1; house_number <= 12; house_number++) {
  const sign_index = (lagna.sign_index + house_number - 1) % 12;
  houses.push({
    house_number,
    sign: RASHI_MAP[sign_index].english_name,
    sign_index,
    reliability: lagna.reliability
  });
}
```

---

## 17. D1 / Rashi Chart

Add `lib/astro/calculations/rashi-chart.ts`.

### 17.1 Required function

```ts
export function calculateRashiChart(args: {
  planets: Record<GrahaKey, PlanetPosition>;
  lagna: LagnaResult | null;
  houses: WholeSignHouse[];
}): D1Chart
```

### 17.2 Required formula

Planet-to-house:

```ts
const house_number =
  lagna === null
    ? null
    : ((planet.sign_index - lagna.sign_index + 12) % 12) + 1;
```

Planet-to-sign:

```ts
planet_to_sign[planet.name] = calculateSign(planet.sidereal_longitude);
```

Occupants:

```ts
const occupying_planets_by_house: Record<number, GrahaKey[]> = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: [],
  7: [],
  8: [],
  9: [],
  10: [],
  11: [],
  12: []
};

for (const planet of Object.values(planets)) {
  const house = planet_to_house[planet.name];
  if (house !== null) occupying_planets_by_house[house].push(planet.name);
}
```

---

## 18. Navamsa / D9

Modify `lib/astro/calculations/navamsa.ts`.

### 18.1 Required functions

```ts
export function calculateNavamsaSignIndex(longitude: number): {
  d1_sign_index: number;
  d1_degrees_in_sign: number;
  navamsa_index: number;
  navamsa_sign_index: number;
  near_navamsa_boundary: boolean;
};

export function calculateNavamsaChart(args: {
  planets: Record<GrahaKey, PlanetPosition>;
  lagna: LagnaResult | null;
}): NavamsaChart
```

### 18.2 Required formula

```ts
const normalized = normalize360(longitude);
const d1_sign_index = Math.floor(normalized / 30);
const d1_degrees_in_sign = normalized - d1_sign_index * 30;
const navamsa_span = 30 / 9;
const navamsa_index = Math.floor(d1_degrees_in_sign / navamsa_span);
const navamsa_start_sign_index = NAVAMSA_START[d1_sign_index];
const navamsa_sign_index = (navamsa_start_sign_index + navamsa_index) % 12;
```

### 18.3 Required boundary rule

Use Navamsa boundary, not nakshatra boundary:

```ts
const position_in_navamsa = d1_degrees_in_sign % (30 / 9);
const near_navamsa_boundary = nearLinearBoundary(position_in_navamsa, 30 / 9);
```

### 18.4 Navamsa Lagna

If Lagna unavailable:

```ts
navamsa_lagna_sign_index = null;
navamsa_lagna_sign = null;
navamsa_house = null for all placements;
```

---

## 19. Vimshottari Dasha

Add `lib/astro/calculations/dasha.ts` or refactor `vimshottari.ts`.

### 19.1 Required function

```ts
export function calculateVimshottariDasha(args: {
  moon_sidereal_longitude: number;
  birth_utc: string;
  current_utc: string;
}): VimshottariDashaResult
```

### 19.2 Birth dasha formula

```ts
const moon_nakshatra_index =
  Math.floor(normalize360(moon_sidereal_longitude) / NAKSHATRA_SPAN);

const moon_nakshatra = NAKSHATRA_MAP[moon_nakshatra_index];
const birth_dasha_lord = moon_nakshatra.lord;

const degrees_into_nakshatra =
  normalize360(moon_sidereal_longitude) -
  moon_nakshatra_index * NAKSHATRA_SPAN;

const fraction_elapsed = degrees_into_nakshatra / NAKSHATRA_SPAN;

const dasha_total_years = DASHA_YEARS[birth_dasha_lord];
const dasha_elapsed_years = fraction_elapsed * dasha_total_years;
const dasha_remaining_years = dasha_total_years - dasha_elapsed_years;
```

### 19.3 Dasha year basis

Use:

```ts
const DASHA_YEAR_DAYS = 365.25;
```

Store:

```ts
dasha_year_basis: "365.25_days"
```

### 19.4 Antardasha formula

```ts
antardasha_duration_years =
  mahadasha_years * DASHA_YEARS[antardasha_lord] / 120;
```

### 19.5 Pratyantardasha formula

```ts
pratyantardasha_duration_years =
  antardasha_duration_years * DASHA_YEARS[pratyantardasha_lord] / 120;
```

### 19.6 Current dasha

Use injected `current_utc`, not hidden `new Date()`.

```ts
current_period =
  period.start_utc <= current_utc && current_utc < period.end_utc;
```

---

## 20. Panchang

Replace/modify `lib/astro/calculations/panchang.ts`.

### 20.1 Required function

```ts
export async function calculatePanchang(args: {
  local_date: string;
  timezone: string;
  latitude: number;
  longitude: number;
  birth_or_reference_utc: string;
  ayanamsa_degrees: number;
  node_type: "mean_node" | "true_node";
}): Promise<PanchangResult | null>
```

### 20.2 Required convention

Default Panchang day is sunrise-to-sunrise at the calculation location.

Values must be evaluated at local sunrise unless explicitly configured otherwise.

### 20.3 Required flow

```txt
1. Resolve local date and local timezone.
2. Calculate sunrise and sunset for that local date.
3. If local reference time is before local sunrise, use previous local date for Panchang day.
4. Calculate sunrise for selected Panchang local date.
5. Convert sunrise to UTC.
6. Calculate JD at sunrise UTC.
7. Calculate Sun and Moon at sunrise UTC using Swiss.
8. Calculate:
   - tithi
   - nakshatra
   - yoga
   - karana
   - vara
   - Moon rashi
9. Include sunrise/sunset UTC and local times.
10. Include sunrise convention metadata.
```

### 20.4 Yoga formula

```ts
const yoga_angle = normalize360(
  sun_sidereal_longitude + moon_sidereal_longitude
);

const yoga_index = Math.floor(yoga_angle / YOGA_SPAN);
const yoga_name = YOGA_NAMES[yoga_index];
const yoga_fraction_elapsed = (yoga_angle % YOGA_SPAN) / YOGA_SPAN;
const near_yoga_boundary = nearLinearBoundary(yoga_angle % YOGA_SPAN, YOGA_SPAN);
```

### 20.5 Karana formula

```ts
const moon_sun_angle = normalize360(
  moon_sidereal_longitude - sun_sidereal_longitude
);

const karana_half_tithi_index = Math.floor(moon_sun_angle / 6);
const karana_name = karanaNameByHalfTithiIndex(karana_half_tithi_index);
const karana_fraction_elapsed = (moon_sun_angle % 6) / 6;
const near_karana_boundary = nearLinearBoundary(moon_sun_angle % 6, 6);
```

### 20.6 Vara formula

```ts
const vara_date =
  local_reference_time < local_sunrise
    ? previous_local_date
    : local_date;

const vara = weekdayName(vara_date);
```

### 20.7 Sunrise unavailable

If sunrise/sunset unavailable:

```txt
panchang = null or partial result with null sunrise/sunset
warning UNAVAILABLE_PANCHANG
confidence deduction 20
calculation_status partial
```

---

## 21. Daily Transits

Modify `lib/astro/calculations/transits.ts`.

### 21.1 Required function

```ts
export async function calculateDailyTransits(args: {
  current_utc: string;
  ayanamsa_degrees: number;
  natal_planets: Record<GrahaKey, PlanetPosition>;
  natal_lagna: LagnaResult | null;
  node_type: "mean_node" | "true_node";
}): Promise<DailyTransitResult>
```

### 21.2 Required formulas

Current JD:

```ts
const current_jd_ut = calculateJulianDay({ birth_utc: current_utc, ... });
```

Transit planets:

```ts
const transit_planets = calculateAllPlanets({
  jd_ut: current_jd_ut,
  ayanamsa_degrees,
  node_type,
  sidereal_method: "tropical_minus_ayanamsa"
});
```

House from natal Moon:

```ts
house_from_natal_moon =
  ((transit_sign_index - natal_moon_sign_index + 12) % 12) + 1;
```

House from natal Lagna:

```ts
house_from_natal_lagna =
  natal_lagna === null
    ? null
    : ((transit_sign_index - natal_lagna.sign_index + 12) % 12) + 1;
```

---

## 22. Graha Drishti / Aspects

Modify `lib/astro/calculations/aspects.ts`.

### 22.1 Required function

```ts
export function calculateGrahaDrishti(args: {
  d1_chart: D1Chart;
  houses: WholeSignHouse[];
  include_node_special_aspects: boolean;
}): GrahaDrishti[]
```

### 22.2 Required aspect offsets

```ts
export function aspectOffsets(
  planet: GrahaKey,
  includeNodeSpecialAspects: boolean
): number[] {
  const offsets = [7];

  if (planet === "Mars") offsets.push(4, 8);
  if (planet === "Jupiter") offsets.push(5, 9);
  if (planet === "Saturn") offsets.push(3, 10);
  if (includeNodeSpecialAspects && (planet === "Rahu" || planet === "Ketu")) {
    offsets.push(5, 9);
  }

  return offsets;
}
```

### 22.3 Target house formula

```ts
target_house =
  ((source_house - 1 + aspect_offset - 1 + 12) % 12) + 1;
```

### 22.4 Reliability

If source house is `null`, do not emit calculated aspects for that planet.

If Lagna unavailable, aspects array should be empty and dependent warnings should be emitted.

---

## 23. Yogas

Replace/limit `lib/astro/calculations/yogas.ts`.

### 23.1 Required behavior

No yoga may be output as calculated unless there is:

```txt
yoga_id
yoga_name
exact rule formula
required inputs
audited source/version metadata
positive fixture
negative fixture
cancellation fixture if applicable
boundary fixture if sign/house dependent
evidence
confidence
```

### 23.2 Required function

```ts
export function calculateYogas(args: {
  d1_chart: D1Chart;
  navamsa: NavamsaChart;
  aspects: GrahaDrishti[];
  strength: StrengthWeaknessResult;
  tradition_settings: Record<string, unknown>;
}): YogaResult[]
```

### 23.3 Initial production-safe policy

Until audited yoga rules and fixtures exist, return a deterministic list of unsupported/unavailable rule objects only if the product requires named entries. Otherwise return `[]` and include `unsupported_fields`.

Do not preserve current unaudited yoga calculations as high-confidence production output.

---

## 24. Doshas

Replace/limit `lib/astro/calculations/doshas.ts`.

### 24.1 Required behavior

No dosha may be output without:

```txt
exact rule
severity rule
cancellation rule
required inputs
evidence
confidence
audited source/version metadata
fixtures
```

### 24.2 Required function

```ts
export function calculateDoshas(args: {
  d1_chart: D1Chart;
  navamsa: NavamsaChart;
  aspects: GrahaDrishti[];
  tradition_settings: Record<string, unknown>;
}): DoshaResult[]
```

### 24.3 Initial production-safe policy

If current dosha rules do not have audited metadata and fixtures:

```txt
status = "unsupported"
present = false
severity = "none"
confidence = "low"
warnings includes "UNSUPPORTED_DOSHA_RULE"
```

or return `[]` with `unsupported_fields`.

---

## 25. Strength / Weakness

Modify `lib/astro/calculations/strength.ts`.

### 25.1 Required function

```ts
export function calculateStrengthWeakness(args: {
  planets: Record<GrahaKey, PlanetPosition>;
  d1_chart: D1Chart;
  navamsa: NavamsaChart;
  aspects: GrahaDrishti[];
  production: boolean;
}): StrengthWeaknessResult
```

### 25.2 Production-safe supported indicators

These may be calculated without unaudited external tables:

#### Own sign

```ts
own_sign = SIGN_LORD_BY_SIGN_INDEX[planet.sign_index] === planet.name;
```

#### Retrogression

```ts
retrogression_indicator = planet.is_retrograde === true;
```

#### Vargottama

```ts
vargottama = d1_sign_index === d9_sign_index;
```

#### House placement

House placement may be recorded as evidence but should not become interpretive prose.

### 25.3 Unsupported until audited

Do not calculate these as production high-confidence indicators until audited source/version and fixtures exist:

```txt
exaltation
debilitation
moolatrikona
friendly sign
enemy sign
combustion thresholds
aspect support/affliction if qualitative
```

If emitted, mark:

```txt
status unavailable
confidence low
warning unsupported/audit_required
```

---

## 26. Life-Area Signatures

Modify `lib/astro/calculations/life-areas.ts`.

### 26.1 Required function

```ts
export function calculateLifeAreaSignatures(args: {
  houses: WholeSignHouse[];
  d1_chart: D1Chart;
  aspects: GrahaDrishti[];
  strength: StrengthWeaknessResult;
  lagna: LagnaResult | null;
}): LifeAreaSignature[]
```

### 26.2 Required life-area map

```ts
const LIFE_AREA_HOUSE = {
  self: 1,
  wealth: 2,
  siblings: 3,
  home_mother: 4,
  children_intellect: 5,
  enemies_health: 6,
  partner_marriage: 7,
  longevity_transformation: 8,
  dharma_fortune: 9,
  career_status: 10,
  gains_network: 11,
  losses_liberation: 12
} as const;
```

### 26.3 Required formula

For each life area:

```ts
const house_number = LIFE_AREA_HOUSE[life_area];
const house = houses.find(h => h.house_number === house_number);

const house_sign_index = house?.sign_index ?? null;
const house_sign = house?.sign ?? null;

const house_lord =
  house_sign_index === null
    ? null
    : SIGN_LORD_BY_SIGN_INDEX[house_sign_index];

const lord_placement_house =
  house_lord === null ? null : d1_chart.planet_to_house[house_lord];

const lord_sign =
  house_lord === null ? null : d1_chart.planet_to_sign[house_lord];

const occupying_planets =
  d1_chart.occupying_planets_by_house[house_number] ?? [];

const aspects_to_house =
  aspects.filter(a => a.target_house === house_number);

const strength_note =
  strength.indicators.filter(i =>
    i.planet === house_lord || occupying_planets.includes(i.planet)
  );
```

### 26.4 Unknown Lagna

If Lagna unavailable, return life-area signatures with:

```txt
house_sign null
house_sign_index null
house_lord null
lord_placement_house null
lord_placement_sign null
lord_placement_sign_index null
occupying_planets []
aspects_to_house []
strength_note []
reliability "not_available"
warnings ["Lagna unavailable; life-area signature unavailable"]
```

No prose interpretation.

---

## 27. Prediction-Ready Context

Add `lib/astro/calculations/prediction-context.ts`.

### 27.1 Required function

```ts
export function buildPredictionReadyContext(args: {
  external_engine_metadata: ExternalEngineMetadata;
  constants_version: ConstantSetVersion;
  core_natal_summary: CoreNatalSummary;
  planet_positions: Record<GrahaKey, PlanetPosition>;
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
}): PredictionReadyContext
```

### 27.2 Forbidden keys

Add:

```ts
export const PREDICTION_CONTEXT_FORBIDDEN_KEYS = [
  "birth_date",
  "birth_time",
  "latitude",
  "longitude",
  "encrypted_birth_data",
  "data_consent_version",
  "profile_id",
  "user_id"
] as const;
```

### 27.3 Recursive assertion

```ts
export function assertNoForbiddenPredictionKeys(
  value: unknown,
  path: string[] = []
): void {
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      assertNoForbiddenPredictionKeys(child, [...path, String(index)])
    );
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if ((PREDICTION_CONTEXT_FORBIDDEN_KEYS as readonly string[]).includes(key)) {
        throw new Error(
          `Forbidden prediction context key: ${[...path, key].join(".")}`
        );
      }
      assertNoForbiddenPredictionKeys(child, [...path, key]);
    }
  }
}
```

Call this before returning final output.

---

## 28. Confidence

Modify `lib/astro/calculations/confidence.ts`.

### 28.1 Required function

```ts
export function calculateConfidence(args: {
  birth_time_known: boolean;
  birth_time_precision: BirthInput["birth_time_precision"];
  timezone_status: BirthTimeResult["timezone_status"];
  moon_near_nakshatra_boundary: boolean;
  lagna_near_sign_boundary: boolean;
  any_planet_near_sign_boundary: boolean;
  high_latitude_ascendant_instability: boolean;
  panchang_sunrise_unavailable: boolean;
  swiss_ephemeris_available: boolean;
}): ConfidenceResult
```

### 28.2 Exact deduction table

Start:

```ts
let score = 100;
```

Deductions:

```ts
if (birth_time_precision === "minute") score -= 5;
if (birth_time_precision === "hour") score -= 20;
if (birth_time_precision === "day_part") score -= 40;
if (!birth_time_known || birth_time_precision === "unknown") score -= 60;
if (timezone_status === "ambiguous") score -= 50;
if (moon_near_nakshatra_boundary) score -= 25;
if (lagna_near_sign_boundary) score -= 20;
if (any_planet_near_sign_boundary) score -= 10;
if (high_latitude_ascendant_instability) score -= 15;
if (panchang_sunrise_unavailable) score -= 20;
```

Reject:

```ts
if (timezone_status === "nonexistent") reject;
if (timezone_status === "invalid") reject;
if (!swiss_ephemeris_available) reject;
```

Clamp:

```ts
score = Math.max(0, Math.min(100, score));
```

Label:

```ts
const label =
  score >= 85 ? "high" :
  score >= 60 ? "medium" :
  "low";
```

---

## 29. Warnings

Modify `lib/astro/calculations/warnings.ts`.

### 29.1 Required warning codes

```ts
export type WarningCode =
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

### 29.2 Required emission rules

```ts
if (!birth_time_known || birth_time_precision === "unknown")
  emit("UNKNOWN_BIRTH_TIME");

if (["minute", "hour", "day_part"].includes(birth_time_precision))
  emit("APPROXIMATE_BIRTH_TIME");

if (timezone_status === "invalid")
  emit("INVALID_TIMEZONE");

if (timezone_status === "ambiguous")
  emit("AMBIGUOUS_TIMEZONE");

if (timezone_status === "nonexistent")
  emit("NONEXISTENT_LOCAL_TIME");

if (planet.near_sign_boundary)
  emit("NEAR_SIGN_BOUNDARY");

if (placement.near_nakshatra_boundary)
  emit("NEAR_NAKSHATRA_BOUNDARY");

if (placement.near_pada_boundary)
  emit("NEAR_PADA_BOUNDARY");

if (moon.near_nakshatra_boundary)
  emit("MOON_NEAR_NAKSHATRA_BOUNDARY");

if (lagna.near_sign_boundary)
  emit("LAGNA_NEAR_SIGN_BOUNDARY");

if (Math.abs(latitude) >= 66.0)
  emit("HIGH_LATITUDE_ASCENDANT_INSTABILITY");

if (!panchang)
  emit("UNAVAILABLE_PANCHANG");

if (!daily_transits)
  emit("UNAVAILABLE_DAILY_TRANSIT");

if (yoga.status !== "calculated")
  emit("UNAVAILABLE_YOGA");

if (dosha.status !== "calculated")
  emit("UNAVAILABLE_DOSHA");

if (unsupported_mode)
  emit("UNSUPPORTED_CALCULATION_MODE");

if (!swiss_ephemeris_available)
  emit("UNAVAILABLE_SWISS_EPHEMERIS");
```

### 29.3 Deduplication

```ts
export function warningKey(w: WarningResult): string {
  return `${w.code}:${w.field}:${w.calculation_section}`;
}

export function deduplicateWarnings(warnings: WarningResult[]): WarningResult[] {
  const map = new Map<string, WarningResult>();

  for (const warning of warnings) {
    const key = warningKey(warning);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, warning);
      continue;
    }

    map.set(key, {
      ...existing,
      severity: higherSeverity(existing.severity, warning.severity),
      evidence: {
        ...existing.evidence,
        duplicate_evidence: [
          ...(Array.isArray(existing.evidence.duplicate_evidence)
            ? existing.evidence.duplicate_evidence
            : []),
          warning.evidence
        ]
      }
    });
  }

  return [...map.values()];
}
```

---

## 30. Final Master Output Assembly

Modify `lib/astro/engine/real.ts`.

### 30.1 Required assembly pseudocode

```ts
export async function calculateMasterAstroOutput(args: {
  input: BirthInput;
  settings?: AstroCalculationSettings;
  runtime: {
    current_utc: string;
    production: boolean;
    user_id?: string;
    profile_id?: string;
  };
}): Promise<MasterAstroCalculationOutput> {
  const schema_version = "master_astro_calculation_output.v1";

  const input = validateBirthInput(args.input);
  const input_use = buildInputUse();

  const birth_time_result = convertBirthTimeToUTC({ input });

  const julian_day = calculateJulianDay({
    birth_utc: birth_time_result.birth_utc,
    production: args.runtime.production
  });

  const startup_validation_result = await runStartupValidation();
  const engine_boot_diagnostics = getEngineBootDiagnostics();
  const ephemeris_range_metadata = getEphemerisRangeMetadata();

  if (args.runtime.production && !startup_validation_result.passed) {
    return buildRejectedOutput({
      reason: "STARTUP_VALIDATION_FAILED",
      input_use,
      birth_time_result,
      startup_validation_result,
      engine_boot_diagnostics,
      ephemeris_range_metadata
    });
  }

  assertEphemerisRange(julian_day.jd_ut, ephemeris_range_metadata);

  const ayanamsa = calculateAyanamsa({ jd_ut: julian_day.jd_ut });

  const external_engine_metadata = buildExternalEngineMetadata({
    node_type: "mean_node",
    sidereal_method: "tropical_minus_ayanamsa"
  });

  const constants_version = buildConstantSetVersion();

  const planetary_positions = calculateAllPlanets({
    jd_ut: julian_day.jd_ut,
    ayanamsa_degrees: ayanamsa.value_degrees,
    node_type: "mean_node",
    sidereal_method: "tropical_minus_ayanamsa"
  });

  const sun_position = planetary_positions.Sun;
  const moon_position = planetary_positions.Moon;
  const mercury_position = planetary_positions.Mercury;
  const venus_position = planetary_positions.Venus;
  const mars_position = planetary_positions.Mars;
  const jupiter_position = planetary_positions.Jupiter;
  const saturn_position = planetary_positions.Saturn;
  const rahu_position = planetary_positions.Rahu;
  const ketu_position = planetary_positions.Ketu;

  const sun_sign = calculateSign(sun_position.sidereal_longitude);
  const moon_sign = calculateSign(moon_position.sidereal_longitude);
  const nakshatra = calculateNakshatra(moon_position.sidereal_longitude);
  const pada = nakshatra.pada;

  const tithi = calculateTithi({
    moon_sidereal_longitude: moon_position.sidereal_longitude,
    sun_sidereal_longitude: sun_position.sidereal_longitude
  });

  const lagna = calculateLagna({
    jd_ut: julian_day.jd_ut,
    latitude: input.latitude,
    longitude: input.longitude,
    birth_time_known: input.birth_time_known,
    birth_time_precision: input.birth_time_precision,
    birth_time_uncertainty_seconds:
      birth_time_result.birth_time_uncertainty_seconds,
    ayanamsa_degrees: ayanamsa.value_degrees,
    sidereal_method: "tropical_minus_ayanamsa"
  });

  const whole_sign_houses = calculateWholeSignHouses(lagna);

  const d1_rashi_chart = calculateRashiChart({
    planets: planetary_positions,
    lagna,
    houses: whole_sign_houses
  });

  const navamsa_d9 = calculateNavamsaChart({
    planets: planetary_positions,
    lagna
  });

  const vimshottari_dasha = calculateVimshottariDasha({
    moon_sidereal_longitude: moon_position.sidereal_longitude,
    birth_utc: birth_time_result.birth_utc,
    current_utc: args.runtime.current_utc
  });

  const panchang = await calculatePanchang({
    local_date: input.birth_date,
    timezone: input.timezone,
    latitude: input.latitude,
    longitude: input.longitude,
    birth_or_reference_utc: birth_time_result.birth_utc,
    ayanamsa_degrees: ayanamsa.value_degrees,
    node_type: "mean_node"
  });

  const daily_transits = await calculateDailyTransits({
    current_utc: args.runtime.current_utc,
    ayanamsa_degrees: ayanamsa.value_degrees,
    natal_planets: planetary_positions,
    natal_lagna: lagna,
    node_type: "mean_node"
  });

  const planetary_aspects_drishti = calculateGrahaDrishti({
    d1_chart: d1_rashi_chart,
    houses: whole_sign_houses,
    include_node_special_aspects: false
  });

  const strength_weakness_indicators = calculateStrengthWeakness({
    planets: planetary_positions,
    d1_chart: d1_rashi_chart,
    navamsa: navamsa_d9,
    aspects: planetary_aspects_drishti,
    production: args.runtime.production
  });

  const yogas = calculateYogas({
    d1_chart: d1_rashi_chart,
    navamsa: navamsa_d9,
    aspects: planetary_aspects_drishti,
    strength: strength_weakness_indicators,
    tradition_settings: constants_version.tradition_settings
  });

  const doshas = calculateDoshas({
    d1_chart: d1_rashi_chart,
    navamsa: navamsa_d9,
    aspects: planetary_aspects_drishti,
    tradition_settings: constants_version.tradition_settings
  });

  const life_area_signatures = calculateLifeAreaSignatures({
    houses: whole_sign_houses,
    d1_chart: d1_rashi_chart,
    aspects: planetary_aspects_drishti,
    strength: strength_weakness_indicators,
    lagna
  });

  const preliminary_warnings = collectWarnings({
    input,
    birth_time_result,
    planetary_positions,
    moon_nakshatra: nakshatra,
    lagna,
    panchang,
    daily_transits,
    yogas,
    doshas,
    swiss_ephemeris_available:
      engine_boot_diagnostics.swiss_ephemeris_library_loaded
  });

  const confidence = calculateConfidence({
    birth_time_known: input.birth_time_known,
    birth_time_precision: input.birth_time_precision,
    timezone_status: birth_time_result.timezone_status,
    moon_near_nakshatra_boundary: nakshatra.near_nakshatra_boundary,
    lagna_near_sign_boundary: lagna?.degrees_in_sign !== undefined
      ? calculateSign(lagna.sidereal_longitude).near_sign_boundary
      : false,
    any_planet_near_sign_boundary: Object.values(planetary_positions).some(
      p => calculateSign(p.sidereal_longitude).near_sign_boundary
    ),
    high_latitude_ascendant_instability: Math.abs(input.latitude) >= 66,
    panchang_sunrise_unavailable: !panchang?.sunrise_utc,
    swiss_ephemeris_available:
      engine_boot_diagnostics.swiss_ephemeris_library_loaded
  });

  const warnings = deduplicateWarnings(preliminary_warnings);

  const core_natal_summary = {
    ascendant: lagna,
    sun_sign,
    moon_sign,
    moon_nakshatra: nakshatra,
    birth_tithi: tithi,
    dasha_at_birth: vimshottari_dasha
      ? {
          lord: vimshottari_dasha.birth_dasha_lord,
          elapsed_years: vimshottari_dasha.dasha_elapsed_years,
          remaining_years: vimshottari_dasha.dasha_remaining_years
        }
      : null,
    confidence,
    warnings
  };

  const unsupported_fields = collectUnsupportedFields({
    yogas,
    doshas,
    strength_weakness_indicators,
    panchang,
    daily_transits,
    lagna
  });

  const prediction_ready_context = buildPredictionReadyContext({
    external_engine_metadata,
    constants_version,
    core_natal_summary,
    planet_positions: planetary_positions,
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
    unsupported_fields
  });

  assertNoForbiddenPredictionKeys(prediction_ready_context);

  const validation_results = runValidationSuite({
    output_parts: {
      planetary_positions,
      ayanamsa,
      lagna,
      panchang,
      vimshottari_dasha
    }
  });

  const outputWithoutSchemaValidation: MasterAstroCalculationOutput = {
    schema_version,
    calculation_status: "calculated",
    input_use,
    birth_time_result,
    julian_day,
    ayanamsa,
    external_engine_metadata,
    constants_version,
    planetary_positions,
    sun_position,
    moon_position,
    mercury_position,
    venus_position,
    mars_position,
    jupiter_position,
    saturn_position,
    rahu_position,
    ketu_position,
    sun_sign,
    moon_sign,
    nakshatra,
    pada,
    tithi,
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
    prediction_ready_context,
    core_natal_summary,
    panchang,
    daily_transits,
    confidence,
    warnings,
    validation_results,
    engine_boot_diagnostics,
    ephemeris_range_metadata,
    startup_validation_result
  };

  const calculation_status = determineCalculationStatus(outputWithoutSchemaValidation);

  const output = {
    ...outputWithoutSchemaValidation,
    calculation_status,
    openapi_schema_validation:
      validateMasterOutputSchema(outputWithoutSchemaValidation)
  };

  return output;
}
```

### 30.2 Status logic

```ts
export function determineCalculationStatus(
  output: MasterAstroCalculationOutput
): "calculated" | "partial" | "rejected" {
  if (output.confidence.rejected) return "rejected";
  if (output.rejection_reason) return "rejected";

  const nonFatalUnavailable =
    output.lagna === null ||
    output.whole_sign_houses.length === 0 ||
    output.panchang === null ||
    output.daily_transits === null ||
    output.yogas.some(y => y.status !== "calculated") ||
    output.doshas.some(d => d.status !== "calculated") ||
    output.validation_results.some(v => !v.passed);

  return nonFatalUnavailable ? "partial" : "calculated";
}
```

Fatal conditions must set `rejection_reason`.

---

## 31. Route Implementation

Modify `app/api/astro/v1/calculate/route.ts`.

### 31.1 Required route behavior

The route must:

1. Authenticate user.
2. Load/decrypt birth profile.
3. Convert decrypted payload to `BirthInput`.
4. Call `calculateMasterAstroOutput`.
5. Persist complete output.
6. Return complete output.

### 31.2 Remove route-level calculations

Delete route-level calls to:

```txt
calculateDailyTransits()
calculatePanchang()
calculateCurrentTiming()
calculateNavamsa()
calculateAspects()
calculateLifeAreaSignatures()
```

The engine must own all calculations.

### 31.3 Required response

Return:

```ts
return NextResponse.json(output, {
  status: output.calculation_status === "rejected" ? 422 : 200
});
```

Optionally include cache metadata only if it does not break schema. Preferred:

```ts
return NextResponse.json(output, ...)
```

If cache metadata is needed, persist it internally, not in the calculation output.

---

## 32. Persistence

Modify `lib/astro/chart-json.ts` and any Supabase persistence code.

### 32.1 Store complete output

Persist:

```txt
master_output
schema_version
calculation_status
warnings
confidence
validation_results
engine_boot_diagnostics
startup_validation_result
ephemeris_range_metadata
openapi_schema_validation
```

### 32.2 Avoid sensitive leakage

Do not store raw decrypted birth input inside:

```txt
prediction_ready_context
core_natal_summary
chart JSON derived sections
```

If raw data must be stored elsewhere for product reasons, it must remain encrypted and outside calculation context.

---

## 33. Schema Validation

Add:

```txt
lib/astro/schema/master-output.schema.ts
lib/astro/schema/validate-master-output.ts
```

Use `zod` if already installed. If AJV is preferred, add it, but `zod` is sufficient for in-code validation.

### 33.1 Required function

```ts
export function validateMasterOutputSchema(
  output: unknown
): OpenApiSchemaValidationResult
```

### 33.2 Required checks

Schema must assert:

```txt
all required top-level keys exist
calculation_status enum exact
planetary_positions contains Sun Moon Mercury Venus Mars Jupiter Saturn Rahu Ketu
singular planet fields exist
required arrays are arrays
required maps are maps
nullable fields are nullable only where allowed
validation_results exists
prediction_ready_context exists
prediction_ready_context forbidden keys absent
```

---

## 34. Tests

### 34.1 Required unit test files

Create or update:

```txt
tests/astro/unit/time.test.ts
tests/astro/unit/julian-day.test.ts
tests/astro/unit/ayanamsa.test.ts
tests/astro/unit/planets.test.ts
tests/astro/unit/sign.test.ts
tests/astro/unit/nakshatra.test.ts
tests/astro/unit/tithi.test.ts
tests/astro/unit/lagna.test.ts
tests/astro/unit/houses.test.ts
tests/astro/unit/rashi-chart.test.ts
tests/astro/unit/navamsa.test.ts
tests/astro/unit/dasha.test.ts
tests/astro/unit/panchang.test.ts
tests/astro/unit/transits.test.ts
tests/astro/unit/aspects.test.ts
tests/astro/unit/yogas.test.ts
tests/astro/unit/doshas.test.ts
tests/astro/unit/strength.test.ts
tests/astro/unit/life-areas.test.ts
tests/astro/unit/confidence.test.ts
tests/astro/unit/warnings.test.ts
```

### 34.2 Required integration test files

```txt
tests/astro/integration/master-output.test.ts
tests/astro/integration/route-calculate.test.ts
```

### 34.3 Required schema/security test files

```txt
tests/astro/schema/master-output-schema.test.ts
tests/astro/security/prediction-context-forbidden-keys.test.ts
```

### 34.4 Required reference test files

```txt
tests/astro/reference/swiss-reference.test.ts
tests/astro/reference/panchang-reference.test.ts
tests/astro/reference/dasha-reference.test.ts
```

### 34.5 Mandatory test cases

Add fixtures for:

```txt
India birth, no DST
US birth during DST
US ambiguous DST fall-back
US nonexistent DST spring-forward
Europe historical timezone
unknown birth time
exact sign boundary
exact nakshatra boundary
high latitude
southern hemisphere
leap day
old historical birth date
latitude 0
longitude 0
```

### 34.6 Swiss tolerances

Use these tolerances:

```txt
Sun longitude <= 0.01°
Moon longitude <= 0.01°
Mercury longitude <= 0.01°
Venus longitude <= 0.01°
Mars longitude <= 0.01°
Jupiter longitude <= 0.01°
Saturn longitude <= 0.01°
Rahu/Ketu <= 0.01°
Lahiri ayanamsa <= 0.001°
Lagna <= 0.05°
```

### 34.7 Required test commands

After implementation, run:

```bash
npm run typecheck
npm run lint
npm run test
```

If package scripts differ, inspect `package.json` and run the equivalent commands.

Do not stop with failing tests unless a required external dependency is missing and the failure is clearly documented.

---

## 35. Implementation Order for Codex

Follow this sequence to reduce breakage:

1. Inspect `package.json` and existing astro files.
2. Add/split canonical types under `lib/astro/types/*`.
3. Fix constants.
4. Implement `tithi.ts`.
5. Fix sign/nakshatra boundary behavior.
6. Fix Swiss checked wrappers and diagnostics.
7. Fix timezone validation.
8. Fix Julian Day validation.
9. Fix ayanamsa.
10. Fix planets, especially Ketu and Moshier rejection.
11. Fix Lagna.
12. Fix houses.
13. Add `rashi-chart.ts`.
14. Fix Navamsa boundary.
15. Add/refactor Dasha.
16. Rebuild Panchang.
17. Fix Daily Transits.
18. Fix Aspects.
19. Limit Yogas to audited/unsupported structured output.
20. Limit Doshas to audited/unsupported structured output.
21. Fix Strength/Weakness production-safe indicators.
22. Fix Life Areas.
23. Add Prediction Context.
24. Fix Confidence.
25. Fix Warnings.
26. Assemble `calculateMasterAstroOutput`.
27. Replace route behavior.
28. Add schema validation.
29. Update persistence.
30. Add tests.
31. Run typecheck/lint/tests.
32. Fix all failures.

---

## 36. Acceptance Criteria

Implementation is complete only when all items pass.

### Build and type safety

- [ ] TypeScript compiles.
- [ ] Lint passes.
- [ ] Tests pass.
- [ ] No production code depends on `stub` calculation output.
- [ ] No production code uses `status: "real"` as final calculation status.
- [ ] No production code uses lowercase planet keys internally.

### Route behavior

- [ ] `app/api/astro/v1/calculate/route.ts` returns `MasterAstroCalculationOutput`.
- [ ] Route returns `422` for rejected calculations.
- [ ] Route returns `200` for calculated or partial calculations.
- [ ] Route does not run legacy adapters.
- [ ] Route persists complete master output.

### Swiss Ephemeris

- [ ] Swiss Ephemeris required in production.
- [ ] Moshier fallback rejected in production.
- [ ] Startup validation implemented.
- [ ] Swiss version captured.
- [ ] Ephemeris path captured.
- [ ] Ephemeris files readable.
- [ ] Ephemeris file hashes captured when possible.
- [ ] Lahiri mode set.
- [ ] Fixed Sun/Moon/node calls pass.
- [ ] Ayanamsa call passes.
- [ ] Houses/ascendant call passes.
- [ ] Rise/set call passes or validated equivalent exists.
- [ ] Ephemeris range checked before every astronomical call.

### Timezone/input

- [ ] Invalid birth date rejected.
- [ ] Invalid birth time rejected.
- [ ] Invalid coordinates rejected.
- [ ] Unsupported calendar rejected.
- [ ] Invalid timezone rejected.
- [ ] Nonexistent local time rejected.
- [ ] Ambiguous local time rejected unless explicit disambiguation exists.
- [ ] Unknown birth time uses noon only as placeholder.
- [ ] Unknown birth time makes Lagna/time-sensitive outputs unavailable/degraded.

### Calculations

- [ ] Sun calculated.
- [ ] Moon calculated.
- [ ] Mercury calculated.
- [ ] Venus calculated.
- [ ] Mars calculated.
- [ ] Jupiter calculated.
- [ ] Saturn calculated.
- [ ] Rahu calculated.
- [ ] Ketu derived from Rahu.
- [ ] Ketu speed equals Rahu speed.
- [ ] Ketu retrograde equals `ketu_speed_longitude < 0`.
- [ ] Sign/rashi correct.
- [ ] Nakshatra/pada correct.
- [ ] Tithi correct.
- [ ] Lagna correct or unavailable.
- [ ] Whole-sign houses correct.
- [ ] D1/Rashi chart correct.
- [ ] D9/Navamsa correct.
- [ ] Vimshottari dasha correct.
- [ ] Panchang sunrise-based.
- [ ] Daily transits Swiss-derived.
- [ ] Graha drishti rule-based.
- [ ] Yogas rule-based only.
- [ ] Doshas rule-based only.
- [ ] Strength/weakness rule-based only.
- [ ] Life-area signatures structured and non-interpretive.

### Schema/output

- [ ] Final output includes `validation_results`.
- [ ] Final output includes `engine_boot_diagnostics`.
- [ ] Final output includes `ephemeris_range_metadata`.
- [ ] Final output includes `startup_validation_result`.
- [ ] Final output includes `openapi_schema_validation`.
- [ ] Final output includes singular planet fields:
  - [ ] `sun_position`
  - [ ] `moon_position`
  - [ ] `mercury_position`
  - [ ] `venus_position`
  - [ ] `mars_position`
  - [ ] `jupiter_position`
  - [ ] `saturn_position`
  - [ ] `rahu_position`
  - [ ] `ketu_position`
- [ ] Final output validates against schema.
- [ ] `calculation_status` is exactly `calculated`, `partial`, or `rejected`.

### Privacy

- [ ] `prediction_ready_context` excludes `birth_date`.
- [ ] `prediction_ready_context` excludes `birth_time`.
- [ ] `prediction_ready_context` excludes `latitude`.
- [ ] `prediction_ready_context` excludes `longitude`.
- [ ] `prediction_ready_context` excludes `encrypted_birth_data`.
- [ ] `prediction_ready_context` excludes `data_consent_version`.
- [ ] `prediction_ready_context` excludes `profile_id`.
- [ ] `prediction_ready_context` excludes `user_id`.
- [ ] Recursive forbidden-key test passes.

### No interpretation text

- [ ] No calculation module emits prediction prose.
- [ ] No yoga result contains vague interpretive text.
- [ ] No dosha result contains vague interpretive text.
- [ ] No strength result contains vague interpretive text.
- [ ] All rule outputs include evidence.

---

## 37. Final Instruction to Codex

Implement this file completely.

Do not skip sections.

Do not replace Swiss Ephemeris with simplified astronomy.

Do not invent formulas.

Do not output interpretation text.

Do not leave production stubs.

Do not keep route-level legacy calculation adapters.

Do not return only calculation IDs from the v1 route.

Make the final v1 route produce `MasterAstroCalculationOutput` exactly as specified by `calculations.md` Section 29.

Run typecheck, lint, and tests. Fix all failures.
