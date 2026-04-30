# Phase 10 - Reasoning Graph Selector

## Goal
Turn retrieved chart facts plus reasoning rules into deterministic, domain-specific reasoning paths. This phase adds rule selection and path building only.

## Files Added or Updated
- `lib/astro/rag/reasoning-rule-selector.ts`
- `lib/astro/rag/reasoning-path-builder.ts`
- `tests/astro/rag/reasoning-rule-selector.test.ts`
- `tests/astro/rag/reasoning-path-builder.test.ts`
- `docs/astro-rag/phase-10-reasoning-graph.md`
- `graphify-out/astro-v2-phase-summary.md`

## Rule Selection Scoring
- Domain match
- Required fact matches
- Required tag matches
- Required plan facts
- Rule weight
- Safety blocking
- Exact-fact penalty for interpretive graphs

## Path Building Domains
- Career
- Sleep
- Marriage
- Money
- Foreign
- Education
- Safety
- General fallback

## Missing Anchor Behavior
- Missing facts become `missingAnchors`
- No facts are invented
- Exact-fact questions return a minimal or empty path

## Partial Retrieval Behavior
- Partial retrieval is preserved in warnings and metadata
- The path remains deterministic and incomplete when context is partial

## Optional `storeReasoningPath` Behavior
- Uses only a caller-provided Supabase-like client
- Does not create a database client
- Can be skipped at runtime

## Runtime Behavior Changed
- No route integration yet
- Old Astro V2 runtime remains unchanged

## UI Changed
- No

## DB Changed
- No new migration

## Groq/Ollama Touched
- No live calls
- Deterministic reasoning only

## Validation Commands
- `npx vitest run tests/astro/rag/reasoning-rule-selector.test.ts`
- `npx vitest run tests/astro/rag/reasoning-path-builder.test.ts`
- `npx vitest run tests/astro/rag/reasoning-rule-repository.test.ts`
- `npx vitest run tests/astro/rag/benchmark-repository.test.ts`
- `npx vitest run tests/astro/rag/timing-repository.test.ts`
- `npx vitest run tests/astro/rag/retrieval-service.test.ts`
- `npx vitest run tests/astro/rag/required-data-matrix.test.ts`
- `npx vitest run tests/astro/rag/required-data-planner.test.ts`
- `npx vitest run tests/astro/rag/analyzer-schema.test.ts`
- `npx vitest run tests/astro/rag/local-analyzer.test.ts`
- `npx vitest run tests/astro/rag/ollama-analyzer-proxy.test.ts`
- `npx vitest run tests/astro/rag/safety-gate.test.ts`
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
- Code rollback path: revert the Phase 10 commit.
- Database rollback or forward-fix path: no database changes in Phase 10. If optional `storeReasoningPath` wrote bad rows during manual testing, delete affected `astro_reasoning_paths` rows for that user/profile/question.
- Feature flag disable path: keep `ASTRO_RAG_ENABLED=false`; Phase 10 does not integrate runtime behavior.
- Production fallback path: old Astro V2 route remains active because no route integration was added.
