# Astro Calculations Project Implementation Plan

Source specification: `/Users/jyotishko/Desktop/ASTRO_CALCULATIONS_IMPLEMENTATION_PLAN.md`

Target project: `/Users/jyotishko/Documents/kaalbhairav`

Last repo inspection: 2026-04-26

## 1. Goal

Implement the attached calculation-only Vedic/Jyotish engine specification in the existing Astro V1 system.

This is a calculation-layer replacement plan, not a full app rewrite. The old/partial astrology calculation logic should be replaced by the master spec implementation, but the existing product infrastructure should be reused where it is still correct.

The end state is a production calculation backend that:

- uses a validated Swiss Ephemeris-grade astronomical engine instead of the current partial `ephemeris@2.2.0` path;
- preserves the existing Astro V1 privacy boundary;
- keeps raw birth data encrypted and out of LLM prediction payloads;
- produces a complete, traceable calculation output aligned with the specification's `MasterAstroCalculationOutput`;
- stores versioned chart JSON in the existing Supabase Astro V1 tables;
- supports deterministic validation against reference fixtures before enabling production real calculations.

This plan is implementation guidance only. It does not replace the master calculation specification.

## 1.1 Replacement Scope

Replace completely:

- the current `ASTRO_ENGINE_MODE=real` implementation in `lib/astro/engine/real.ts`;
- the current Moshier/`ephemeris@2.2.0` calculation path;
- approximate timezone-to-UTC conversion used for birth calculations;
- coordinate rounding as a calculation input;
- partial placeholder implementations for Panchang, transits, timing, yogas, doshas, strength, and final output assembly;
- broad approximate tests that only check signs or non-empty output.

Preserve and adapt:

- Astro V1 API/UI routes;
- Supabase encrypted profile and chart-version storage;
- `PII_ENCRYPTION_KEY` encryption flow;
- feature flags;
- auth checks and user ownership checks;
- input hashing and settings hashing, after updating them to use the master spec's calculation-affecting fields;
- chart JSON versioning, after adding the complete master output;
- prediction context and chat flow, while keeping it LLM-safe.

Do not preserve as authoritative:

- any old calculation value that does not come from Swiss Ephemeris, a validated equivalent, a formula/rule in the master spec, or an explicit unavailable status;
- any previous `real` engine result that cannot pass the Section 28 tolerance table;
- any output shape that conflicts with the Section 29 final calculation schema.

## 2. Current Repo State

Already present:

- Astro V1 feature-flagged API and UI surfaces:
  - `app/api/astro/*`
  - `app/api/astro/v1/*`
  - `app/astro/*`
  - `app/astro/v1/*`
- Encrypted birth profile storage:
  - `lib/astro/encryption.ts`
  - Supabase `birth_profiles.encrypted_birth_data`
- Input normalization and hashing:
  - `lib/astro/normalize.ts`
  - `lib/astro/hashing.ts`
- Chart JSON assembly and prediction context:
  - `lib/astro/chart-json.ts`
  - `lib/astro/prediction-context.ts`
- Engine abstraction:
  - `lib/astro/engine/index.ts`
  - `lib/astro/engine/real.ts`
  - `lib/astro/engine/version.ts`
  - `lib/astro/engine/types.ts`
- Partial calculation modules:
  - `lib/astro/calculations/navamsa.ts`
  - `lib/astro/calculations/aspects.ts`
  - `lib/astro/calculations/life-areas.ts`
  - `lib/astro/calculations/panchang.ts`
  - `lib/astro/calculations/timing.ts`
  - `lib/astro/calculations/transits.ts`
- Security and engine tests:
  - `tests/astro/security.test.ts`
  - `tests/astro/engine-real.test.ts`

Important current gaps to replace or complete:

- `ASTRO_ENGINE_MODE=real` currently uses `ephemeris@2.2.0`, Moshier-style calculations, and internal approximate helpers. The master spec requires Swiss Ephemeris or an equivalent validated astronomical engine.
- `normalizeBirthInput` rounds coordinates before calculation. The master spec requires retaining full supplied numeric precision for calculation.
- Timezone conversion currently uses an `Intl.DateTimeFormat` offset approximation. The master spec requires explicit IANA validation, ambiguous/nonexistent local-time handling, and deterministic UTC conversion.
- Current real engine does not calculate all required fields:
  - complete Panchang;
  - daily transits;
  - full Vimshottari Mahadasha, Antardasha, Pratyantardasha;
  - yogas;
  - doshas;
  - strength/weakness indicators;
  - complete validation metadata;
  - complete Section 29 output schema.
- Current tests assert broad availability and approximate signs, but do not enforce the master tolerance table.
- Current chart JSON shape is compatible with the product, but not yet the full master output contract.

## 3. Non-Negotiable Constraints

Keep these constraints throughout every phase:

- Do not expose raw birth date, birth time, birth place, latitude, longitude, or encrypted birth payloads to the LLM.
- Keep raw birth data encrypted at rest.
- Keep Astro V1 behind feature flags until validation gates pass.
- Do not add destructive SQL migrations.
- Do not silently replace unsupported calculations with invented values.
- Every unavailable field must include an explicit status/reason.
- Every calculated field must trace back to:
  - a Swiss Ephemeris call;
  - a deterministic formula from the master spec;
  - a versioned rule object;
  - or an explicit unavailable status.

## 4. Target Architecture

Add a layered calculation engine under `lib/astro`.

Recommended module layout:

```txt
lib/astro/
  engine/
    index.ts
    real.ts
    version.ts
    diagnostics.ts
    validation.ts
    swiss.ts
    types.ts
  calculations/
    constants.ts
    math.ts
    input-use.ts
    time.ts
    julian-day.ts
    ayanamsa.ts
    planets.ts
    sign.ts
    nakshatra.ts
    tithi.ts
    lagna.ts
    houses.ts
    d1.ts
    navamsa.ts
    vimshottari.ts
    panchang.ts
    transits.ts
    aspects.ts
    yogas.ts
    doshas.ts
    strength.ts
    life-areas.ts
    prediction-ready.ts
    confidence.ts
    warnings.ts
    boundary.ts
    output.ts
  schemas/
    master-output.ts
```

Testing layout:

```txt
tests/astro/
  fixtures/
    reference-cases.ts
    swiss-reference-values.ts
  calculations/
    time.test.ts
    julian-day.test.ts
    ayanamsa.test.ts
    planets.test.ts
    derived-placements.test.ts
    panchang.test.ts
    vimshottari.test.ts
    output-schema.test.ts
    privacy-boundary.test.ts
  engine-real.test.ts
  security.test.ts
```

## 5. Implementation Phases

### Phase 0: Engine Decision and Release Gate

Purpose: choose and verify the production astronomical backend before rewriting calculations around it.

Tasks:

- Select an audited Swiss Ephemeris binding or wrapper that works in the Next.js Node runtime.
- Confirm license obligations for production use.
- Confirm Vercel deployment compatibility:
  - native binary support, if any;
  - ephemeris file bundling;
  - serverless file path access;
  - cold-start cost;
  - build output size.
- Add an engine boot diagnostic module:
  - `lib/astro/engine/diagnostics.ts`
- Add startup validation surface:
  - `lib/astro/engine/validation.ts`
- Capture:
  - engine package name;
  - engine version;
  - Swiss Ephemeris version;
  - ephemeris file path/hash/version;
  - sidereal mode;
  - supported date range;
  - timezone engine version when available.

Acceptance criteria:

- `runEngine` cannot return production real output if engine boot validation fails.
- Failure returns `calculation_status: "failed"` or mapped rejected/partial status with a clear reason.
- Existing stub mode still works.
- Existing tests continue to pass.

### Phase 1: Contract Types and Schema

Purpose: add the master calculation output contract without disrupting existing chart storage.

Tasks:

- Add TypeScript types for the Section 29 output schema in `lib/astro/engine/types.ts` or a new `lib/astro/calculations/output.ts`.
- Add an internal `MasterAstroCalculationOutput` type with:
  - `schema_version`;
  - `calculation_status`;
  - `input_use`;
  - `birth_time_result`;
  - `julian_day`;
  - `ayanamsa`;
  - `external_engine_metadata`;
  - `constants_version`;
  - `planetary_positions`;
  - `lagna`;
  - `whole_sign_houses`;
  - `d1_rashi_chart`;
  - `navamsa_d9`;
  - `vimshottari_dasha`;
  - `planetary_aspects_drishti`;
  - `yogas`;
  - `doshas`;
  - `strength_weakness_indicators`;
  - `life_area_signatures`;
  - `prediction_ready_context`;
  - `core_natal_summary`;
  - `panchang`;
  - `daily_transits`;
  - `confidence`;
  - `warnings`;
  - `validation_results`;
  - diagnostic fields.
- Add explicit unavailable status types for all optional/degraded fields.
- Keep the existing `ChartJson` product contract, but embed or map the master output into it.
- Add a schema validation helper:
  - `lib/astro/schemas/master-output.ts`

Acceptance criteria:

- Typecheck passes with the new types.
- Existing API routes compile unchanged or with narrow adapter changes.
- Tests assert that all required top-level Section 29 keys exist in generated real-output fixtures.

### Phase 2: Input Validation and Normalization

Purpose: make calculation input exact, validated, and deterministic.

Tasks:

- Split privacy-safe display normalization from calculation normalization.
- Preserve full precision latitude and longitude for calculation.
- Keep rounded or redacted values only for safe chart summaries and LLM-safe context.
- Validate:
  - Gregorian `YYYY-MM-DD`;
  - `HH:MM` or `HH:MM:SS`;
  - `birth_time_known` consistency;
  - coordinate ranges;
  - IANA timezone;
  - `calendar_system === "gregorian"`.
- Add `input_use` output:
  - fields used for astronomical calculation;
  - fields excluded from astronomical calculation.
- Implement unknown-time policy:
  - no authoritative Lagna;
  - no authoritative house placements;
  - degraded confidence;
  - warning list includes affected calculations.

Files to modify:

- `lib/astro/types.ts`
- `lib/astro/normalize.ts`
- `lib/astro/chart-json.ts`
- `tests/astro/security.test.ts`
- new `tests/astro/calculations/input-validation.test.ts`

Acceptance criteria:

- Invalid date, invalid time, invalid timezone, and invalid coordinates are rejected before engine calls.
- `display_name`, `birth_place_name`, `gender`, and `data_consent_version` do not affect calculation hashes.
- Prediction context remains free of raw birth date/time/place/coordinates.

### Phase 3: Timezone and Julian Day

Purpose: replace the current `Intl` offset approximation with an audited local civil time to UTC pipeline.

Tasks:

- Add `lib/astro/calculations/time.ts`.
- Convert local civil birth time to UTC using an audited IANA timezone library or platform API with explicit ambiguity handling.
- Detect and handle:
  - nonexistent DST spring-forward local times;
  - ambiguous DST fall-back local times;
  - historical timezone offsets;
  - unknown birth time.
- Add `BirthTimeResult`.
- Add `lib/astro/calculations/julian-day.ts`.
- Calculate Julian Day UT from UTC instant.

Acceptance criteria:

- Mandatory cases pass:
  - India birth, no DST;
  - US DST date;
  - US ambiguous DST fall-back;
  - US nonexistent DST spring-forward;
  - Europe historical timezone;
  - leap day;
  - longitude 0;
  - latitude 0.
- UTC and JD values are compared against fixed reference fixtures.

### Phase 4: Constants, Boundary Rules, and Derived Placement Helpers

Purpose: centralize all deterministic constants and placement formulas.

Tasks:

- Add `lib/astro/calculations/constants.ts`.
- Add `lib/astro/calculations/math.ts`.
- Add `lib/astro/calculations/boundary.ts`.
- Define versioned constants:
  - signs;
  - nakshatras;
  - padas;
  - tithis;
  - yogas;
  - karanas;
  - Vimshottari order and year lengths;
  - graha names;
  - sign lords;
  - special drishti offsets;
  - boundary threshold `1 / 60` deg.
- Implement helpers:
  - `normalize360`;
  - angular difference;
  - sign placement;
  - nakshatra placement;
  - pada;
  - boundary warning detection.

Acceptance criteria:

- Derived sign, nakshatra, pada, tithi, yoga, and karana boundaries emit warnings within threshold.
- Boundary checks use raw unrounded values.

### Phase 5: Swiss Ephemeris Astronomical Core

Purpose: replace the current partial real engine calculations with validated Swiss Ephemeris calls.

Tasks:

- Add `lib/astro/engine/swiss.ts` as the only low-level wrapper around Swiss Ephemeris.
- Implement calls or wrapper functions for:
  - sidereal mode initialization;
  - `swe_calc_ut` equivalent for Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Rahu, Ketu;
  - `swe_get_ayanamsa_ut`;
  - `swe_houses_ex` equivalent for Lagna;
  - `swe_rise_trans` or validated rise/set equivalent for Panchang sunrise/sunset.
- Return raw double precision values:
  - tropical longitude;
  - sidereal longitude;
  - speed;
  - retrograde flag;
  - calculation flags;
  - warning/error metadata.
- Enforce ephemeris date range.
- Do not round values before downstream calculations.

Files to modify:

- `lib/astro/engine/real.ts`
- `lib/astro/engine/version.ts`
- `lib/astro/calculations/planets.ts`
- `lib/astro/calculations/ayanamsa.ts`
- `tests/astro/engine-real.test.ts`

Acceptance criteria:

- Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Rahu, and Ketu match reference values within `<= 0.01 deg`.
- Lahiri ayanamsa matches within `<= 0.001 deg`.
- Lagna matches within `<= 0.05 deg`.
- Engine metadata records Swiss Ephemeris version and ephemeris file details.

### Phase 6: Natal Chart Calculations

Purpose: complete the deterministic chart structures.

Tasks:

- Implement:
  - rashi/sign placements;
  - degrees within sign;
  - nakshatra and pada;
  - Lagna result;
  - whole-sign houses;
  - D1/Rashi chart placements;
  - D9/Navamsa placements.
- Update existing:
  - `lib/astro/calculations/navamsa.ts`
  - `lib/astro/calculations/aspects.ts`
  - `lib/astro/calculations/life-areas.ts`
- Add missing tests for exact placement formulas.

Acceptance criteria:

- Every planet has:
  - tropical longitude;
  - sidereal longitude;
  - speed;
  - sign;
  - degrees in sign;
  - nakshatra;
  - pada;
  - retrograde status.
- Unknown birth time returns `lagna: null` or explicitly unavailable, not a misleading authoritative noon Lagna.
- Whole-sign houses and house-dependent calculations are unavailable or degraded when birth time is unknown.

### Phase 7: Panchang

Purpose: implement Section 17 Panchang output.

Tasks:

- Complete `lib/astro/calculations/panchang.ts`.
- Calculate:
  - vara;
  - tithi;
  - paksha;
  - tithi completion percent;
  - yoga;
  - karana;
  - Moon rashi;
  - local Panchang date;
  - sunrise/sunset UTC;
  - sunrise/sunset warnings.
- Use Swiss Ephemeris rise/set or a validated equivalent.
- Add boundary warnings for tithi, yoga, and karana.

Acceptance criteria:

- Panchang fixtures match reference Panchang values exactly unless a boundary warning is present.
- Sunrise and sunset failures return explicit unavailable reasons.

### Phase 8: Vimshottari Timing

Purpose: replace the current simplified dasha sequence with complete timing output.

Tasks:

- Add or complete `lib/astro/calculations/vimshottari.ts`.
- Calculate:
  - birth Mahadasha lord;
  - elapsed and remaining birth balance;
  - Mahadasha sequence;
  - Antardasha sequence;
  - Pratyantardasha sequence;
  - current Mahadasha, Antardasha, and Pratyantardasha.
- Honor configured `dasha_year_basis`.
- Add boundary warning when Moon is near nakshatra boundary.

Acceptance criteria:

- Dasha lord and birth balance match reference Jyotish software fixtures.
- Current timing context is derived from stored dasha periods, not recalculated by the LLM.

### Phase 9: Rule-Based Jyotish Layers

Purpose: add deterministic rule layers without interpretation text.

Tasks:

- Implement or complete:
  - `lib/astro/calculations/aspects.ts`
  - `lib/astro/calculations/yogas.ts`
  - `lib/astro/calculations/doshas.ts`
  - `lib/astro/calculations/strength.ts`
  - `lib/astro/calculations/life-areas.ts`
- Store each rule result with evidence:
  - rule id;
  - rule version;
  - inputs used;
  - matched conditions;
  - affected planets/houses/signs;
  - confidence/warnings if applicable.
- Keep these as calculation facts, not interpretation prose.

Acceptance criteria:

- Every yoga, dosha, aspect, and strength result is explainable from evidence fields.
- Unsupported or tradition-dependent rules return explicit unavailable status unless a setting selects the tradition.

### Phase 10: Daily Transits

Purpose: implement Section 18 daily transit calculations.

Tasks:

- Complete `lib/astro/calculations/transits.ts`.
- Calculate current-day planetary positions using Swiss Ephemeris.
- Map transit sign and house relative to natal Lagna/houses when available.
- Add transit warnings for unavailable natal houses or unknown birth time.

Acceptance criteria:

- Daily transit output includes all required planets.
- Unknown birth time still returns sign-level transit facts but marks house transits unavailable.

### Phase 11: Confidence and Warnings

Purpose: implement Sections 25 and 26 as a single deterministic policy layer.

Tasks:

- Add `lib/astro/calculations/confidence.ts`.
- Add `lib/astro/calculations/warnings.ts`.
- Compute confidence from:
  - birth time precision;
  - timezone status;
  - coordinate confidence;
  - engine validation status;
  - boundary warnings;
  - high latitude;
  - unsupported fields;
  - tradition-dependent gaps.
- Normalize warning structure across all modules.

Acceptance criteria:

- Confidence is reproducible from the same inputs.
- Warnings list every degraded/unavailable calculation category.
- No warning is emitted only as free text when it should be structured.

### Phase 12: Prediction-Ready Context

Purpose: produce LLM-safe calculation context from calculated facts.

Tasks:

- Update `lib/astro/prediction-context.ts`.
- Add `prediction_ready_context` and `core_natal_summary` from the master output.
- Include:
  - calculated facts only;
  - chart identity;
  - confidence;
  - warnings;
  - unsupported fields;
  - strict LLM instructions.
- Exclude:
  - birth date;
  - birth time;
  - birth place;
  - latitude;
  - longitude;
  - encrypted payload;
  - raw calculation inputs.

Acceptance criteria:

- Existing privacy tests pass.
- New tests assert no raw birth values exist anywhere in `prediction_ready_context`.
- The LLM payload includes `do_not_recalculate_astrology: true`.

### Phase 13: Chart JSON and Supabase Persistence

Purpose: persist the complete calculation output without breaking existing product reads.

Tasks:

- Update `lib/astro/chart-json.ts` to store:
  - existing product fields;
  - master calculation output;
  - validation diagnostics;
  - engine metadata;
  - explicit unavailable statuses.
- Update calculation routes:
  - `app/api/astro/v1/calculate/route.ts`
  - decide whether legacy `app/api/astro/calculate/route.ts` should remain stub-compatible, call the same adapter, or be deprecated behind a flag.
- Keep schema additive.
- Do not add destructive SQL.
- If new columns are needed, add an additive Supabase migration.

Acceptance criteria:

- Existing chart reads still work.
- New chart versions include full master output.
- Cached calculations compare input hash, settings hash, engine version, ephemeris version, and schema version.

### Phase 14: Validation Suite and Production Gate

Purpose: enforce Section 28 before real calculations can be served.

Tasks:

- Add fixed reference fixtures for mandatory test cases.
- Add validation runner in `lib/astro/engine/validation.ts`.
- Add test suite for:
  - startup validation;
  - Swiss Ephemeris load status;
  - ephemeris path/file hash;
  - fixed calls for planets, ayanamsa, Lagna, rise/set;
  - output schema validation;
  - all tolerance-table items.
- Block production real mode if validation fails.

Mandatory cases:

- India birth, no DST.
- US birth during DST.
- US ambiguous DST fall-back.
- US nonexistent DST spring-forward.
- Europe historical timezone.
- Unknown birth time.
- Exact sign boundary.
- Exact nakshatra boundary.
- High latitude.
- Southern hemisphere.
- Leap day.
- Old historical birth date.
- Latitude 0.
- Longitude 0.

Acceptance criteria:

- `npm run test` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
- Validation failures prevent `calculation_status: "calculated"` output.

### Phase 15: Controlled Rollout

Purpose: enable production real calculations safely.

Tasks:

- Keep default as stub until validation is complete.
- Add a separate production flag if needed:
  - `ASTRO_ENGINE_MODE=real`
  - `ASTRO_REAL_ENGINE_VALIDATION_REQUIRED=true`
- Run validation in Preview first.
- Verify:
  - encrypted profile create;
  - calculate;
  - chart read;
  - prediction context read;
  - chat answer generation from supplied context;
  - no raw birth data in logs or LLM payloads.
- Only then enable production real mode.

Acceptance criteria:

- Preview validation complete.
- Production env vars set intentionally.
- Rollback path documented:
  - set `ASTRO_ENGINE_MODE=stub`;
  - keep existing chart versions;
  - prevent recalculation with invalid engine metadata.

## 6. Suggested Implementation Order

Use this exact order to avoid coupling problems:

1. Add master output types and schema.
2. Add constants, math, and boundary helpers.
3. Fix calculation input precision and validation.
4. Replace timezone conversion.
5. Add Swiss Ephemeris wrapper and diagnostics.
6. Replace planetary, ayanamsa, Lagna, and house calculations.
7. Complete D1 and D9.
8. Complete Panchang.
9. Complete Vimshottari.
10. Complete aspects, yogas, doshas, strength, and life areas.
11. Complete daily transits.
12. Update chart JSON and prediction context.
13. Add reference fixture validation.
14. Run full verification.
15. Enable Preview real mode, then production real mode.

## 7. Verification Commands

Run after each phase:

```bash
npm run test
npm run typecheck
npm run build
```

Run before any real-engine rollout:

```bash
ASTRO_ENGINE_MODE=real npm run test
ASTRO_ENGINE_MODE=real npm run typecheck
ASTRO_ENGINE_MODE=real npm run build
```

## 8. Done Definition

This implementation is done only when:

- the Section 29 output schema is generated for real calculations;
- every required output field is calculated, explicitly unavailable, or rejected with a reason;
- all Section 28 validation tolerances pass;
- startup validation blocks invalid real-engine output;
- no raw birth data enters prediction context or LLM payloads;
- chart JSON versions include engine, ephemeris, schema, settings, validation, confidence, and warning metadata;
- Preview and production rollout steps are completed under feature flags.

## 9. Manual Follow-Up Before Coding

Before implementing Phase 0, manually confirm:

- which Swiss Ephemeris binding/wrapper you want to use;
- whether its license is acceptable for this product;
- whether ephemeris files can be bundled and read in the Vercel runtime;
- whether real calculations should be enabled only for Preview first;
- where reference values for Section 28 fixtures will come from.
