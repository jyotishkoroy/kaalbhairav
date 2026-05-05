<!--
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
-->

# TarayAI Calculation Integration — Final Integration Report

## Summary
Phases 1–20 completed the deterministic calculation integration, with canonical `chart_json_v2` support, strict current-chart loading, Supabase pointer invariants, exact fact routing before LLM fallback, unsupported-module refusal handling, sanitized Vedic evidence fixtures, and the regression matrix used for final validation.

## Files changed
- Calculation contracts and modules in `lib/astro/calculations/*`
- Canonical chart JSON adapter and persistence/current-chart integration in `lib/astro/chart-json-v2.ts`, `lib/astro/canonical-chart-json-adapter.ts`, `lib/astro/chart-json-persistence.ts`, and `lib/astro/current-chart-version.ts`
- Ask Guru, v2 reading, and report builder integration in `app/api/astro/ask/route.ts`, `app/api/astro/v2/reading/route.ts`, `app/api/astro/v1/calculate/route.ts`, and `lib/astro/report/*`
- Unavailable registry and provenance enforcement in `lib/astro/unavailable-field-registry.ts`, `lib/astro/report/unavailable.ts`, and related provenance helpers
- Sanitized fixtures and converter inputs under `tests/astro/fixtures/vedic-calculation-evidence/*`
- Regression tests under `tests/astro/*`

## Calculation modules implemented
- Birth input normalization and time pipeline
- Julian Day local/UT split
- Sidereal time and obliquity helpers
- Ephemeris and ayanamsha provider contracts
- D1 planetary positions and Lagna integration
- Panchanga basics
- Nakshatra/Pada and Vimshottari Dasha
- Sripati/Chalit house support where available
- Shodashvarga and Varga Bhav
- KP rashi/nakshatra/sub/sub-sub lord boundaries
- Manglik and Kalsarpa deterministic rules
- Ashtakavarga total-only policy when deterministic BAV rows exist

## Modules intentionally unavailable
- KP significator priority logic is unavailable.
- Varshaphal root solving is unavailable.
- Yogini and Chara Dasha are unavailable unless later implemented.
- Lal Kitab judgments are unavailable.
- Detailed Sade Sati date tables are unavailable.
- Shadbala is unavailable.
- Ashtakavarga bindu matrix is unavailable unless the BAV contribution matrix is deterministically implemented and fixture-tested.
- Unsupported advanced modules return structured unavailable/refusal instead of guessed text.

## Supabase persistence status
- `chart_json_versions` history is preserved
- `birth_profiles.current_chart_version_id` is the runtime truth pointer
- strict loader rejects missing/mismatched/stale charts
- `chart_json_v2` metadata must match persisted `chartVersionId`/`chartVersion`
- no schema migration is expected in Phase 20 unless final inspection proves otherwise

## API routes integrated
- `/api/astro/v1/calculate` deterministic integration behind feature flag
- `/api/astro/ask` uses strict current chart and exact fact route before LLM
- `/api/astro/v2/reading` ignores client chart context and uses strict current chart
- report builder resolves deterministic fields via registry/provenance
- production client body fields such as `chart`, `context`, `dasha`, `transits`, `publicFacts`, `profileId`, `userId`, and `chartVersionId` must not be trusted

## Test commands run
- `npm run typecheck` — pass
- `npm run lint` — pass with warnings only (`0` errors, `43` warnings)
- `npm run test:astro` — pass
- `npm test` — pass
- `npm run build` — pass with expected local Upstash Redis env warnings because `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` were unset

## Known uncertainties
- Exact AstroSage bit-for-bit ephemeris/ayanamsha may require matching constants/files.
- KP significator priority logic unavailable.
- Varshaphal root solving unavailable.
- Yogini/Chara unavailable unless later implemented.
- Detailed Sade Sati date tables unavailable.
- Ashtakavarga bindu matrix unavailable unless BAV contribution matrix implemented.
- Local build may emit non-fatal Upstash Redis env warnings when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are unset.
- No live production validation was performed in this phase unless explicitly run locally as a non-deployment smoke. Prefer not to run live checks in Phase 20.

## Deployment readiness
No production deployment performed in this phase.

Do not deploy until a later explicit deployment phase is requested.
