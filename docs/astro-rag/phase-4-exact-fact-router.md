# Phase 4 - Deterministic Exact Fact Router

## Goal
Answer exact and derived chart fact questions deterministically from structured chart facts.

## Files Added or Updated
- `lib/astro/rag/exact-fact-answer.ts`
- `lib/astro/rag/exact-fact-router.ts`
- `tests/astro/rag/exact-fact-answer.test.ts`
- `tests/astro/rag/exact-fact-router.test.ts`
- `docs/astro-rag/phase-4-exact-fact-router.md`
- `graphify-out/astro-v2-phase-summary.md`

## Supported Exact Fact Questions
- Lagna / ascendant
- Sun and other planet placements
- Moon sign / Rasi
- House sign
- House lord
- Current Mahadasha / Antardasha
- SAV comparison
- Planets in a house
- Co-presence
- Moon nakshatra and pada
- Sign to house
- Planet in house yes/no

## Data Source
- `ChartFact[]` only

## LLM Usage
- None

## Runtime Behavior Changed
- No route integration yet

## UI Changed
- No

## DB Changed
- No

## Validation Commands
- `npx vitest run tests/astro/rag/exact-fact-answer.test.ts`
- `npx vitest run tests/astro/rag/exact-fact-router.test.ts`
- `npx vitest run tests/astro/rag/chart-fact-extractor.test.ts`
- `npx vitest run tests/astro/rag/chart-fact-repository.test.ts`
- `npx vitest run tests/astro/rag/schema.test.ts`
- `npx vitest run tests/astro/rag/feature-flags.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`

## Rollback
Rollback:
- Code rollback path: revert the Phase 4 commit.
- Database rollback or forward-fix path: no database changes in Phase 4.
- Feature flag disable path: keep `ASTRO_RAG_ENABLED=false`; Phase 4 does not integrate runtime behavior.
- Production fallback path: old Astro V2 route remains active because no route integration was added.

## Validation
Validation:
- Required tests run:
- Exact fact router test:
- Exact fact answer test:
- Extractor test:
- Repository test:
- Schema test:
- Feature flag test:
- Typecheck:
- Lint:
- Build:
- Full tests:
- Security check: no secrets, no private report/docx/zip data, no external provider calls.
- Live smoke if deployed:
