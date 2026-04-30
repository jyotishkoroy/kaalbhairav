# Phase 19 — API Route Integration

## Goal

Integrate the Phase 18 RAG reading orchestrator into `/api/astro/v2/reading` behind feature flags while preserving the old V2 route as the default-safe fallback.

## Files Added or Updated

- `app/api/astro/v2/reading/route.ts`
- `tests/astro/rag/rag-api-route.test.ts`
- `docs/astro-rag/phase-19-api-route-integration.md`
- `graphify-out/astro-v2-phase-summary.md`

## Feature Flag Behavior

- `ASTRO_RAG_ENABLED=true` enables the RAG branch.
- Any other value, including missing or malformed values, keeps the old V2 path.
- The route still preserves the existing old V2 fallback path when RAG fails.

## Old V2 Fallback Behavior

- The old V2 route remains the default path when the RAG flag is off.
- The old V2 route is also used when the RAG branch throws, returns an empty answer, returns a malformed response, or produces a generic fallback failure.

## RAG Branch Behavior

- The RAG branch receives the question and available route context.
- The branch is only used after the route-level request checks pass.
- The route does not expose internal artifacts to the browser by default.

## Safety, Exact-Fact, and Follow-Up Behavior

- Exact-fact and safety results are returned through the same route shape.
- Follow-up answers are preserved with the same top-level keys the old UI expects.

## Response Shape

- `answer`
- `followUpQuestion`
- `followUpAnswer`
- `meta`

## Safe Metadata

- Only compact, allowlisted RAG metadata is returned.
- No raw artifacts, env values, secrets, Supabase rows, Groq payloads, Ollama payloads, or local proxy URLs are exposed.

## Security and No-Artifacts Rule

- The route never returns raw internal artifacts by default.
- Sensitive values remain server-side only.

## Fallback-to-Old-Route Cases

- `ASTRO_RAG_ENABLED` is not exactly `true`
- RAG orchestrator throws
- RAG orchestrator times out or rejects
- RAG orchestrator returns an empty or null answer
- RAG orchestrator returns an unsafe or malformed shape
- The route prerequisites are not met

## Test Strategy

- Route handler tests use mocked dependencies only.
- No live Groq calls in tests.
- No live Ollama or proxy calls in tests.
- No live Supabase calls in tests.

## Runtime Behavior Changed

- Route branch added behind flags.

## UI Changed

- No.

## DB Changed

- No migration.

## Groq Touched

- No live calls in tests; orchestrator mocked.

## Ollama Touched

- No live calls in tests; orchestrator mocked.

## Supabase Touched

- No live calls in tests; auth/profile mocked.

## Validation Commands

- `npx vitest run tests/astro/rag/rag-api-route.test.ts`
- `npx vitest run tests/astro/rag/rag-reading-orchestrator.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`

## Rollback

- Code rollback path: revert the Phase 19 commit.
- Database rollback path: no database changes.
- Feature flag disable path: set `ASTRO_RAG_ENABLED=false`.
- Production fallback path: the old V2 path remains available when the RAG branch fails.
