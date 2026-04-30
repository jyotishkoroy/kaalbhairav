# Phase 16 — Ollama Critic Client

## Goal
Add a local Ollama-backed critic client that runs after deterministic validation and only gives advisory quality feedback.

## Files Added Or Updated
- `lib/astro/rag/critic-schema.ts`
- `lib/astro/rag/local-critic.ts`
- `tests/astro/rag/critic-schema.test.ts`
- `tests/astro/rag/local-critic.test.ts`
- `docs/astro-rag/phase-16-local-ollama-critic.md`
- `graphify-out/astro-v2-phase-summary.md`

## Critic Role
The critic identifies generic, missing, unsafe, and wrong-answer issues and can suggest retry-worthy improvements to human-like companion tone.

## Advisory-Only Rule
The critic never writes final answers and never becomes authoritative over the deterministic validator.

## Deterministic Authority Rule
Deterministic safety, exact facts, timing restrictions, and validator fallback remain authoritative. Critic output cannot clear a deterministic failure.

## Proxy `/critic` Contract
The client calls `POST /critic` on the Phase 6 proxy with:
- `question`
- `answer`
- compact `contract`
- compact `facts` containing chart anchors, reasoning, timing, and validation context

## Call Gating
The client skips critic calls when disabled, misconfigured, missing a secret, missing fetch, or when deterministic validation already requires fallback and critic is not required.

## Secret And Timeout Behavior
The client uses `TARAYAI_LOCAL_SECRET` first, then `ASTRO_LOCAL_CRITIC_SECRET`, then `ASTRO_LOCAL_ANALYZER_SECRET`. Timeout comes from `ASTRO_LOCAL_CRITIC_TIMEOUT_MS` when valid, otherwise the feature flag default.

## Failure Behavior When Critic Required Is False
Critic failures are non-fatal and return advisory-only failure state without overriding deterministic results.

## Failure Behavior When Critic Required Is True
Critic failures recommend fallback safely, but still do not replace deterministic validation.

## Merge Behavior With Deterministic Validation
The deterministic validation result is the base. Critic retry advice can only add retry pressure when fallback is not already required. Unsafe or wrong facts from the critic force fallback recommendation.

## Human-Like Companion Tone Use
Lower companion tone scores and generic output can recommend a retry so the answer is more natural and less robotic.

## Mocked Test Strategy
All automated critic tests inject mocked fetch implementations. No live Ollama, proxy, Groq, or Supabase calls are made.

## Runtime Behavior Changed
No route integration yet. This phase only adds the library client and tests.

## UI Changed
No.

## DB Changed
No new migration.

## Groq Touched
No live call. Existing provider and writer tests were checked.

## Ollama Touched
Critic client added. Proxy/analyzer tests were checked with mocked fetch.

## Supabase Touched
No live call. Existing schema and retrieval tests were checked.

## Validation Commands
- `npx vitest run tests/astro/rag/critic-schema.test.ts`
- `npx vitest run tests/astro/rag/local-critic.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`

## Rollback
- Code rollback path: revert the Phase 16 commit.
- Database rollback or forward-fix path: no database changes in Phase 16.
- Feature flag disable path: set `ASTRO_LOCAL_CRITIC_ENABLED=false` or `ASTRO_RAG_ENABLED=false`.
- Production fallback path: the old Astro V2 route remains active because no route integration was added. If future critic fails and `ASTRO_LOCAL_CRITIC_REQUIRED=false`, continue with deterministic validation result. If required=true, fall back safely.
