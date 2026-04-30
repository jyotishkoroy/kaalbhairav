# Phase 9 — Supabase Retrieval Service

## Goal
Build deterministic retrieval repositories and a compact retrieval service for Astro RAG using the Phase 2 Supabase schema and the Phase 8 required-data plan.

## Files Added Or Updated
- `lib/astro/rag/retrieval-types.ts`
- `lib/astro/rag/retrieval-service.ts`
- `lib/astro/rag/reasoning-rule-repository.ts`
- `lib/astro/rag/benchmark-repository.ts`
- `lib/astro/rag/timing-repository.ts`
- `tests/astro/rag/retrieval-service.test.ts`
- `tests/astro/rag/reasoning-rule-repository.test.ts`
- `tests/astro/rag/benchmark-repository.test.ts`
- `tests/astro/rag/timing-repository.test.ts`
- `graphify-out/astro-v2-phase-summary.md`

## Repositories
- Chart facts: deterministic fetch by `user_id`, optional `profile_id`, fact keys, and tags.
- Reasoning rules: `astro_reasoning_rules`, enabled rows only, domain/tag filtering, sorted by weight.
- Benchmark examples: `astro_benchmark_examples`, enabled rows only, compact trimming applied.
- Timing windows: `astro_timing_windows`, user/profile/domain/tag filters, deterministic ordering.
- Safe remedies: deterministic fallback from the plan only, low-cost and optional.

## Retrieval Input
- Uses `RequiredDataPlan` plus a caller-provided Supabase-like client.
- No repository creates its own Supabase client.

## Compactness Rules
- Benchmark answers are trimmed to 1200 chars.
- Benchmark reasoning is trimmed to 800 chars.
- Benchmark questions are trimmed to 300 chars.
- Chart facts stay structured and compact.

## Partial Failure Behavior
- Repository failures are recorded in `metadata.errors`.
- Partial success returns `metadata.partial = true`.
- Fetch failures do not invent missing chart facts or timing windows.

## Supabase Outage Fallback Behavior
- Retrieval returns empty collections and recorded errors when input is missing.
- Partial repository failures still return the successful data.

## Runtime Behavior Changed
- No route integration yet.
- No UI change.

## DB Changed
- No new migration.

## Groq/Ollama Touched
- No live calls.

## Validation Commands
- Retrieval service test
- Reasoning rule repository test
- Benchmark repository test
- Timing repository test
- Required data tests
- Analyzer schema/local analyzer tests
- Proxy test
- RAG safety test
- Exact fact tests
- Extractor/repository tests
- Schema test
- Feature flag test
- Typecheck
- Lint
- Build
- Full tests

## Rollback
- Code rollback path: revert the Phase 9 commit.
- Database rollback or forward-fix path: no database changes in Phase 9.
- Feature flag disable path: keep `ASTRO_RAG_ENABLED=false`; Phase 9 does not integrate runtime behavior.
- Production fallback path: old Astro V2 route remains active because no route integration was added. If future retrieval fails, the orchestrator must use deterministic fallback and never invent chart facts.
