# Phase 18 — RAG Reading Orchestrator

## Goal
Build the server-side RAG reading orchestrator that wires Phase 1 to Phase 17 modules into the strict target flow. This phase is library-only and does not integrate the orchestrator into `/api/astro/v2/reading`.

## Files Added Or Updated
- `lib/astro/rag/rag-reading-orchestrator.ts`
- `tests/astro/rag/rag-reading-orchestrator.test.ts`
- `docs/astro-rag/phase-18-rag-reading-orchestrator.md`
- `graphify-out/astro-v2-phase-summary.md`

## Strict Pipeline Order
1. Feature flag gate
2. Safety gate
3. Exact fact router
4. Ollama/local analyzer with deterministic fallback
5. Required-data planner
6. Supabase retrieval
7. Reasoning graph selector/path builder
8. Timing engine
9. Sufficiency checker
10. Answer contract builder
11. Groq writer
12. Deterministic validator
13. Ollama critic
14. Retry/fallback controller
15. Final answer

## Feature Flag Behavior
- `ragReadingOrchestrator()` reads flags from the provided `flags` object or `getAstroRagFlags(env)`.
- `shouldUseRagOrchestrator(flags)` returns the RAG gate decision.
- When RAG is disabled, the orchestrator returns a safe fallback and skips all downstream modules.

## Safety-First Short Circuit
- Safety blocks stop the pipeline before analyzer, retrieval, Groq, and critic.
- Safety fallback is deterministic and does not rely on live services.

## Exact Fact Short Circuit
- Exact chart facts stop the pipeline before analyzer, retrieval, Groq, critic, and retry.
- The result is deterministic and uses the structured exact-fact router only.

## Analyzer Fallback Behavior
- The orchestrator prefers the local analyzer when enabled.
- If the analyzer fails or returns invalid output, the deterministic analyzer fallback is used.

## Retrieval, Reasoning, Timing Behavior
- Retrieval is dependency-injected and mocked in tests.
- Reasoning and timing are built after retrieval.
- Timing claims are only surfaced when the timing context says they are available.

## Sufficiency Follow-Up and Fallback Behavior
- Sufficiency decides whether to answer now, ask a follow-up, or fall back.
- Follow-up and deterministic fallback paths do not call Groq.

## Groq Writer, Validator, and Critic Behavior
- Groq output is validated before any final answer is returned.
- The critic is advisory only.
- Deterministic validator failures cannot be cleared by the critic.

## Retry/Fallback Behavior
- The retry controller can retry once.
- The final answer is always validated before it is returned.
- Unvalidated Groq text is never returned.

## Metadata and Artifacts
- The orchestrator returns ordered pipeline steps and artifact snapshots.
- Artifacts are limited to structured pipeline results and do not include secrets or env dumps.

## Dependency Injection and Testing Strategy
- Every external step is injectable through `dependencies`.
- Tests use pure mocks and recorder logs.
- No live Groq, Ollama, proxy, or Supabase calls are made in the orchestrator test suite.

## Runtime Behavior Changed
- No route integration yet.

## UI Changed
- No.

## DB Changed
- No migration.

## Groq Touched
- No live Groq calls in tests.
- Groq writer is mocked in the orchestrator test suite.

## Ollama Touched
- No live Ollama or proxy calls in tests.
- Analyzer and critic are mocked in the orchestrator test suite.

## Supabase Touched
- No live Supabase calls in tests.
- Retrieval is mocked in the orchestrator test suite.

## Validation Commands
- `npx vitest run tests/astro/rag/rag-reading-orchestrator.test.ts`

## Rollback
- Code rollback path: revert the Phase 18 commit.
- Database rollback path: no database changes.
- Feature flag disable path: keep `ASTRO_RAG_ENABLED=false` until Phase 19 route integration.
- Production fallback path: the old Astro V2 route remains active because no route integration was added.
