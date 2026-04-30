# Phase 12 - Sufficiency Checker

## Goal
Add a deterministic sufficiency checker that decides whether the RAG pipeline can answer now, must ask a follow-up, or must fall back.

## Files Added Or Updated
- `lib/astro/rag/sufficiency-checker.ts`
- `tests/astro/rag/sufficiency-checker.test.ts`
- `docs/astro-rag/phase-12-sufficiency-checker.md`
- `graphify-out/astro-v2-phase-summary.md`

## Decision Statuses
- `answer_now`
- `ask_followup`
- `fallback`

## Safety-First Rule
- Safety always wins.
- Safety answers do not use Groq or Ollama critic.
- Safety answers can return directly without retrieval-driven sufficiency checks.

## Exact Fact Rule
- Exact fact questions stay narrow.
- If the structured fact is present, answer now.
- If it is missing, fall back unavailable.

## Follow-Up Rule
- Vague analyzer requests ask a follow-up instead of running Groq.
- Default follow-up questions stay domain-specific and stable.

## Required Fact Rule
- Core required facts must be present for interpretive answers.
- Missing required facts trigger fallback.
- Aliases for planet placements, lords, houses, and dasha are normalized.

## Timing Availability Rule
- Missing timing source prevents timing claims.
- Interpretive answers may still proceed without timing if non-timing facts are sufficient.
- Timing-only questions fall back when grounded timing is unavailable.

## Remedy Sufficiency Rule
- Remedy guidance is restricted when safety or planner rules block it.
- Sleep remedy answers require safe remedy rules.
- No gemstone or expensive puja guarantees are allowed.

## Partial Retrieval And Reasoning Behavior
- Partial retrieval can still answer when required facts are present, but must state limitations.
- Missing reasoning anchors force fallback.
- Incomplete reasoning can still allow a conservative answer when core facts are present.

## Groq/Ollama Gating
- Groq is not called by the sufficiency checker.
- Ollama critic is only eligible when Groq would be eligible.

## Runtime Behavior Changed
- No route integration yet.

## UI Changed
- No.

## DB Changed
- No new migration.

## Groq Touched
- No runtime call.
- Existing integration contracts should still be checked if present.

## Ollama Touched
- No live call.
- Existing proxy/analyzer contracts should still be checked.

## Supabase Touched
- No live call.
- Existing retrieval/schema contracts should still be checked.

## Validation Commands
- `npx vitest run tests/astro/rag/sufficiency-checker.test.ts`
- `npx vitest run tests/astro/rag/python-timing-adapter.test.ts`
- `npx vitest run tests/astro/rag/timing-engine.test.ts`
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
- Code rollback path: revert the Phase 12 commit.
- Database rollback or forward-fix path: no database changes in Phase 12.
- Feature flag disable path: keep `ASTRO_RAG_ENABLED=false`; Phase 12 does not integrate runtime behavior.
- Production fallback path: old Astro V2 route remains active because no route integration was added. If a future sufficiency check fails, orchestrator must fall back safely or ask a follow-up.
