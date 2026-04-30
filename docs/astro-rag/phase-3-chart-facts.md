# Phase 3 - Chart Fact Extractor and Repository

## Goal
Deterministically extract structured chart facts from existing chart JSON and provide a caller-driven Supabase upsert helper for the new Phase 2 RAG schema.

## Files Added Or Updated
- `lib/astro/rag/chart-fact-extractor.ts`
- `lib/astro/rag/chart-fact-repository.ts`
- `scripts/backfill-astro-chart-facts.ts`
- `tests/astro/rag/chart-fact-extractor.test.ts`
- `tests/astro/rag/chart-fact-repository.test.ts`
- `tests/astro/rag/backfill-astro-chart-facts.test.ts`
- `docs/astro-rag/phase-3-chart-facts.md`
- `graphify-out/astro-v2-phase-summary.md`

## Extracted Fact Types
- Birth facts
- Lagna / Ascendant
- Rasi / Moon sign
- Nakshatra and pada
- Planet placements
- Whole-sign houses
- House lords
- Dasha periods
- Varshaphal periods
- SAV / Sarvashtakavarga
- Explicit co-presence and aspect facts

## Repository Behavior
- Uses caller-provided Supabase client only
- Writes to `astro_chart_facts`
- Requires `userId`
- Deduplicates by `fact_type + fact_key`
- Maps camelCase fields to snake_case row columns
- Handles Supabase errors without throwing

## Backfill Script Usage
Dry run:

```bash
npx tsx scripts/backfill-astro-chart-facts.ts --input tmp/chart.json --user-id <uuid>
```

Write mode:

```bash
npx tsx scripts/backfill-astro-chart-facts.ts --input tmp/chart.json --user-id <uuid> --profile-id <uuid> --chart-version-id <id> --write
```

## Runtime Behavior Changed
No.

## UI Changed
No.

## Groq / Ollama Touched
No.

## Validation Commands
- Extractor test
- Repository test
- Schema test
- Feature flag test
- Typecheck
- Lint
- Build
- Full tests

## Rollback
- Code rollback path: revert the Phase 3 commit.
- Database rollback or forward-fix path: no new schema; the Phase 2 schema remains.
- If bad facts were written during manual backfill, delete or correct rows in `astro_chart_facts` for the affected `user_id`, `profile_id`, and `chart_version_id`.
- Feature flag disable path: keep `ASTRO_RAG_ENABLED=false`.
- Production fallback path: old Astro V2 route remains active because no route integration was added.
