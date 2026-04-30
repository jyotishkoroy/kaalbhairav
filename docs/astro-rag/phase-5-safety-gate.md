# Phase 5 — Safety Gate Integration

## Goal
Add a deterministic RAG safety gate in front of the new pipeline, while keeping the old runtime route behavior unchanged.

## Files Added/Updated
- `lib/astro/rag/safety-gate.ts`
- `tests/astro/rag/safety-gate.test.ts`
- `docs/astro-rag/phase-5-safety-gate.md`
- `graphify-out/astro-v2-phase-summary.md`

## Risk Categories
- `death`
- `lifespan`
- `medical`
- `legal`
- `self_harm`
- `pregnancy`
- `financial_guarantee`
- `gemstone_guarantee`
- `expensive_puja_pressure`
- `unsafe_remedy`
- `timing_certainty`
- `general`

## Blocked Domains
- Death-date and lifespan prediction
- Medical diagnosis and medication changes
- Self-harm and suicide content
- Legal certainty and guaranteed legal outcomes
- Financial guarantees, lottery, and investment certainty
- Unsafe pregnancy certainty and baby-health prediction

## Allowed-With-Restrictions Domains
- Normal exact chart facts
- Career and interpretation questions
- Safe low-cost remedies
- Harmless timing questions with no certainty claim

## Exact Fact Interaction
- Exact chart facts remain allowed when they are deterministic and grounded in structured facts.
- The gate preserves exact fact support without adding route integration.

## Timing Interaction
- Timing certainty is restricted.
- Exact timing is not allowed unless a grounded timing source exists in a later phase.

## Remedy Interaction
- Safe remedies may be allowed when they are low-cost, optional, and non-coercive.
- Gemstone certainty, expensive puja pressure, and medical remedy claims are blocked or restricted.

## Runtime Behavior Changed
- No route integration yet.
- Old Astro V2 runtime remains active.

## UI Changed
- No.

## DB Changed
- No.

## Groq/Ollama Touched
- No.

## Validation Commands
- `npx vitest run tests/astro/rag/safety-gate.test.ts`
- `npx vitest run tests/astro/rag/exact-fact-answer.test.ts`
- `npx vitest run tests/astro/rag/exact-fact-router.test.ts`
- `npx vitest run tests/astro/rag/chart-fact-extractor.test.ts`
- `npx vitest run tests/astro/rag/chart-fact-repository.test.ts`
- `npx vitest run tests/astro/rag/schema.test.ts`
- `npx vitest run tests/astro/rag/feature-flags.test.ts`
- Existing safety regression tests if present
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`

## Rollback
Rollback:
- Code rollback path: revert the Phase 5 commit.
- Database rollback or forward-fix path: no database changes in Phase 5.
- Feature flag disable path: keep `ASTRO_RAG_ENABLED=false`; Phase 5 does not integrate runtime behavior.
- Production fallback path: old Astro V2 route remains active because no route integration was added.
