# Phase 14 — Groq Answer Writer

## Goal
Build a Groq answer writer that takes the deterministic Phase 13 `AnswerContract` and produces a grounded, companion-style answer without changing the route or UI.

## Files Added or Updated
- `lib/astro/rag/groq-answer-prompt.ts`
- `lib/astro/rag/groq-answer-writer.ts`
- `tests/astro/rag/groq-answer-prompt.test.ts`
- `tests/astro/rag/groq-answer-writer.test.ts`
- `docs/astro-rag/phase-14-groq-answer-writer.md`
- `graphify-out/astro-v2-phase-summary.md`

## Groq Call Gating
- The writer only calls Groq when the contract allows it, the feature flag is enabled, `GROQ_API_KEY` is present, and the answer mode is not safety, exact fact, follow-up, or fallback.
- The writer uses injected fetch when provided and falls back to `globalThis.fetch` only if available.
- No route integration was added.

## Prompt Structure
- System prompt: strict JSON-only instruction with grounding, safety, and tone constraints.
- User prompt: compact JSON with question, contract, retrieved facts, reasoning path, timing, required sections, forbidden claims, and writer instructions.
- Prompt blocks are trimmed to keep the payload bounded.

## JSON Output Contract
- Expected keys: `answer`, `sections`, `usedAnchors`, `limitations`, `suggestedFollowUp`, `confidence`.
- Optional sections may be empty strings.
- The writer validates obvious contract violations before accepting output.

## Human-Like Companion Tone Rule
- The prompt asks for a human, clear, calm, companion-like answer.
- The factual contract remains stronger than style guidance.

## Grounding Rule
- The writer stays grounded in the supplied contract, anchors, reasoning path, timing context, and restrictions.
- It does not invent chart facts or timing windows.

## Forbidden Claims Guard
- The writer rejects obvious guarantee language, unsafe advice, death/lifespan prediction, and similar forbidden claims.

## Timing Guard
- If timing is disallowed, the writer must omit timing unless the text explicitly states that timing is unavailable or restricted.

## Remedy Guard
- If remedies are not allowed, the writer must not introduce remedy claims unless it clearly states remedies are restricted.

## Deterministic Fallback Behavior
- If Groq is disabled, missing, or fails, the writer returns a deterministic fallback.
- Fallbacks do not invent facts and keep limitations explicit.

## Mocked Test Strategy
- Tests use injected fetch mocks only.
- No live Groq, Ollama, proxy, or Supabase calls are made.

## Runtime Behavior Changed
- No route integration yet.
- UI changed: no.
- DB changed: no new migration.

## Groq Touched
- Writer code added.
- Tests mocked.
- No live Groq in tests.

## Ollama Touched
- No live call.
- Existing proxy/analyzer contracts remain checked.

## Supabase Touched
- No live call.
- Existing retrieval/schema tests remain checked.

## Validation Commands
- `npx vitest run tests/astro/rag/groq-answer-prompt.test.ts`
- `npx vitest run tests/astro/rag/groq-answer-writer.test.ts`
- `npx vitest run tests/astro/rag/contracts.test.ts`
- `npx vitest run tests/astro/rag/answer-contract-builder.test.ts`
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
- Rollback the Phase 14 commit.
- No database rollback is needed.
- Keep `ASTRO_LLM_ANSWER_ENGINE_ENABLED=false` and `ASTRO_RAG_ENABLED=false` to disable runtime use.
- Old Astro V2 route behavior remains unchanged because the writer is not integrated yet.
