<!--
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
-->

# Astro Calculation Integration Inventory

This inventory records the current repository layout and integration points for the TarayAI deterministic calculation integration. It is a mechanical inventory only. It does not change calculation behavior, API behavior, Supabase behavior, or LLM behavior.

## Runtime package and dependencies

| Item | Current state |
|---|---|
| package name | `kaalbhairav` |
| node engine | `22.x` |
| script: typecheck | present |
| script: lint | present |
| script: build | present |
| script: test | present |
| script: test:astro | present |
| dependency: luxon | present |
| dependency: sweph | present |
| dependency: ephemeris | present |
| package manager | npm (`package-lock.json` present) |

## Existing API routes

| Route purpose | Path | Exists |
|---|---|---|
| calculate | app/api/astro/v1/calculate/route.ts | yes |
| profile | app/api/astro/v1/profile/route.ts | yes |
| ask | app/api/astro/ask/route.ts | yes |
| v2 reading | app/api/astro/v2/reading/route.ts | yes |
| v1 chat | app/api/astro/v1/chat/route.ts | yes |

Observed route-level integration concerns from grep:
- `app/api/astro/v1/calculate/route.ts` and `app/api/astro/v1/chat/route.ts` both read `current_chart_version_id`.
- `app/api/astro/v1/calculate/route.ts` calls `persist_and_promote_current_chart_version`.
- `app/api/astro/v1/calculate/route.ts` references `chartVersionId` in persistence and diagnostic paths.
- `app/api/astro/v2/reading/route.ts` references `chartVersionId` in request-context parsing.
- `app/api/astro/v1/profile/route.ts` sets `current_chart_version_id` to `null` in profile flows.
- `body.chart`, `body.context`, `body.dasha`, and `body.transits` were not surfaced by the grep command in the targeted astro route set.

## Existing calculation files

| File | Exists | Notes |
|---|---:|---|
| lib/astro/calculations/time.ts | yes | exported time helpers observed |
| lib/astro/calculations/julian-day.ts | yes | exported Julian day helper observed |
| lib/astro/calculations/ayanamsa.ts | yes | exported ayanamsa helper observed |
| lib/astro/calculations/planets.ts | yes | exported planet helpers observed |
| lib/astro/calculations/lagna.ts | yes | exported lagna helper observed |
| lib/astro/calculations/houses.ts | yes | exported whole-sign house helper observed |
| lib/astro/calculations/nakshatra.ts | yes | exported nakshatra helper observed |
| lib/astro/calculations/panchang.ts | yes | exported panchang helper observed |
| lib/astro/calculations/vimshottari.ts | yes | exported vimshottari helper observed |
| lib/astro/calculations/doshas.ts | yes | exported dosha helper observed |
| lib/astro/calculations/master.ts | yes | exported master calculation entrypoint observed |

Additional calculation files present in this checkout:
- `lib/astro/calculations/aspects.ts`
- `lib/astro/calculations/boundary.ts`
- `lib/astro/calculations/confidence.ts`
- `lib/astro/calculations/constants.ts`
- `lib/astro/calculations/d1.ts`
- `lib/astro/calculations/life-areas.ts`
- `lib/astro/calculations/math.ts`
- `lib/astro/calculations/navamsa.ts`
- `lib/astro/calculations/runtime-clock.ts`
- `lib/astro/calculations/sign.ts`
- `lib/astro/calculations/strength.ts`
- `lib/astro/calculations/timing.ts`
- `lib/astro/calculations/tithi.ts`
- `lib/astro/calculations/transits.ts`
- `lib/astro/calculations/warnings.ts`
- `lib/astro/calculations/yogas.ts`

## Existing Swiss / VM engine files

| File | Exists | Notes |
|---|---:|---|
| lib/astro/engine/swiss.ts | yes | Swiss ephemeris engine adapter present |
| lib/astro/engine/types.ts | yes | engine type definitions present |
| lib/astro/engine/real.ts | yes | real-engine wrapper present |
| services/astro-engine/src/calculate.ts | yes | backend calculation service entrypoint present |
| ephe/sepl_18.se1 | yes | Swiss ephemeris data file |
| ephe/semo_18.se1 | yes | Swiss ephemeris data file |
| ephe/seas_18.se1 | yes | Swiss ephemeris data file |

## Existing Supabase persistence migrations

| File | Exists | Notes |
|---|---:|---|
| supabase/migrations/20260504000000_promote_current_chart_version_rpc.sql | yes | promotion RPC present |
| supabase/migrations/20260504123000_make_chart_persistence_fully_atomic.sql | yes | atomic persistence migration present |
| supabase/migrations/20260504124500_fix_atomic_chart_persistence_ambiguous_columns.sql | yes | follow-up fix migration present |

Grep observations:
- `current_chart_version_id` is present in app, lib, supabase, and tests.
- `persist_and_promote_current_chart_version` is present in the calculate route and both atomic persistence migrations.
- `p_calculation_id` appears in the persistence RPC and route call site.
- `p_calc_id` appears in the older promotion RPC migration.

## Existing tests to preserve

- `tests/astro/api/*`
- `tests/astro/app/*`
- `tests/astro/baseline/*`
- `tests/astro/benchmark/*`
- `tests/astro/calculations/*`
- `tests/astro/chart/*`
- `tests/astro/consultation/*`
- `tests/astro/conversation/*`
- `tests/astro/critic/*`
- `tests/astro/e2e/*`
- `tests/astro/engine/*`
- `tests/astro/evidence/*`
- `tests/astro/feature-flags.test.ts`
- `tests/astro/full-system-smoke.test.ts`
- `tests/astro/live-parity/*`
- `tests/astro/memory/*`
- `tests/astro/profile-chart-json-adapter.test.ts`
- `tests/astro/rag/*`
- `tests/astro/report/*`
- `tests/astro/rollout/*`
- `tests/astro/scripts/*`
- `tests/astro/safety/*`
- `tests/astro/synthesis/*`
- `tests/astro/ui/*`
- `tests/astro/validation/*`
- `tests/astro/voice/*`

## Existing types and exported symbols to preserve

| Source file | Exported symbols observed |
|---|---|
| lib/astro/calculations/time.ts | `BirthTimeValidationStatus`, `NormalizedBirthTime`, `TimezoneDisambiguation`, `BirthTimeResult`, `parseDateParts`, `parseTimeParts`, `getLocalTimestampCandidates`, `convertBirthTimeToUTC`, `detectDstStatus`, `normalizeBirthTimeForCalculation` |
| lib/astro/calculations/master.ts | `calculateMasterAstroOutput` |
| lib/astro/engine/types.ts | `CalcStatus`, `ZodiacSign`, `Nakshatra`, `PlanetName`, `TransitPlanet`, `DailyTransits`, `Tithi`, `PanchangYoga`, `PanchangKarana`, `Vara`, `Panchang`, `DashaPeriod`, `CurrentTimingContext`, `NavamsaPlanet`, `NavamsaD9`, `AspectType`, `Aspect`, `BasicAspects`, `LifeArea`, `LifeAreaSignature`, `LifeAreaSignatures`, `AstroExpandedSections` |
| lib/astro/chart-json.ts | `buildChartJson` |
| lib/astro/profile-chart-json-adapter.ts | `DailyTransitDisplayRow`, `DailyTransitDisplay`, `PanchangDisplayRow`, `PanchangDisplay`, `NavamsaDisplayRow`, `NavamsaDisplay`, `AspectDisplayRow`, `AspectDisplay`, `LifeAreaDisplayRow`, `LifeAreaDisplay`, `formatProfileChartStatus`, `buildProfileExpandedSectionsFromMasterOutput`, `buildProfileExpandedSectionsFromStoredChartJson`, `buildProfileChartJsonFromMasterOutput` |

## Missing files that later phases must create

| File | Exists | Notes |
|---|---:|---|
| lib/astro/calculations/contracts.ts | no | planned later-phase contract file |
| lib/astro/calculations/unavailable.ts | no | planned later-phase unavailable helper |
| lib/astro/calculations/provenance.ts | no | planned later-phase provenance helper |
| lib/astro/chart-json-v2.ts | no | planned later-phase chart JSON v2 module |
| lib/astro/calculations/coordinates.ts | no | planned later-phase coordinates helper |
| lib/astro/calculations/sidereal-time.ts | no | planned later-phase sidereal time helper |
| lib/astro/calculations/obliquity.ts | no | planned later-phase obliquity helper |
| lib/astro/calculations/ephemeris-provider.ts | no | planned later-phase ephemeris provider |
| lib/astro/calculations/ayanamsha-provider.ts | no | planned later-phase ayanamsha provider |
| lib/astro/calculations/longitude.ts | no | planned later-phase longitude helper |
| lib/astro/canonical-chart-json-adapter.ts | no | planned later-phase canonical adapter |

## Phase 1 validation commands

| Command | Status |
|---|---|
| `find app/api/astro -maxdepth 5 -type f | sort` | passed |
| `find lib/astro/calculations -maxdepth 1 -type f | sort` | passed |
| `find lib/astro/engine -maxdepth 1 -type f | sort` | passed |
| `find services -maxdepth 4 -type f | sort` | passed |
| `find supabase/migrations -maxdepth 1 -type f | sort` | passed |
| `find tests/astro -maxdepth 3 -type f | sort` | passed |
| `npx vitest run tests/astro/integration/astro_repository_inventory_contract.test.ts` | passed |
| `npm run typecheck` | passed |
| `npm run lint` | passed with warnings |
| `npm run build` | passed |

## Phase 1 rollback path

To roll back Phase 1, delete:
- `docs/astro-calculation-integration/inventory.md`
- `tests/astro/integration/astro_repository_inventory_contract.test.ts`

If `vitest.config.ts` was edited for test discovery, revert that edit.

No database rollback is required.
No feature flag rollback is required.
No production fallback is required because no production behavior changes are made.
