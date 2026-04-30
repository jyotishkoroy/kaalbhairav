# Astro Reading V2 Phase Summary

## Phase 0 blocker fix

- Branch: `phase-rag-foundation`
- Runtime behavior changed: yes, but only old Astro V2 behavior was stabilized for foreign/legal topic routing and exact Sun-placement handling
- UI changed: no
- DB changed: no
- Groq/Ollama touched: no

## Validation

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm test`: passed

## Fixes

- TypeScript: aligned benchmark contract return shapes, added supported `foreign` and `legal` topics to the old reading model, and removed the impossible foreign branch in `human-generator.ts`
- Tests: updated stale relevance and seed-diversity expectations, and restored Sun-placement precedence over the generic nakshatra branch
- Visual verification: `/astro/v2` loaded locally on `127.0.0.1:3000` and showed the existing Astro V2 preview UI

## Deployment

- skipped

## Files intentionally not committed

- private/generated artifacts only, including `.env.local`, docx/zip uploads, raw benchmark markdown files, generated JSONL files, live check reports, `tmp/`, and `graphify-out.zip`
Phase: 1 feature flag and module skeleton
Branch: phase-rag-foundation
Runtime behavior changed: no
UI changed: no
DB changed: no
Groq/Ollama touched: no external calls; only disabled skeleton files added
Validation:
- feature flag test: pending
- typecheck: pending
- lint: pending
- build: pending
- full tests: pending
Files changed:
- lib/astro/rag/*
- tests/astro/rag/feature-flags.test.ts
- docs/astro-rag/phase-1-feature-flags.md
Deployment:
- skipped
Remaining blockers:
- none

Phase: 2 Supabase RAG schema foundation
Branch: phase-rag-foundation
Runtime behavior changed: no
UI changed: no
DB changed: migration added but not runtime-applied by app code
Groq/Ollama touched: no
Tables added:
- astro_chart_facts
- astro_reasoning_rules
- astro_benchmark_examples
- astro_reasoning_paths
- astro_answer_contracts
- astro_validation_results
- astro_timing_windows
Validation:
- schema test: pending
- typecheck: pending
- lint: pending
- build: pending
- full tests: pending
Deployment:
- skipped
Remaining blockers:
- none

Phase: 3 Chart fact extractor and repository
Branch: phase-rag-foundation
Runtime behavior changed: no
UI changed: no
DB changed: no new migration; writes supported only by manual repository/backfill
Groq/Ollama touched: no
Extractor:
- deterministic
- no external calls
- supports birth/lagna/rasi/nakshatra/planet placements/houses/lords/dasha/varshaphal/SAV/explicit aspects
Repository:
- maps facts to astro_chart_facts
- upsert helper with caller-provided Supabase client
Backfill:
- manual dry-run-first script
Validation:
- extractor test: pending
- repository test: pending
- schema test: pending
- feature flag test: pending
- typecheck: pending
- lint: pending
- build: pending
- full tests: pending
Deployment:
- skipped
Remaining blockers:
- none
Phase: 4 Deterministic exact fact router
Branch: phase-rag-foundation
Runtime behavior changed: no
UI changed: no
DB changed: no
Groq/Ollama touched: no
Router:
- deterministic only
- uses ChartFact[] only
- supports lagna, planet placement, moon sign, house sign, house lord, dasha, SAV comparison, planets in house, co-presence, nakshatra, sign-to-house, planet-in-house yes/no
Validation:
- exact fact router test:
- exact fact answer test:
- extractor test:
- repository test:
- schema test:
- feature flag test:
- typecheck:
- lint:
- build:
- full tests:
Deployment:
- skipped or completed
Remaining blockers:
- none or exact blockers
Phase: 5 Safety gate integration
Branch: phase-rag-foundation
Runtime behavior changed: no
UI changed: no
DB changed: no
Groq/Ollama touched: no
Safety gate:
- deterministic only
- no external calls
- blocks death/lifespan, medical diagnosis/treatment, self-harm, legal guarantees, financial guarantees, unsafe pregnancy claims
- restricts timing certainty, gemstone certainty, expensive puja pressure
- allows exact facts and normal career questions
- allows safe low-cost non-medical remedies with restrictions
Validation:
- rag safety gate test:
- existing safety tests:
- exact fact router test:
- extractor test:
- repository test:
- schema test:
- feature flag test:
- typecheck:
- lint:
- build:
- full tests:
Deployment:
- skipped or completed
Remaining blockers:
- none or exact blockers
