# Phase 13 - Answer Contract Builder

## Goal
Add deterministic answer contracts that define anchors, required sections, forbidden claims, timing/remedy permissions, validator expectations, and storage support before any Groq writer runs.

## Files Added Or Updated
- `lib/astro/rag/answer-contract-types.ts`
- `lib/astro/rag/answer-contract-builder.ts`
- `lib/astro/rag/contracts/common.ts`
- `lib/astro/rag/contracts/career.ts`
- `lib/astro/rag/contracts/sleep.ts`
- `lib/astro/rag/contracts/marriage.ts`
- `lib/astro/rag/contracts/money.ts`
- `lib/astro/rag/contracts/safety.ts`
- `lib/astro/rag/contracts/general.ts`
- `tests/astro/rag/contracts.test.ts`
- `tests/astro/rag/answer-contract-builder.test.ts`
- `docs/astro-rag/phase-13-answer-contracts.md`
- `graphify-out/astro-v2-phase-summary.md`

## Domain Contracts
- Common forbidden claims cover invented facts, invented timing, guarantees, medical/legal/financial unsafe claims, gemstone certainty, and expensive puja pressure.
- Career, sleep, marriage, money, safety, and general contract modules are deterministic and domain-specific.

## Safety-First Rule
- Safety answers win.
- Safety contracts disable Groq and Ollama critic.

## Exact Fact Contract Rule
- Exact fact contracts stay narrow.
- Groq and Ollama critic stay disabled.
- Contracts require direct answer, chart basis, accuracy, and follow-up sections.

## Career Contract Rule
- Career contracts require chart basis, reasoning, workplace steps, accuracy, and follow-up.
- They keep timing optional and grounded.

## Sleep/Remedy Contract Rule
- Sleep contracts require safe remedies only when remedy guidance is allowed.
- They forbid diagnosis and medication changes.

## Marriage/Money/General Rules
- Marriage and money contracts require grounded anchors and practical next steps.
- General contracts keep limitations explicit and avoid unsupported claims.

## Timing Permission Rule
- Timing sections appear only when timing is grounded and allowed.

## Remedy Permission Rule
- Remedy sections appear only when remedy is allowed and safe remedy support exists.

## Groq/Ollama Eligibility Rule
- Safety, exact fact, follow-up, and fallback contracts disable Groq.
- Interpretive, remedy, and timing contracts follow sufficiency gating.

## Store Contract Behavior
- `storeAnswerContract` uses a caller-provided Supabase-like client only.
- No client creation occurs.
- Errors are returned, not thrown.

## Runtime Behavior Changed
- No route integration yet.

## UI Changed
- No.

## DB Changed
- No new migration.

## Groq Touched
- No runtime call; existing integration contracts checked if present.

## Ollama Touched
- No live call; proxy/analyzer contract tests checked.

## Supabase Touched
- No live call; retrieval/schema tests checked.

## Validation Commands
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
- Code rollback path: revert the Phase 13 commit.
- Database rollback or forward-fix path: no database changes in Phase 13.
- Feature flag disable path: keep `ASTRO_RAG_ENABLED=false` and `ASTRO_LLM_ANSWER_ENGINE_ENABLED=false`; Phase 13 does not integrate runtime behavior.
- Production fallback path: old Astro V2 route remains active because no route integration was added.
