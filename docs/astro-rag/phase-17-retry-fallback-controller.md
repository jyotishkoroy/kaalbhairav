# Phase 17 - Retry and Fallback Controller

## Goal
Add a deterministic retry controller for the Groq writer and a safe fallback path when the answer is unsafe, unavailable, invalid, or insufficient.

## Files Added Or Updated
- `lib/astro/rag/fallback-answer.ts`
- `lib/astro/rag/retry-controller.ts`
- `lib/astro/rag/groq-answer-prompt.ts`
- `lib/astro/rag/groq-answer-writer.ts`
- `tests/astro/rag/fallback-answer.test.ts`
- `tests/astro/rag/retry-controller.test.ts`
- `tests/astro/rag/groq-answer-prompt.test.ts`
- `tests/astro/rag/groq-answer-writer.test.ts`
- `package.json`
- `graphify-out/astro-v2-phase-summary.md`

## Local Dev Smoke EPERM Fix
- Added `npm run dev:local` to bind Next.js to `127.0.0.1`.
- Added `npm run verify:astro-local` to bind to `127.0.0.1:3001`.
- The sandbox still returns `EPERM` on socket bind, so the fix is a documented localhost smoke path without changing production behavior.

## Retry Rule
- Retry Groq once only when validation or the local critic reports repairable issues.
- The retry uses a correction instruction built from validation and critic guidance.

## Max Retry Rule
- The controller retries at most once.
- A second retry is never attempted.

## Fatal Validation Failure Rule
- Unsafe claims, wrong facts, invented timing, and other fatal deterministic failures go straight to fallback.

## Critic Advisory Rule
- The critic can suggest retry or fallback.
- The critic cannot override deterministic fallback decisions.

## Fallback Answer Types
- Safety refusal
- Follow-up question
- Insufficient data
- Groq unavailable
- Validation failed
- Timing unavailable
- Generic safe fallback

## Correction Instruction Behavior
- The retry instruction includes validation fixes first.
- Critic guidance is added on top when present.
- Secret-like values are sanitized before entering the prompt.

## No Unvalidated Groq Output Rule
- The controller never returns retry output unless it passes deterministic validation.
- If the retry fails validation, fallback is returned instead.

## Runtime Behavior Changed
- No route integration yet.
- No UI change.
- No database migration.

## Groq
- No live Groq calls in tests.
- Groq writer tests use mocked fetch only.

## Ollama
- No live Ollama calls in tests.
- Critic and proxy tests use mocked fetch only.

## Supabase
- No live Supabase calls in tests.
- Existing schema and retrieval tests remain the guardrail.

## Validation Commands
- `npx vitest run tests/astro/rag/fallback-answer.test.ts`
- `npx vitest run tests/astro/rag/retry-controller.test.ts`
- `npx vitest run tests/astro/rag/groq-answer-prompt.test.ts`
- `npx vitest run tests/astro/rag/groq-answer-writer.test.ts`
- `npx vitest run tests/astro/rag/critic-schema.test.ts`
- `npx vitest run tests/astro/rag/local-critic.test.ts`

## Rollback
- Code rollback path: revert the Phase 17 commit.
- Database rollback path: none.
- Feature flag disable path: keep `ASTRO_RAG_ENABLED=false` and `ASTRO_LLM_RETRY_ON_VALIDATION_FAIL=false` until integration.
- Production fallback path: the existing Astro V2 route remains active because no route integration was added.
