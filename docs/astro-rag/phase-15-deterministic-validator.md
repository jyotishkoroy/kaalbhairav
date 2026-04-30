# Phase 15 — Deterministic Validator

## Goal
Add a deterministic, heuristic-based validator for Astro RAG answers without integrating it into the runtime route yet.

## Files Added/Updated
- `lib/astro/rag/validation-types.ts`
- `lib/astro/rag/answer-validator.ts`
- `lib/astro/rag/validators/validator-utils.ts`
- `lib/astro/rag/validators/fact-validator.ts`
- `lib/astro/rag/validators/safety-validator.ts`
- `lib/astro/rag/validators/timing-validator.ts`
- `lib/astro/rag/validators/remedy-validator.ts`
- `lib/astro/rag/validators/genericness-validator.ts`
- `tests/astro/rag/test-fixtures.ts`
- `tests/astro/rag/fact-validator.test.ts`
- `tests/astro/rag/safety-validator.test.ts`
- `tests/astro/rag/timing-validator.test.ts`
- `tests/astro/rag/remedy-validator.test.ts`
- `tests/astro/rag/genericness-validator.test.ts`
- `tests/astro/rag/answer-validator.test.ts`

## Validator Modules
- `fact-validator.ts`
- `safety-validator.ts`
- `timing-validator.ts`
- `remedy-validator.ts`
- `genericness-validator.ts`

## Fact Grounding Checks
- Normalized chart facts by key, type, planet, house, and tags.
- Checked required anchors against answer text, sections, used anchors, and supplied facts.
- Detected explicit wrong claims for Lagna, Moon sign, planet sign, house sign, house lord, and Rahu placement.

## Safety Checks
- Rejected guaranteed outcomes, death/lifespan claims, medical claims, legal guarantees, financial guarantees, gemstone certainty, self-harm content, and expensive puja pressure.
- Allowed safe negations and refusals such as `cannot guarantee`, `do not stop medication`, and `not financial advice`.

## Timing Checks
- Blocked invented timing when timing is disallowed or unavailable.
- Allowed grounded windows only when they match the supplied timing context.
- Rejected unsupported relative timing like `next month second half`.

## Remedy Checks
- Rejected coercive, expensive, medical, or guaranteed remedy language.
- Allowed optional, low-cost, non-coercive remedies when remedy use is permitted.

## Genericness Checks
- Rejected generic advice, repetition, and answers that do not address the domain.
- Kept exact-fact, safety, follow-up, fallback, and grounded remedy responses from failing only on short length.

## Main Validation Scoring
- Combined all subvalidator issues deterministically.
- Returned `ok`, `score`, issue lists, missing anchors/sections, `retryRecommended`, `fallbackRecommended`, and `correctionInstruction`.
- Clamped score to `0..100`.

## Retry/Fallback Recommendation Behavior
- `retryRecommended` is for repairable issues such as missing sections, missing anchors, generic answers, and follow-up gaps.
- `fallbackRecommended` is for unsafe claims, wrong facts, invented timing, and low scores.

## Store Validation Behavior
- `storeValidationResult` writes to `astro_validation_results` using only the caller-provided Supabase-like client.
- Errors are returned as data and do not throw.

## No LLM Validation Rule
- Validation is deterministic only.
- No live Groq, Ollama, proxy, or Supabase calls are used in automated validation tests.

## Runtime Behavior Changed
- No route integration yet.

## UI Changed
- No.

## DB Changed
- No new migration.

## Groq Touched
- No live call.
- Writer/provider tests were checked.

## Ollama Touched
- No live call.
- Proxy/analyzer tests were checked.

## Supabase Touched
- No live call.
- Schema/retrieval tests were checked.

## Validation Commands
- `npx vitest run tests/astro/rag/fact-validator.test.ts tests/astro/rag/safety-validator.test.ts tests/astro/rag/timing-validator.test.ts tests/astro/rag/remedy-validator.test.ts tests/astro/rag/genericness-validator.test.ts tests/astro/rag/answer-validator.test.ts --reporter=verbose`
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

## Rollback
- Code rollback path: revert the Phase 15 commit.
- Database rollback or forward-fix path: no database changes in Phase 15.
- If optional `storeValidationResult` writes bad rows during manual testing, delete affected `astro_validation_results` rows.
- Feature-flag disable path: keep `ASTRO_VALIDATE_LLM_OUTPUT=false` or `ASTRO_RAG_ENABLED=false` until route integration.
- Production fallback path: the old Astro V2 route remains active because no route integration was added.
